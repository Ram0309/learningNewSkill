import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs/promises';
import { IExportService } from '../../core/interfaces/IStorageService';
import { IExecutionData, IExecutionFilter } from '../../core/interfaces/IExecutionData';
import { Logger } from '../../utils/logger';
import { DateUtils } from '../../utils/date';

/**
 * Excel export service for test execution data
 * Generates comprehensive Excel reports with multiple sheets
 */
export class ExcelExportService implements IExportService {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('ExcelExportService');
  }

  async exportToExcel(
    executions: IExecutionData[],
    outputPath: string,
    filter?: IExecutionFilter
  ): Promise<void> {
    try {
      // Ensure output directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      const workbook = new ExcelJS.Workbook();
      
      // Set workbook properties
      workbook.creator = 'Test Execution Reporting System';
      workbook.lastModifiedBy = 'Test Execution Reporting System';
      workbook.created = new Date();
      workbook.modified = new Date();

      // Create sheets
      await this.createSummarySheet(workbook, executions, filter);
      await this.createExecutionsSheet(workbook, executions);
      await this.createTestResultsSheet(workbook, executions);
      await this.createTrendsSheet(workbook, executions);
      await this.createFailureAnalysisSheet(workbook, executions);

      // Save workbook
      await workbook.xlsx.writeFile(outputPath);
      
      this.logger.info(`Excel report exported: ${outputPath}`);
    } catch (error) {
      this.logger.error('Failed to export Excel report', error);
      throw error;
    }
  }

  async exportToCSV(
    executions: IExecutionData[],
    outputPath: string,
    filter?: IExecutionFilter
  ): Promise<void> {
    // This method is part of IExportService but will be implemented in CSVExportService
    throw new Error('CSV export not implemented in ExcelExportService. Use CSVExportService.');
  }

  async exportToJSON(
    executions: IExecutionData[],
    outputPath: string,
    filter?: IExecutionFilter
  ): Promise<void> {
    try {
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalExecutions: executions.length,
          filter: filter || null,
          generatedBy: 'Test Execution Reporting System'
        },
        executions
      };

      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
      
      this.logger.info(`JSON report exported: ${outputPath}`);
    } catch (error) {
      this.logger.error('Failed to export JSON report', error);
      throw error;
    }
  }

  private async createSummarySheet(
    workbook: ExcelJS.Workbook,
    executions: IExecutionData[],
    filter?: IExecutionFilter
  ): Promise<void> {
    const worksheet = workbook.addWorksheet('Summary');

    // Title
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Test Execution Summary Report';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Report metadata
    let row = 3;
    worksheet.getCell(`A${row}`).value = 'Report Generated:';
    worksheet.getCell(`B${row}`).value = DateUtils.formatForDisplay(new Date());
    row++;

    worksheet.getCell(`A${row}`).value = 'Total Executions:';
    worksheet.getCell(`B${row}`).value = executions.length;
    row++;

    if (filter) {
      if (filter.dateFrom || filter.dateTo) {
        worksheet.getCell(`A${row}`).value = 'Date Range:';
        const dateRange = `${filter.dateFrom || 'All'} to ${filter.dateTo || 'All'}`;
        worksheet.getCell(`B${row}`).value = dateRange;
        row++;
      }

      if (filter.project) {
        worksheet.getCell(`A${row}`).value = 'Project:';
        worksheet.getCell(`B${row}`).value = filter.project;
        row++;
      }

      if (filter.environment) {
        worksheet.getCell(`A${row}`).value = 'Environment:';
        worksheet.getCell(`B${row}`).value = filter.environment;
        row++;
      }
    }

    row += 2;

    // Overall statistics
    const totalTests = executions.reduce((sum, exec) => sum + exec.summary.total, 0);
    const totalPassed = executions.reduce((sum, exec) => sum + exec.summary.passed, 0);
    const totalFailed = executions.reduce((sum, exec) => sum + exec.summary.failed, 0);
    const totalSkipped = executions.reduce((sum, exec) => sum + exec.summary.skipped, 0);
    const overallPassRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    // Statistics table
    const statsHeaders = ['Metric', 'Value', 'Percentage'];
    statsHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(row, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    row++;

    const stats = [
      ['Total Tests', totalTests, '100%'],
      ['Passed Tests', totalPassed, `${(totalPassed / totalTests * 100).toFixed(1)}%`],
      ['Failed Tests', totalFailed, `${(totalFailed / totalTests * 100).toFixed(1)}%`],
      ['Skipped Tests', totalSkipped, `${(totalSkipped / totalTests * 100).toFixed(1)}%`],
      ['Overall Pass Rate', '', `${overallPassRate.toFixed(1)}%`]
    ];

    stats.forEach(stat => {
      worksheet.getCell(row, 1).value = stat[0];
      worksheet.getCell(row, 2).value = stat[1];
      worksheet.getCell(row, 3).value = stat[2];
      row++;
    });

    // Environment breakdown
    row += 2;
    worksheet.getCell(`A${row}`).value = 'Environment Breakdown';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 14 };
    row++;

    const envHeaders = ['Environment', 'Executions', 'Total Tests', 'Pass Rate'];
    envHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(row, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    row++;

    const envStats = this.calculateEnvironmentStats(executions);
    Object.entries(envStats).forEach(([env, stats]) => {
      worksheet.getCell(row, 1).value = env;
      worksheet.getCell(row, 2).value = stats.executions;
      worksheet.getCell(row, 3).value = stats.totalTests;
      worksheet.getCell(row, 4).value = `${stats.passRate.toFixed(1)}%`;
      row++;
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  private async createExecutionsSheet(
    workbook: ExcelJS.Workbook,
    executions: IExecutionData[]
  ): Promise<void> {
    const worksheet = workbook.addWorksheet('Executions');

    // Headers
    const headers = [
      'Execution ID',
      'Start Time',
      'End Time',
      'Duration (ms)',
      'Project',
      'Squad',
      'Environment',
      'Branch',
      'Build Number',
      'Triggered By',
      'Total Tests',
      'Passed',
      'Failed',
      'Skipped',
      'Pass Rate (%)',
      'CI/CD Provider',
      'Run URL'
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });

    // Data rows
    executions.forEach((execution, index) => {
      const row = index + 2;
      const metadata = execution.metadata;
      const summary = execution.summary;

      worksheet.getCell(row, 1).value = metadata.executionId;
      worksheet.getCell(row, 2).value = DateUtils.formatForDisplay(metadata.timestamp.start);
      worksheet.getCell(row, 3).value = DateUtils.formatForDisplay(metadata.timestamp.end);
      worksheet.getCell(row, 4).value = metadata.timestamp.duration;
      worksheet.getCell(row, 5).value = metadata.project;
      worksheet.getCell(row, 6).value = metadata.squad;
      worksheet.getCell(row, 7).value = metadata.environment;
      worksheet.getCell(row, 8).value = metadata.branch;
      worksheet.getCell(row, 9).value = metadata.buildNumber;
      worksheet.getCell(row, 10).value = `${metadata.triggeredBy.type}:${metadata.triggeredBy.name}`;
      worksheet.getCell(row, 11).value = summary.total;
      worksheet.getCell(row, 12).value = summary.passed;
      worksheet.getCell(row, 13).value = summary.failed;
      worksheet.getCell(row, 14).value = summary.skipped;
      worksheet.getCell(row, 15).value = summary.passRate.toFixed(1);
      worksheet.getCell(row, 16).value = metadata.cicd.provider;
      worksheet.getCell(row, 17).value = metadata.cicd.runUrl;

      // Color code based on pass rate
      const passRateCell = worksheet.getCell(row, 15);
      if (summary.passRate >= 90) {
        passRateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
      } else if (summary.passRate >= 70) {
        passRateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      } else {
        passRateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
      }
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Add filters
    worksheet.autoFilter = {
      from: 'A1',
      to: `Q${executions.length + 1}`
    };
  }

  private async createTestResultsSheet(
    workbook: ExcelJS.Workbook,
    executions: IExecutionData[]
  ): Promise<void> {
    const worksheet = workbook.addWorksheet('Test Results');

    // Headers
    const headers = [
      'Execution ID',
      'Test Case ID',
      'Test Name',
      'Test Suite',
      'Status',
      'Execution Time (ms)',
      'Retry Count',
      'Browser',
      'Device',
      'Tags',
      'Error Message',
      'Project',
      'Environment',
      'Execution Date'
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });

    // Data rows
    let row = 2;
    executions.forEach(execution => {
      execution.testResults.forEach(test => {
        worksheet.getCell(row, 1).value = execution.metadata.executionId;
        worksheet.getCell(row, 2).value = test.testCaseId;
        worksheet.getCell(row, 3).value = test.testName;
        worksheet.getCell(row, 4).value = test.testSuite;
        worksheet.getCell(row, 5).value = test.status;
        worksheet.getCell(row, 6).value = test.executionTime;
        worksheet.getCell(row, 7).value = test.retryCount;
        worksheet.getCell(row, 8).value = test.browser || '';
        worksheet.getCell(row, 9).value = test.device || '';
        worksheet.getCell(row, 10).value = test.tags.join(', ');
        worksheet.getCell(row, 11).value = test.errorMessage || '';
        worksheet.getCell(row, 12).value = execution.metadata.project;
        worksheet.getCell(row, 13).value = execution.metadata.environment;
        worksheet.getCell(row, 14).value = DateUtils.formatForDisplay(execution.metadata.timestamp.start);

        // Color code based on status
        const statusCell = worksheet.getCell(row, 5);
        switch (test.status) {
          case 'Passed':
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
            break;
          case 'Failed':
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
            break;
          case 'Skipped':
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
            break;
        }

        row++;
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Add filters
    worksheet.autoFilter = {
      from: 'A1',
      to: `N${row - 1}`
    };
  }

  private async createTrendsSheet(
    workbook: ExcelJS.Workbook,
    executions: IExecutionData[]
  ): Promise<void> {
    const worksheet = workbook.addWorksheet('Trends');

    // Calculate daily trends
    const trends = this.calculateDailyTrends(executions);

    // Headers
    const headers = ['Date', 'Executions', 'Total Tests', 'Passed Tests', 'Failed Tests', 'Pass Rate (%)'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });

    // Data rows
    trends.forEach((trend, index) => {
      const row = index + 2;
      worksheet.getCell(row, 1).value = trend.date;
      worksheet.getCell(row, 2).value = trend.executions;
      worksheet.getCell(row, 3).value = trend.totalTests;
      worksheet.getCell(row, 4).value = trend.passedTests;
      worksheet.getCell(row, 5).value = trend.failedTests;
      worksheet.getCell(row, 6).value = trend.passRate.toFixed(1);
    });

    // Create chart
    const chart = worksheet.addChart({
      type: 'line',
      name: 'Pass Rate Trend',
      position: 'H2',
      size: { width: 600, height: 300 }
    });

    chart.addSeries({
      name: 'Pass Rate',
      categories: `A2:A${trends.length + 1}`,
      values: `F2:F${trends.length + 1}`
    });

    chart.title = 'Pass Rate Trend Over Time';
    chart.axes.category.title = 'Date';
    chart.axes.value.title = 'Pass Rate (%)';

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
  }

  private async createFailureAnalysisSheet(
    workbook: ExcelJS.Workbook,
    executions: IExecutionData[]
  ): Promise<void> {
    const worksheet = workbook.addWorksheet('Failure Analysis');

    // Calculate failure statistics
    const failureStats = this.calculateFailureStats(executions);

    // Top failing tests
    worksheet.getCell('A1').value = 'Top Failing Tests';
    worksheet.getCell('A1').font = { bold: true, size: 14 };

    const failingTestHeaders = ['Test Name', 'Total Runs', 'Failures', 'Failure Rate (%)'];
    failingTestHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(3, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });

    failureStats.topFailingTests.forEach((test, index) => {
      const row = index + 4;
      worksheet.getCell(row, 1).value = test.testName;
      worksheet.getCell(row, 2).value = test.totalRuns;
      worksheet.getCell(row, 3).value = test.failures;
      worksheet.getCell(row, 4).value = test.failureRate.toFixed(1);
    });

    // Error distribution
    const errorRow = failureStats.topFailingTests.length + 6;
    worksheet.getCell(`A${errorRow}`).value = 'Error Distribution';
    worksheet.getCell(`A${errorRow}`).font = { bold: true, size: 14 };

    const errorHeaders = ['Error Type', 'Count', 'Percentage'];
    errorHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(errorRow + 2, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });

    Object.entries(failureStats.errorDistribution).forEach(([errorType, count], index) => {
      const row = errorRow + 3 + index;
      const percentage = (count / failureStats.totalFailures) * 100;
      worksheet.getCell(row, 1).value = errorType;
      worksheet.getCell(row, 2).value = count;
      worksheet.getCell(row, 3).value = `${percentage.toFixed(1)}%`;
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  private calculateEnvironmentStats(executions: IExecutionData[]): Record<string, {
    executions: number;
    totalTests: number;
    passRate: number;
  }> {
    const stats: Record<string, { executions: number; totalTests: number; passedTests: number }> = {};

    executions.forEach(execution => {
      const env = execution.metadata.environment;
      if (!stats[env]) {
        stats[env] = { executions: 0, totalTests: 0, passedTests: 0 };
      }
      stats[env].executions++;
      stats[env].totalTests += execution.summary.total;
      stats[env].passedTests += execution.summary.passed;
    });

    return Object.entries(stats).reduce((result, [env, data]) => {
      result[env] = {
        executions: data.executions,
        totalTests: data.totalTests,
        passRate: data.totalTests > 0 ? (data.passedTests / data.totalTests) * 100 : 0
      };
      return result;
    }, {} as Record<string, { executions: number; totalTests: number; passRate: number }>);
  }

  private calculateDailyTrends(executions: IExecutionData[]): Array<{
    date: string;
    executions: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
  }> {
    const trends: Record<string, {
      executions: number;
      totalTests: number;
      passedTests: number;
      failedTests: number;
    }> = {};

    executions.forEach(execution => {
      const date = new Date(execution.metadata.timestamp.start).toDateString();
      if (!trends[date]) {
        trends[date] = { executions: 0, totalTests: 0, passedTests: 0, failedTests: 0 };
      }
      trends[date].executions++;
      trends[date].totalTests += execution.summary.total;
      trends[date].passedTests += execution.summary.passed;
      trends[date].failedTests += execution.summary.failed;
    });

    return Object.entries(trends)
      .map(([date, data]) => ({
        date,
        executions: data.executions,
        totalTests: data.totalTests,
        passedTests: data.passedTests,
        failedTests: data.failedTests,
        passRate: data.totalTests > 0 ? (data.passedTests / data.totalTests) * 100 : 0
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private calculateFailureStats(executions: IExecutionData[]): {
    topFailingTests: Array<{
      testName: string;
      totalRuns: number;
      failures: number;
      failureRate: number;
    }>;
    errorDistribution: Record<string, number>;
    totalFailures: number;
  } {
    const testStats = new Map<string, { total: number; failures: number }>();
    const errorDistribution: Record<string, number> = {};
    let totalFailures = 0;

    executions.forEach(execution => {
      execution.testResults.forEach(test => {
        // Test statistics
        if (!testStats.has(test.testName)) {
          testStats.set(test.testName, { total: 0, failures: 0 });
        }
        const stats = testStats.get(test.testName)!;
        stats.total++;
        if (test.status === 'Failed') {
          stats.failures++;
          totalFailures++;

          // Error distribution
          if (test.errorMessage) {
            const errorType = this.extractErrorType(test.errorMessage);
            errorDistribution[errorType] = (errorDistribution[errorType] || 0) + 1;
          }
        }
      });
    });

    const topFailingTests = Array.from(testStats.entries())
      .map(([testName, stats]) => ({
        testName,
        totalRuns: stats.total,
        failures: stats.failures,
        failureRate: (stats.failures / stats.total) * 100
      }))
      .filter(test => test.failures > 0)
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 20);

    return {
      topFailingTests,
      errorDistribution,
      totalFailures
    };
  }

  private extractErrorType(errorMessage: string): string {
    const errorPatterns = [
      { pattern: /timeout/i, type: 'Timeout' },
      { pattern: /element.*not.*found/i, type: 'Element Not Found' },
      { pattern: /assertion.*failed/i, type: 'Assertion Failed' },
      { pattern: /network.*error/i, type: 'Network Error' },
      { pattern: /page.*crash/i, type: 'Page Crash' },
      { pattern: /javascript.*error/i, type: 'JavaScript Error' }
    ];

    for (const { pattern, type } of errorPatterns) {
      if (pattern.test(errorMessage)) {
        return type;
      }
    }

    return 'Other';
  }
}