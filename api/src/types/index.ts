// Import shared types from client

import { TestConfig, TestResult, WCAGViolation } from "../../types";


export type { TestConfig, TestResult, WCAGViolation };

export interface CrawlResult {
  url: string;
  status: number;
  linkedUrls: string[];
  errorMessage?: string;
} 