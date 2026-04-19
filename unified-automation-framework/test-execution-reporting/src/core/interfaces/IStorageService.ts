import { IExecutionData, IExecutionFilter, IDashboardMetrics } from './IExecutionData';

/**
 * Storage service interface for different storage implementations
 * Supports JSON, SQLite, and future AWS implementations
 */
export interface IStorageService {
  /**
   * Initialize the storage system
   */
  initialize(): Promise<void>;

  /**
   * Save execution data
   */
  saveExecution(executionData: IExecutionData): Promise<void>;

  /**
   * Get all executions with optional filtering
   */
  getExecutions(filter?: IExecutionFilter): Promise<IExecutionData[]>;

  /**
   * Get execution by ID
   */
  getExecutionById(executionId: string): Promise<IExecutionData | null>;

  /**
   * Get dashboard metrics
   */
  getDashboardMetrics(filter?: IExecutionFilter): Promise<IDashboardMetrics>;

  /**
   * Delete execution by ID
   */
  deleteExecution(executionId: string): Promise<void>;

  /**
   * Get execution count
   */
  getExecutionCount(filter?: IExecutionFilter): Promise<number>;

  /**
   * Check if storage is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Backup data
   */
  backup(backupPath: string): Promise<void>;

  /**
   * Restore data from backup
   */
  restore(backupPath: string): Promise<void>;
}

/**
 * Export service interface for different export formats
 */
export interface IExportService {
  /**
   * Export to Excel format
   */
  exportToExcel(
    executions: IExecutionData[],
    outputPath: string,
    filter?: IExecutionFilter
  ): Promise<void>;

  /**
   * Export to CSV format
   */
  exportToCSV(
    executions: IExecutionData[],
    outputPath: string,
    filter?: IExecutionFilter
  ): Promise<void>;

  /**
   * Export to JSON format
   */
  exportToJSON(
    executions: IExecutionData[],
    outputPath: string,
    filter?: IExecutionFilter
  ): Promise<void>;
}

/**
 * Report service interface for generating reports
 */
export interface IReportService {
  /**
   * Generate HTML report
   */
  generateHTMLReport(
    executions: IExecutionData[],
    outputPath: string,
    filter?: IExecutionFilter
  ): Promise<void>;

  /**
   * Generate dashboard data
   */
  generateDashboardData(
    executions: IExecutionData[],
    filter?: IExecutionFilter
  ): Promise<IDashboardMetrics>;

  /**
   * Generate trend analysis
   */
  generateTrendAnalysis(
    executions: IExecutionData[],
    days: number
  ): Promise<any>;
}