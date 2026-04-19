/**
 * Core interfaces for Test Execution Reporting System
 * Designed for enterprise-scale automation testing
 */

export interface IExecutionMetadata {
  executionId: string;
  timestamp: {
    start: string;
    end: string;
    duration: number; // milliseconds
  };
  project: string;
  squad: string;
  environment: 'dev' | 'qa' | 'stage' | 'prod';
  branch: string;
  buildNumber: string;
  triggeredBy: {
    type: 'user' | 'system' | 'schedule';
    name: string;
  };
  cicd: {
    provider: 'github-actions' | 'jenkins' | 'azure-devops' | 'gitlab-ci';
    runId: string;
    runUrl: string;
  };
}

export interface ITestResult {
  testCaseId: string;
  testName: string;
  testSuite: string;
  status: 'Passed' | 'Failed' | 'Skipped' | 'Not Executed';
  errorMessage?: string;
  stackTrace?: string;
  executionTime: number; // milliseconds
  retryCount: number;
  browser?: string;
  device?: string;
  tags: string[];
  screenshots?: string[];
  videos?: string[];
  attachments?: string[];
}

export interface IExecutionSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  notExecuted: number;
  passRate: number;
  failRate: number;
  avgExecutionTime: number;
}

export interface IExecutionData {
  metadata: IExecutionMetadata;
  summary: IExecutionSummary;
  testResults: ITestResult[];
  systemInfo: {
    os: string;
    nodeVersion: string;
    playwrightVersion: string;
    browserVersions: Record<string, string>;
  };
  configuration: {
    parallel: boolean;
    workers: number;
    timeout: number;
    retries: number;
  };
}

export interface IExecutionFilter {
  dateFrom?: string;
  dateTo?: string;
  singleDate?: string;
  project?: string;
  squad?: string;
  environment?: string;
  status?: string;
  branch?: string;
  triggeredBy?: string;
  tags?: string[];
}

export interface IReportConfig {
  title: string;
  filters: IExecutionFilter;
  includeCharts: boolean;
  includeDetails: boolean;
  exportFormat: 'html' | 'excel' | 'csv' | 'json';
  outputPath: string;
}

export interface IDashboardMetrics {
  totalExecutions: number;
  totalTests: number;
  overallPassRate: number;
  avgExecutionTime: number;
  topFailingTests: Array<{
    testName: string;
    failureCount: number;
    failureRate: number;
  }>;
  executionTrends: Array<{
    date: string;
    executions: number;
    passRate: number;
  }>;
  environmentStats: Record<string, {
    executions: number;
    passRate: number;
  }>;
  errorDistribution: Record<string, number>;
}