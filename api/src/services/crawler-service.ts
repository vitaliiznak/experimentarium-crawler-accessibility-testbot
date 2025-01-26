import { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';
import { URL } from 'url';
import type { CrawlResult, TestConfig } from '../types';
import { EventEmitter } from 'events';
import Bottleneck from 'bottleneck';

interface CrawlProgress {
  currentUrl: string;
  processedUrls: number;
  totalUrlsFound: number;
  status: 'running' | 'completed' | 'error';
}

interface CrawlError extends Error {
  url: string;
  code?: string;
}

export class CrawlerService extends EventEmitter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private visitedUrls: Set<string> = new Set();
  private urlQueue: string[] = [];
  private config: TestConfig;
  private baseUrl: string = '';
  private isRunning: boolean = false;
  private rateLimiter: Bottleneck;

  constructor(config: TestConfig) {
    super();
    this.config = config;
    // Limit concurrent requests to 3
    this.rateLimiter = new Bottleneck({
      maxConcurrent: 5,
      minTime: 1000 // minimum time between tasks in ms
    });
  }

  private async initialize(): Promise<void> {
    this.browser = await chromium.launch();
    this.context = await this.browser.newContext({
      userAgent: 'WCAGTestBot/1.0 (+https://yourwebsite.com/bot)'
    });
  }

  private async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    // Clear memory
    this.visitedUrls.clear();
    this.urlQueue = [];
    global.gc?.(); // Optional garbage collection if available
  }

  private async reinitializeBrowserIfNeeded(): Promise<void> {
    const MAX_PAGES = 50; // Reinitialize after every 50 pages
    if (this.visitedUrls.size % MAX_PAGES === 0) {
      await this.cleanup();
      await this.initialize();
    }
  }

  private isUrlAllowed(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname;

      // Check if URL is from the same domain
      if (parsedUrl.origin !== this.baseUrl) {
        return false;
      }

      // Check include patterns
      if (this.config.includePatterns.length > 0) {
        const matchesInclude = this.config.includePatterns.some((pattern: string) => 
          new RegExp(pattern).test(path)
        );
        if (!matchesInclude) return false;
      }

      // Check exclude patterns
      if (this.config.excludePatterns.length > 0) {
        const matchesExclude = this.config.excludePatterns.some((pattern: string) => 
          new RegExp(pattern).test(path)
        );
        if (matchesExclude) return false;
      }

      return true;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return false;
    }
  }

  private async extractLinks(page: Page): Promise<string[]> {
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.getAttribute('href'))
        .filter(href => href != null) as string[];
    });

    return links
      .map(href => {
        try {
          return new URL(href, page.url()).toString();
        } catch {
          return null;
        }
      })
      .filter((url): url is string => 
        url !== null && 
        this.isUrlAllowed(url) && 
        !this.visitedUrls.has(url)
      );
  }

  private emitProgress(currentUrl: string): void {
    this.emit('progress', {
      currentUrl,
      processedUrls: this.visitedUrls.size,
      totalUrlsFound: this.visitedUrls.size + this.urlQueue.length,
      status: 'running'
    } as CrawlProgress);
  }

  private async crawlPage(url: string): Promise<CrawlResult> {
    await this.reinitializeBrowserIfNeeded();
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = await this.context.newPage();
    let status = 0;
    let linkedUrls: string[] = [];

    try {
      this.emitProgress(url);
      
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      status = response?.status() ?? 0;
      
      if (status === 200) {
        linkedUrls = await this.extractLinks(page);
        
        // Add new URLs to queue if within depth limit
        const urlDepth = url.split('/').length - this.baseUrl.split('/').length;
        if (urlDepth < this.config.maxDepth) {
          this.urlQueue.push(...linkedUrls);
        }
      }
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
      status = 0;
    } finally {
      await page.close();
    }

    return { url, status, linkedUrls };
  }

  private async crawlWithRateLimit(url: string): Promise<CrawlResult> {
    return this.rateLimiter.schedule(() => this.crawlPage(url));
  }

  private async crawlPageWithRetry(url: string, retries = 2): Promise<CrawlResult> {
    let lastError: CrawlError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.crawlPage(url);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : 'Error';
        const errorCode = error instanceof Error && 'code' in error ? 
          (error as { code?: string }).code : undefined;

        lastError = Object.assign(new Error(errorMessage), {
          name: errorName,
          url,
          code: errorCode
        }) as CrawlError;

        // Don't retry certain errors
        if (lastError?.code === 'ERR_INVALID_URL' || lastError?.code === 'ERR_BAD_SSL') {
          break;
        }

        // Wait before retry
        if (attempt < retries) {
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    return {
      url,
      status: 0,
      linkedUrls: [],
      errorMessage: lastError?.message
    };
  }

  private emitError(error: CrawlError): void {
    this.emit('error', {
      url: error.url,
      message: error.message,
      code: error.code
    });
  }

  public async crawl(startUrl: string): Promise<CrawlResult[]> {
    if (this.isRunning) {
      throw new Error('Crawler is already running');
    }

    this.isRunning = true;
    const results: CrawlResult[] = [];
    
    try {
      await this.initialize();
      
      // Initialize crawl state
      this.baseUrl = new URL(startUrl).origin;
      this.visitedUrls.clear();
      this.urlQueue = [startUrl];

      while (
        this.urlQueue.length > 0 && 
        this.visitedUrls.size < this.config.maxPages
      ) {
        const batchSize = Math.min(3, this.urlQueue.length);
        const batch = this.urlQueue.splice(0, batchSize);
        
        const batchResults = await Promise.all(
          batch
            .filter(url => !this.visitedUrls.has(url))
            .map(url => this.crawlWithRateLimit(url))
        );

        for (const result of batchResults) {
          this.visitedUrls.add(result.url);
          results.push(result);
        }
      }

      this.emit('progress', {
        currentUrl: '',
        processedUrls: this.visitedUrls.size,
        totalUrlsFound: this.visitedUrls.size,
        status: 'completed'
      } as CrawlProgress);

      return results;
    } catch (error) {
      this.emit('progress', {
        currentUrl: '',
        processedUrls: this.visitedUrls.size,
        totalUrlsFound: this.visitedUrls.size + this.urlQueue.length,
        status: 'error'
      } as CrawlProgress);
      
      throw error;
    } finally {
      this.isRunning = false;
      await this.cleanup();
    }
  }

  private checkMemoryUsage(): void {
    const used = process.memoryUsage();
    const memoryWarningThreshold = 0.8; // 80% of available memory

    if (used.heapUsed / used.heapTotal > memoryWarningThreshold) {
      console.warn('High memory usage detected, cleaning up...');
      this.cleanup();
    }

    this.emit('memoryStatus', {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024)
    });
  }
} 