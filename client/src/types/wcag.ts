export interface WCAGViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
}

export interface TestConfig {
  maxDepth: number;
  excludePatterns: string[];
  includePatterns: string[];
  maxPages: number;
  wcagLevel: 'A' | 'AA' | 'AAA';
}

export interface CrawlResult {
  url: string;
  status: number;
  linkedUrls: string[];
}

export interface TestResult {
  violations: WCAGViolation[];
  passes: number;
  incomplete: number;
  inapplicable: number;
  timestamp: string;
  url: string;
  config: TestConfig;
  crawlResults: CrawlResult[];
  summary: {
    totalPages: number;
    totalViolations: number;
    violationsByImpact: Record<string, number>;
    mostCommonViolations: Array<{
      id: string;
      count: number;
    }>;
  };
}

export interface AnalysisProgress {
  currentUrl: string;
  processedUrls: number;
  totalUrlsFound: number;
  status: 'running' | 'complete' | 'error';
}