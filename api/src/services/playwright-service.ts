import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import type { TestConfig, TestResult, WCAGViolation } from '../types';
import type { AxeResults } from 'axe-core';


export class PlaywrightService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch();
    this.context = await this.browser.newContext();
  }

  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async testPage(url: string): Promise<AxeResults> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page: Page = await this.context.newPage();
    
    try {
      console.log(`Starting scan for URL: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle' });
      
      const results = await new AxeBuilder({ page })
        .withTags(
          ['wcag2a']
            .concat(this.config.wcagLevel === 'AA' || this.config.wcagLevel === 'AAA' ? ['wcag2aa'] : [])
            .concat(this.config.wcagLevel === 'AAA' ? ['wcag2aaa'] : [])
        )
        .analyze();

      console.log('Scan completed. Results summary:');
      console.log(`- Violations found: ${results.violations.length}`);
      console.log(`- Passes: ${results.passes.length}`);
      console.log(`- Incomplete: ${results.incomplete.length}`);
      console.log(`- Inapplicable: ${results.inapplicable.length}`);
      
      if (results.violations.length > 0) {
        console.log('\nViolations details:');
        results.violations.forEach((violation, index) => {
          console.log(`\n${index + 1}. ${violation.id} (Impact: ${violation.impact})`);
          console.log(`   Description: ${violation.description}`);
          console.log(`   Help: ${violation.help}`);
          console.log(`   Affected elements: ${violation.nodes.length}`);
        });
      }

      return results;
    } finally {
      await page.close();
    }
  }
  async runTests(urls: string[]): Promise<TestResult> {
    await this.initialize();
    
    try {
      const timestamp = new Date().toISOString();
      const violations: WCAGViolation[] = [];
      let totalPasses = 0;
      let totalIncomplete = 0;
      let totalInapplicable = 0;

      for (const url of urls) {
        try {
          const result = await this.testPage(url);
          
          totalPasses += result.passes.length;
          totalIncomplete += result.incomplete.length;
          totalInapplicable += result.inapplicable.length;
          violations.push(...this.transformViolations(result.violations));
        } catch (error) {
          console.error(`Failed to test ${url}:`, error);
        }
      }

      return {
        violations,
        passes: totalPasses,
        incomplete: totalIncomplete,
        inapplicable: totalInapplicable,
        timestamp,
        url: '',
        config: this.config,
        crawlResults: [],
        summary: {
          totalPages: urls.length,
          totalViolations: violations.length,
          violationsByImpact: this.countViolationsByImpact(violations),
          mostCommonViolations: this.getMostCommonViolations(violations)
        }
      };
    } finally {
      await this.cleanup();
    }
  }
  private transformViolations(axeViolations: any[]): WCAGViolation[] {
    return axeViolations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map((node: any) => ({
        html: node.html,
        target: node.target,
        failureSummary: node.failureSummary
      }))
    }));
  }

  private countViolationsByImpact(violations: WCAGViolation[]): Record<string, number> {
    const counts: Record<string, number> = {};
    violations.forEach(violation => {
      counts[violation.impact] = (counts[violation.impact] || 0) + 1;
    });
    return counts;
  }

  private getMostCommonViolations(violations: WCAGViolation[]): Array<{ id: string; count: number }> {
    const counts: Record<string, number> = {};
    violations.forEach(violation => {
      counts[violation.id] = (counts[violation.id] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}