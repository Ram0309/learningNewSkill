import * as fs from 'fs/promises';
import * as path from 'path';
import { IExportService } from '../../core/interfaces/IStorageService';
import { IExecutionData, IExecutionFilter } from '../../core/interfaces/IExecutionData';
import { Logger } from '../../utils/logger';
import { DateUtils } from '../../utils/date';

/**
 * CSV Export Service for Test Execution Data
 * Exports execution data and test results to CSV format
 */
export class CSVExportService implements IExportService {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('CSVExportService');
  }

  async exportToExcel(
    executions: IExecutionData[],
    outputPath: string,
    filter?: IExecutionFilter
  ): Promise<void> {
    // CSV service doesn't support Excel format, delegate to Excel service
    throw new Error('Excel export not supported by CSV service. Use ExcelExportService instead.');
  }

  async exportToCSV(
    executions: IExecutionData[],
    outputPath: string,
    filter?: IExecutionFilter
  ): Promise<void> {
    try {
      // Ensure output directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      // Generate CSV content
      const csvContent = await this.generateCSVContent(executions, filter);

      // Write to file
      await fs.writeFile(outputPath, csvContent, 'utf8');

      this.logger.info(`CSV export completed: ${outputPath}`);
    } catch (error) {
      this.logger.error('Failed to export CSV', error);
      throw error;
    }
  }

  async exportToJSON(
    executions: IExecutionData[],
    outputPath: string,
    filter?: IExecutionFilter
  ): Promise<void> {
    try {
      // Ensure output directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      // Prepare export data
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalExecutions: executions.length,
          filters: filter || {},
          generatedBy: 'Test Execution Reporting System'
        },
        executions: executions
      };

      // Write to file
      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf8');

      this.logger.info(`JSON export completed: ${outputPath}`);
    } catch (error) {
      this.logger.error('Failed to export JSON', error);
      throw error;
    }
  }

  /**
   * Export execution summary to CSV
   */
  async exportExecutionSummary(
    executions: IExecutionData[],
    outputPath: string,
    filter?: IExecutionFilter
  ): Promise<void> {
    try {
      const headers = [
        'Execution ID',
        'Project',
        'Squad',
        'Environment',
        'Branch',
        'Start Time',
        'End Time',
        'Duration (ms)',
        'Total Tests',
        'Passed',
        'Failed',
        'Skipped',
        'Not Executed',
        'Pass Rate (%)',
        'Fail Rate (%)',
        'Avg Test Duration (ms)',
        'Triggered By',
        'CI/CD Provider',
        'Build Number'
      ];

      const rows = executions.map(execution => [
        execution.metadata.executionId,
        execution.metadata.project,
        execution.metadata.squad,
        execution.metadata.environment,
        execution.metadata.branch,
        execution.metadata.timestamp.start,
        execution.metadata.timestamp.end,
        execution.metadata.timestamp.duration.toString(),
        execution.summary.total.toString(),
        execution.summary.passed.toString(),
        execution.summary.failed.toString(),
        execution.summary.skipped.toString(),
        execution.summary.notExecuted.toString(),
        execution.summary.passRate.toFixed(2),
        execution.summary.failRate.toFixed(2),
        execution.summary.avgExecutionTime.toFixed(2),
        execution.metadata.triggeredBy.name,
        execution.metadata.cicd.provider,
        execution.metadata.buildNumber
      ]);

      const csvContent = this.arrayToCSV([headers, ...rows]);
      await fs.writeFile(outputPath, csvContent, 'utf8');

      this.logger.info(`Execution summary CSV export completed: ${outputPath}`);
    } catch (error) {
      this.logger.error('Failed to export execution summary CSV', error);
      throw error;
    }
  }

  /**
   * Export detailed test results to CSV
   */
  async exportTestResults(
    executions: IExecutionData[],
    outputPath: string,
    filter?: IExecutionFilter
  ): Promise<void> {
    try {
      const headers = [
        'Execution ID',
        'Project',
        'Environment',
        'Test Case ID',
        'Test Name',
        'Test Suite',
        'Status',
        'Error Message',
        'Execution Time (ms)',
        'Retry Count',
        'Browser',
        'Device',
        'Tags',
        'Start Time',
        'Screenshots Count',
        'Videos Count'
      ];

      const rows: string[][] = [];

      executions.forEach(execution => {
        execution.testResults.forEach(test => {
          rows.push([
            execution.metadata.executionId,
            execution.metadata.project,
            execution.metadata.environment,
            test.testCaseId,
            test.testName,
            test.testSuite,
            test.status,
            test.errorMessage || '',
            test.executionTime.toString(),
            test.retryCount.toString(),
            test.browser || '',
            test.device || '',
            test.tags.join(';'),
            execution.metadata.timestamp.start,
            (test.screenshots?.length || 0).toString(),
            (test.videos?.length || 0).toString()
          ]);
        });
      });

      const csvContent = this.arrayToCSV([headers, ...rows]);
      await fs.writeFile(outputPath, csvContent, 'utf8');

      this.logger.info(`Test results CSV export completed: ${outputPath}`);
    } catch (error) {
      this.logger.error('Failed to export test results CSV', error);
      throw error;
    }
  }

  /**
   * Export failing tests analysis to CSV
   */
  async exportFailingTestsAnalysis(
    executions: IExecutionData[],
    outputPath: string
  ): Promise<void> {
    try {
      // Analyze failing tests
      const failingTestsMap = new Map<string, {
        testName: string;
        testSuite: string;
        totalRuns: number;
        failures: number;
        lastFailure: string;
        errorMessages: string[];
        environments: Set<string>;
        browsers: Set<string>;
      }>();

      executions.forEach(execution => {
        execution.testResults
          .filter(test => test.status === 'Failed')
          .forEach(test => {
            const key = `${test.testSuite}::${test.testName}`;
            
            if (!failingTestsMap.has(key)) {
              failingTestsMap.set(key, {
                testName: test.testName,
                testSuite: test.testSuite,
                totalRuns: 0,
                failures: 0,
                lastFailure: execution.metadata.timestamp.start,
                errorMessages: [],
                environments: new Set(),
                browsers: new Set()
              });
            }

            const testData = failingTestsMap.get(key)!;
            testData.totalRuns++;
            testData.failures++;
            testData.lastFailure = execution.metadata.timestamp.start;
            
            if (test.errorMessage && !testData.errorMessages.includes(test.errorMessage)) {
              testData.errorMessages.push(test.errorMessage);
            }
            
            testData.environments.add(execution.metadata.environment);
            if (test.browser) {
              testData.browsers.add(test.browser);
            }
          });
      });

      // Count total runs for each test
      executions.forEach(execution => {
        execution.testResults.forEach(test => {
          const key = `${test.testSuite}::${test.testName}`;
          if (failingTestsMap.has(key)) {
            const testData = failingTestsMap.get(key)!;
            if (test.status !== 'Failed') {
              testData.totalRuns++;
            }
          }
        });
      });

      const headers = [
        'Test Name',
        'Test Suite',
        'Total Runs',
        'Failures',
        'Failure Rate (%)',
        'Last Failure',
        'Affected Environments',
        'Affected Browsers',
        'Common Error Messages'
      ];

      const rows = Array.from(failingTestsMap.values())
        .sort((a, b) => b.failures - a.failures)
        .map(test => [
          test.testName,
          test.testSuite,
          test.totalRuns.toString(),
          test.failures.toString(),
          ((test.failures / test.totalRuns) * 100).toFixed(2),
          test.lastFailure,
          Array.from(test.environments).join(';'),
          Array.from(test.browsers).join(';'),
          test.errorMessages.slice(0, 3).join(' | ') // Limit to top 3 error messages
        ]);

      const csvContent = this.arrayToCSV([headers, ...rows]);
      await fs.writeFile(outputPath, csvContent, 'utf8');

      this.logger.info(`Failing tests analysis CSV export completed: ${outputPath}`);
    } catch (error) {
      this.logger.error('Failed to export failing tests analysis CSV', error);
      throw error;
    }
  }

  /**
   * Export environment comparison to CSV
   */
  async exportEnvironmentComparison(
    executions: IExecutionData[],
    outputPath: string
  ): Promise<void> {
    try {
      const environmentStats = new Map<string, {
        environment: string;
        totalExecutions: number;
        totalTests: number;
        passedTests: number;
        failedTests: number;
        skippedTests: number;
        avgDuration: number;
        avgPassRate: number;
      }>();

      executions.forEach(execution => {
        const env = execution.metadata.environment;
        
        if (!environmentStats.has(env)) {
          environmentStats.set(env, {
            environment: env,
            totalExecutions: 0,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            avgDuration: 0,
            avgPassRate: 0
          });
        }

        const stats = environmentStats.get(env)!;
        stats.totalExecutions++;
        stats.totalTests += execution.summary.total;
        stats.passedTests += execution.summary.passed;
        stats.failedTests += execution.summary.failed;
        stats.skippedTests += execution.summary.skipped;
        stats.avgDuration += execution.metadata.timestamp.duration;
        stats.avgPassRate += execution.summary.passRate;
      });

      // Calculate averages
      environmentStats.forEach(stats => {
        stats.avgDuration = stats.avgDuration / stats.totalExecutions;
        stats.avgPassRate = stats.avgPassRate / stats.totalExecutions;
      });

      const headers = [
        'Environment',
        'Total Executions',
        'Total Tests',
        'Passed Tests',
        'Failed Tests',
        'Skipped Tests',
        'Pass Rate (%)',
        'Fail Rate (%)',
        'Avg Execution Duration (ms)',
        'Reliability Score'
      ];

      const rows = Array.from(environmentStats.values())
        .sort((a, b) => b.avgPassRate - a.avgPassRate)
        .map(stats => {
          const failRate = ((stats.failedTests / stats.totalTests) * 100);
          const reliabilityScore = (stats.avgPassRate * 0.7) + ((100 - failRate) * 0.3);
          
          return [
            stats.environment.toUpperCase(),
            stats.totalExecutions.toString(),
            stats.totalTests.toString(),
            stats.passedTests.toString(),
            stats.failedTests.toString(),
            stats.skippedTests.toString(),
            stats.avgPassRate.toFixed(2),
            failRate.toFixed(2),
            Math.round(stats.avgDuration).toString(),
            reliabilityScore.toFixed(2)
          ];
        });

      const csvContent = this.arrayToCSV([headers, ...rows]);
      await fs.writeFile(outputPath, csvContent, 'utf8');

      this.logger.info(`Environment comparison CSV export completed: ${outputPath}`);
    } catch (error) {
      this.logger.error('Failed to export environment comparison CSV', error);
      throw error;
    }
  }

  private async generateCSVContent(
    executions: IExecutionData[],
    filter?: IExecutionFilter
  ): Promise<string> {
    const sections: string[] = [];

    // Add metadata section
    sections.push('# Test Execution Report');
    sections.push(`# Generated: ${new Date().toISOString()}`);
    sections.push(`# Total Executions: ${executions.length}`);
    
    if (filter) {
      sections.push('# Applied Filters:');
      Object.entries(filter).forEach(([key, value]) => {
        if (value) {
          sections.push(`# ${key}: ${value}`);
        }
      });
    }
    
    sections.push(''); // Empty line

    // Execution Summary
    sections.push('## Execution Summary');
    const summaryHeaders = [
      'Execution ID',
      'Project',
      'Environment',
      'Start Time',
      'Duration (min)',
      'Total Tests',
      'Pass Rate (%)',
      'Status'
    ];

    const summaryRows = executions.map(execution => [
      execution.metadata.executionId,
      execution.metadata.project,
      execution.metadata.environment,
      DateUtils.formatDateTime(execution.metadata.timestamp.start),
      (execution.metadata.timestamp.duration / 60000).toFixed(1),
      execution.summary.total.toString(),
      execution.summary.passRate.toFixed(1),
      execution.summary.passRate >= 90 ? 'Excellent' : 
      execution.summary.passRate >= 70 ? 'Good' : 'Needs Attention'
    ]);

    sections.push(this.arrayToCSV([summaryHeaders, ...summaryRows]));
    sections.push(''); // Empty line

    return sections.join('\n');
  }

  private arrayToCSV(data: string[][]): string {
    return data.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if necessary
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
  }

  /**
   * Export multiple formats at once
   */
  async exportMultipleFormats(
    executions: IExecutionData[],
    basePath: string,
    formats: ('summary' | 'detailed' | 'failing-tests' | 'environment-comparison')[],
    filter?: IExecutionFilter
  ): Promise<string[]> {
    const exportedFiles: string[] = [];

    try {
      for (const format of formats) {
        const timestamp = DateUtils.formatTimestamp(new Date());
        let outputPath: string;
        
        switch (format) {
          case 'summary':
            outputPath = `${basePath}/execution-summary-${timestamp}.csv`;
            await this.exportExecutionSummary(executions, outputPath, filter);
            break;
            
          case 'detailed':
            outputPath = `${basePath}/test-results-${timestamp}.csv`;
            await this.exportTestResults(executions, outputPath, filter);
            break;
            
          case 'failing-tests':
            outputPath = `${basePath}/failing-tests-analysis-${timestamp}.csv`;
            await this.exportFailingTestsAnalysis(executions, outputPath);
            break;
            
          case 'environment-comparison':
            outputPath = `${basePath}/environment-comparison-${timestamp}.csv`;
            await this.exportEnvironmentComparison(executions, outputPath);
            break;
            
          default:
            continue;
        }
        
        exportedFiles.push(outputPath);
      }

      this.logger.info(`Multiple format export completed: ${exportedFiles.length} files`);
      return exportedFiles;
    } catch (error) {
      this.logger.error('Failed to export multiple formats', error);
      throw error;
    }
  }
}