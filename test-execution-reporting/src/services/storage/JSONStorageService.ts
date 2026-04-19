import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorageService } from '../../core/interfaces/IStorageService';
import { IExecutionData, IExecutionFilter, IDashboardMetrics } from '../../core/interfaces/IExecutionData';
import { Logger } from '../../utils/logger';
import { DateUtils } from '../../utils/date';

/**
 * JSON-based storage service for test execution data
 * Simple file-based storage for smaller datasets
 */
export class JSONStorageService implements IStorageService {
  private readonly filePath: string;
  private readonly logger: Logger;
  private executionData: IExecutionData[] = [];

  constructor(filePath: string = './data/execution-history.json') {
    this.filePath = path.resolve(filePath);
    this.logger = new Logger('JSONStorageService');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Load existing data
      await this.loadData();
      
      this.logger.info(`JSON storage initialized: ${this.filePath}`);
    } catch (error) {
      this.logger.error('Failed to initialize JSON storage', error);
      throw error;
    }
  }

  async saveExecution(executionData: IExecutionData): Promise<void> {
    try {
      // Remove existing execution with same ID
      this.executionData = this.executionData.filter(
        exec => exec.metadata.executionId !== executionData.metadata.executionId
      );

      // Add new execution
      this.executionData.push(executionData);

      // Sort by start time (newest first)
      this.executionData.sort((a, b) => 
        new Date(b.metadata.timestamp.start).getTime() - 
        new Date(a.metadata.timestamp.start).getTime()
      );

      // Save to file
      await this.saveData();

      this.logger.info(`Saved execution: ${executionData.metadata.executionId}`);
    } catch (error) {
      this.logger.error('Failed to save execution', error);
      throw error;
    }
  }

  async getExecutions(filter?: IExecutionFilter): Promise<IExecutionData[]> {
    try {
      let filteredData = [...this.executionData];

      if (filter) {
        filteredData = this.applyFilters(filteredData, filter);
      }

      this.logger.info(`Retrieved ${filteredData.length} executions`);
      return filteredData;
    } catch (error) {
      this.logger.error('Failed to get executions', error);
      throw error;
    }
  }

  async getExecutionById(executionId: string): Promise<IExecutionData | null> {
    try {
      const execution = this.executionData.find(
        exec => exec.metadata.executionId === executionId
      );

      if (execution) {
        this.logger.info(`Found execution: ${executionId}`);
      } else {
        this.logger.warn(`Execution not found: ${executionId}`);
      }

      return execution || null;
    } catch (error) {
      this.logger.error('Failed to get execution by ID', error);
      throw error;
    }
  }

  async getDashboardMetrics(filter?: IExecutionFilter): Promise<IDashboardMetrics> {
    try {
      const executions = await this.getExecutions(filter);

      if (executions.length === 0) {
        return this.getEmptyMetrics();
      }

      // Calculate basic metrics
      const totalExecutions = executions.length;
      const totalTests = executions.reduce((sum, exec) => sum + exec.summary.total, 0);
      const totalPassed = executions.reduce((sum, exec) => sum + exec.summary.passed, 0);
      const overallPassRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
      const avgExecutionTime = executions.reduce((sum, exec) => sum + exec.metadata.timestamp.duration, 0) / totalExecutions;

      // Calculate top failing tests
      const topFailingTests = this.calculateTopFailingTests(executions);

      // Calculate execution trends
      const executionTrends = this.calculateExecutionTrends(executions);

      // Calculate environment stats
      const environmentStats = this.calculateEnvironmentStats(executions);

      // Calculate error distribution
      const errorDistribution = this.calculateErrorDistribution(executions);

      const metrics: IDashboardMetrics = {
        totalExecutions,
        totalTests,
        overallPassRate,
        avgExecutionTime,
        topFailingTests,
        executionTrends,
        environmentStats,
        errorDistribution
      };

      this.logger.info('Generated dashboard metrics');
      return metrics;
    } catch (error) {
      this.logger.error('Failed to get dashboard metrics', error);
      throw error;
    }
  }

  async deleteExecution(executionId: string): Promise<void> {
    try {
      const initialLength = this.executionData.length;
      this.executionData = this.executionData.filter(
        exec => exec.metadata.executionId !== executionId
      );

      if (this.executionData.length === initialLength) {
        throw new Error('Execution not found');
      }

      await this.saveData();
      this.logger.info(`Deleted execution: ${executionId}`);
    } catch (error) {
      this.logger.error('Failed to delete execution', error);
      throw error;
    }
  }

  async getExecutionCount(filter?: IExecutionFilter): Promise<number> {
    try {
      const executions = await this.getExecutions(filter);
      return executions.length;
    } catch (error) {
      this.logger.error('Failed to get execution count', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  async backup(backupPath: string): Promise<void> {
    try {
      await fs.copyFile(this.filePath, backupPath);
      this.logger.info(`Backup created: ${backupPath}`);
    } catch (error) {
      this.logger.error('Failed to create backup', error);
      throw error;
    }
  }

  async restore(backupPath: string): Promise<void> {
    try {
      await fs.copyFile(backupPath, this.filePath);
      await this.loadData();
      this.logger.info(`Restored from backup: ${backupPath}`);
    } catch (error) {
      this.logger.error('Failed to restore from backup', error);
      throw error;
    }
  }

  private async loadData(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      if (Array.isArray(parsed)) {
        this.executionData = parsed;
      } else if (parsed.executions && Array.isArray(parsed.executions)) {
        this.executionData = parsed.executions;
      } else {
        this.executionData = [];
      }

      this.logger.info(`Loaded ${this.executionData.length} executions from file`);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, start with empty array
        this.executionData = [];
        await this.saveData();
      } else {
        throw error;
      }
    }
  }

  private async saveData(): Promise<void> {
    try {
      const dataToSave = {
        metadata: {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          totalExecutions: this.executionData.length
        },
        executions: this.executionData
      };

      await fs.writeFile(this.filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
    } catch (error) {
      this.logger.error('Failed to save data to file', error);
      throw error;
    }
  }

  private applyFilters(executions: IExecutionData[], filter: IExecutionFilter): IExecutionData[] {
    return executions.filter(execution => {
      // Date filters
      if (filter.singleDate) {
        const executionDate = DateUtils.formatDate(execution.metadata.timestamp.start);
        if (executionDate !== filter.singleDate) {
          return false;
        }
      }

      if (filter.dateFrom) {
        const executionDate = new Date(execution.metadata.timestamp.start);
        const fromDate = new Date(filter.dateFrom);
        if (executionDate < fromDate) {
          return false;
        }
      }

      if (filter.dateTo) {
        const executionDate = new Date(execution.metadata.timestamp.start);
        const toDate = new Date(filter.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (executionDate > toDate) {
          return false;
        }
      }

      // Project filter
      if (filter.project && execution.metadata.project !== filter.project) {
        return false;
      }

      // Squad filter
      if (filter.squad && execution.metadata.squad !== filter.squad) {
        return false;
      }

      // Environment filter
      if (filter.environment && execution.metadata.environment !== filter.environment) {
        return false;
      }

      // Branch filter
      if (filter.branch && execution.metadata.branch !== filter.branch) {
        return false;
      }

      // Triggered by filter
      if (filter.triggeredBy && execution.metadata.triggeredBy.name !== filter.triggeredBy) {
        return false;
      }

      // Status filter (based on pass rate)
      if (filter.status) {
        const status = this.getExecutionStatus(execution.summary.passRate);
        if (status.toLowerCase() !== filter.status.toLowerCase()) {
          return false;
        }
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        const executionTags = this.getExecutionTags(execution);
        const hasMatchingTag = filter.tags.some(tag => 
          executionTags.some(execTag => 
            execTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }

  private calculateTopFailingTests(executions: IExecutionData[]): Array<{
    testName: string;
    failureCount: number;
    failureRate: number;
  }> {
    const testStats = new Map<string, { total: number; failures: number }>();

    executions.forEach(execution => {
      execution.testResults.forEach(test => {
        const key = test.testName;
        
        if (!testStats.has(key)) {
          testStats.set(key, { total: 0, failures: 0 });
        }

        const stats = testStats.get(key)!;
        stats.total++;
        
        if (test.status === 'Failed') {
          stats.failures++;
        }
      });
    });

    return Array.from(testStats.entries())
      .map(([testName, stats]) => ({
        testName,
        failureCount: stats.failures,
        failureRate: (stats.failures / stats.total) * 100
      }))
      .filter(test => test.failureCount > 0)
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 10);
  }

  private calculateExecutionTrends(executions: IExecutionData[]): Array<{
    date: string;
    executions: number;
    passRate: number;
  }> {
    const trendMap = new Map<string, { count: number; totalPassRate: number }>();

    executions.forEach(execution => {
      const date = DateUtils.formatDate(execution.metadata.timestamp.start);
      
      if (!trendMap.has(date)) {
        trendMap.set(date, { count: 0, totalPassRate: 0 });
      }

      const trend = trendMap.get(date)!;
      trend.count++;
      trend.totalPassRate += execution.summary.passRate;
    });

    return Array.from(trendMap.entries())
      .map(([date, trend]) => ({
        date,
        executions: trend.count,
        passRate: trend.totalPassRate / trend.count
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Last 30 days
  }

  private calculateEnvironmentStats(executions: IExecutionData[]): Record<string, {
    executions: number;
    passRate: number;
  }> {
    const envStats = new Map<string, { count: number; totalPassRate: number }>();

    executions.forEach(execution => {
      const env = execution.metadata.environment;
      
      if (!envStats.has(env)) {
        envStats.set(env, { count: 0, totalPassRate: 0 });
      }

      const stats = envStats.get(env)!;
      stats.count++;
      stats.totalPassRate += execution.summary.passRate;
    });

    const result: Record<string, { executions: number; passRate: number }> = {};
    
    envStats.forEach((stats, env) => {
      result[env] = {
        executions: stats.count,
        passRate: stats.totalPassRate / stats.count
      };
    });

    return result;
  }

  private calculateErrorDistribution(executions: IExecutionData[]): Record<string, number> {
    const errorMap = new Map<string, number>();

    executions.forEach(execution => {
      execution.testResults
        .filter(test => test.status === 'Failed' && test.errorMessage)
        .forEach(test => {
          const errorType = this.categorizeError(test.errorMessage!);
          errorMap.set(errorType, (errorMap.get(errorType) || 0) + 1);
        });
    });

    const result: Record<string, number> = {};
    errorMap.forEach((count, errorType) => {
      result[errorType] = count;
    });

    return result;
  }

  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout')) return 'Timeout';
    if (message.includes('element') && message.includes('not found')) return 'Element Not Found';
    if (message.includes('assertion') && message.includes('failed')) return 'Assertion Failed';
    if (message.includes('network') || message.includes('connection')) return 'Network Error';
    if (message.includes('javascript') || message.includes('js error')) return 'JavaScript Error';
    if (message.includes('page') && message.includes('crash')) return 'Page Crash';
    if (message.includes('permission') || message.includes('access denied')) return 'Permission Error';
    if (message.includes('memory') || message.includes('out of memory')) return 'Memory Error';
    
    return 'Other';
  }

  private getExecutionStatus(passRate: number): string {
    if (passRate >= 90) return 'Excellent';
    if (passRate >= 70) return 'Good';
    return 'Needs Attention';
  }

  private getExecutionTags(execution: IExecutionData): string[] {
    const tags = new Set<string>();
    
    execution.testResults.forEach(test => {
      test.tags.forEach(tag => tags.add(tag));
    });

    return Array.from(tags);
  }

  private getEmptyMetrics(): IDashboardMetrics {
    return {
      totalExecutions: 0,
      totalTests: 0,
      overallPassRate: 0,
      avgExecutionTime: 0,
      topFailingTests: [],
      executionTrends: [],
      environmentStats: {},
      errorDistribution: {}
    };
  }

  /**
   * Optimize storage by removing old executions
   */
  async optimizeStorage(maxExecutions: number = 1000): Promise<void> {
    try {
      if (this.executionData.length > maxExecutions) {
        // Keep the most recent executions
        this.executionData = this.executionData
          .sort((a, b) => 
            new Date(b.metadata.timestamp.start).getTime() - 
            new Date(a.metadata.timestamp.start).getTime()
          )
          .slice(0, maxExecutions);

        await this.saveData();
        this.logger.info(`Optimized storage: kept ${maxExecutions} most recent executions`);
      }
    } catch (error) {
      this.logger.error('Failed to optimize storage', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalExecutions: number;
    totalTests: number;
    fileSizeBytes: number;
    oldestExecution: string;
    newestExecution: string;
  }> {
    try {
      const stats = await fs.stat(this.filePath);
      const totalTests = this.executionData.reduce((sum, exec) => sum + exec.summary.total, 0);
      
      const sortedByDate = [...this.executionData].sort((a, b) => 
        new Date(a.metadata.timestamp.start).getTime() - 
        new Date(b.metadata.timestamp.start).getTime()
      );

      return {
        totalExecutions: this.executionData.length,
        totalTests,
        fileSizeBytes: stats.size,
        oldestExecution: sortedByDate[0]?.metadata.timestamp.start || '',
        newestExecution: sortedByDate[sortedByDate.length - 1]?.metadata.timestamp.start || ''
      };
    } catch (error) {
      this.logger.error('Failed to get storage stats', error);
      throw error;
    }
  }
}