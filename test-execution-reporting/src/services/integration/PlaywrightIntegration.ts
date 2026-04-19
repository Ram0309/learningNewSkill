import { test as base, TestInfo, FullResult } from '@playwright/test';
import { IExecutionData, ITestResult, IExecutionMetadata, IExecutionSummary } from '../../core/interfaces/IExecutionData';
import { IStorageService } from '../../core/interfaces/IStorageService';
import { JSONStorageService } from '../storage/JSONStorageService';
import { SQLiteStorageService } from '../storage/SQLiteStorageService';
import { UUIDGenerator } from '../../utils/uuid';
import { Logger } from '../../utils/logger';
import { DateUtils } from '../../utils/date';
import * as os from 'os';

/**
 * Playwright integration for Test Execution Reporting System
 * Automatically captures test execution data and stores it
 */
export class PlaywrightIntegration {
  private static instance: PlaywrightIntegration;
  private readonly logger: Logger;
  private readonly storageService: IStorageService;
  private executionData: IExecutionData | null = null;
  private testResults: ITestResult[] = [];
  private executionStartTime: Date | null = null;

  private constructor() {
    this.logger = new Logger('PlaywrightIntegration');
    
    // Choose storage service based on environment variable
    const storageType = process.env.REPORTING_STORAGE_TYPE || 'sqlite';
    this.storageService = storageType === 'json' 
      ? new JSONStorageService()
      : new SQLiteStorageService();
  }

  static getInstance(): PlaywrightIntegration {
    if (!PlaywrightIntegration.instance) {
      PlaywrightIntegration.instance = new PlaywrightIntegration();
    }
    return PlaywrightIntegration.instance;
  }

  /**
   * Initialize the integration
   */
  async initialize(): Promise<void> {
    try {
      await this.storageService.initialize();
      this.logger.info('Playwright integration initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Playwright integration', error);
      throw error;
    }
  }

  /**
   * Start execution tracking
   */
  async startExecution(): Promise<string> {
    try {
      this.executionStartTime = new Date();
      const executionId = UUIDGenerator.generateTimestampedId();
      
      const metadata: IExecutionMetadata = {
        executionId,
        timestamp: {
          start: this.executionStartTime.toISOString(),
          end: '', // Will be set when execution ends
          duration: 0 // Will be calculated when execution ends
        },
        project: this.getProjectName(),
        squad: this.getSquadName(),
        environment: this.getEnvironment(),
        branch: this.getBranchName(),
        buildNumber: this.getBuildNumber(),
        triggeredBy: {
          type: this.getTriggeredByType(),
          name: this.getTriggeredByName()
        },
        cicd: {
          provider: this.getCICDProvider(),
          runId: this.getCICDRunId(),
          runUrl: this.getCICDRunUrl()
        }
      };

      this.executionData = {
        metadata,
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          notExecuted: 0,
          passRate: 0,
          failRate: 0,
          avgExecutionTime: 0
        },
        testResults: [],
        systemInfo: {
          os: `${os.type()} ${os.release()}`,
          nodeVersion: process.version,
          playwrightVersion: this.getPlaywrightVersion(),
          browserVersions: {} // Will be populated during test execution
        },
        configuration: {
          parallel: this.isParallelExecution(),
          workers: this.getWorkerCount(),
          timeout: this.getTimeout(),
          retries: this.getRetryCount()
        }
      };

      this.testResults = [];
      
      this.logger.executionStart(executionId, metadata.project, metadata.environment);
      return executionId;
    } catch (error) {
      this.logger.error('Failed to start execution tracking', error);
      throw error;
    }
  }

  /**
   * Record test result
   */
  async recordTestResult(testInfo: TestInfo): Promise<void> {
    try {
      if (!this.executionData) {
        this.logger.warn('Execution not started, cannot record test result');
        return;
      }

      const testResult: ITestResult = {
        testCaseId: UUIDGenerator.generateTestCaseId(testInfo.title, testInfo.titlePath[0] || 'Unknown'),
        testName: testInfo.title,
        testSuite: testInfo.titlePath[0] || 'Unknown',
        status: this.mapTestStatus(testInfo.status),
        errorMessage: testInfo.error?.message,
        stackTrace: testInfo.error?.stack,
        executionTime: testInfo.duration,
        retryCount: testInfo.retry,
        browser: this.getBrowserName(testInfo),
        device: this.getDeviceName(testInfo),
        tags: this.extractTags(testInfo),
        screenshots: this.getScreenshots(testInfo),
        videos: this.getVideos(testInfo),
        attachments: this.getAttachments(testInfo)
      };

      this.testResults.push(testResult);
      
      this.logger.testResult(
        testResult.testName,
        testResult.status,
        testResult.executionTime,
        testResult.errorMessage
      );
    } catch (error) {
      this.logger.error('Failed to record test result', error);
    }
  }

  /**
   * End execution tracking and save data
   */
  async endExecution(): Promise<void> {
    try {
      if (!this.executionData || !this.executionStartTime) {
        this.logger.warn('Execution not started, cannot end execution');
        return;
      }

      const endTime = new Date();
      const duration = endTime.getTime() - this.executionStartTime.getTime();

      // Update metadata
      this.executionData.metadata.timestamp.end = endTime.toISOString();
      this.executionData.metadata.timestamp.duration = duration;

      // Update test results
      this.executionData.testResults = this.testResults;

      // Calculate summary
      this.executionData.summary = this.calculateSummary(this.testResults);

      // Save execution data
      await this.storageService.saveExecution(this.executionData);

      this.logger.executionEnd(
        this.executionData.metadata.executionId,
        duration,
        this.executionData.summary
      );

      // Reset for next execution
      this.executionData = null;
      this.testResults = [];
      this.executionStartTime = null;
    } catch (error) {
      this.logger.error('Failed to end execution tracking', error);
      throw error;
    }
  }

  /**
   * Get current execution data
   */
  getCurrentExecution(): IExecutionData | null {
    return this.executionData;
  }

  /**
   * Get storage service instance
   */
  getStorageService(): IStorageService {
    return this.storageService;
  }

  private mapTestStatus(status: string): 'Passed' | 'Failed' | 'Skipped' | 'Not Executed' {
    switch (status) {
      case 'passed':
        return 'Passed';
      case 'failed':
        return 'Failed';
      case 'skipped':
        return 'Skipped';
      case 'timedOut':
        return 'Failed';
      case 'interrupted':
        return 'Not Executed';
      default:
        return 'Not Executed';
    }
  }

  private calculateSummary(testResults: ITestResult[]): IExecutionSummary {
    const total = testResults.length;
    const passed = testResults.filter(t => t.status === 'Passed').length;
    const failed = testResults.filter(t => t.status === 'Failed').length;
    const skipped = testResults.filter(t => t.status === 'Skipped').length;
    const notExecuted = testResults.filter(t => t.status === 'Not Executed').length;

    const passRate = total > 0 ? (passed / total) * 100 : 0;
    const failRate = total > 0 ? (failed / total) * 100 : 0;
    const avgExecutionTime = total > 0 
      ? testResults.reduce((sum, test) => sum + test.executionTime, 0) / total 
      : 0;

    return {
      total,
      passed,
      failed,
      skipped,
      notExecuted,
      passRate,
      failRate,
      avgExecutionTime
    };
  }

  private getProjectName(): string {
    return process.env.PROJECT_NAME || 
           process.env.GITHUB_REPOSITORY?.split('/')[1] || 
           'Unknown Project';
  }

  private getSquadName(): string {
    return process.env.SQUAD_NAME || 
           process.env.TEAM_NAME || 
           'Unknown Squad';
  }

  private getEnvironment(): 'dev' | 'qa' | 'stage' | 'prod' {
    const env = process.env.TEST_ENVIRONMENT || 
                process.env.NODE_ENV || 
                process.env.ENVIRONMENT || 
                'dev';
    
    const normalizedEnv = env.toLowerCase();
    if (['dev', 'development'].includes(normalizedEnv)) return 'dev';
    if (['qa', 'test', 'testing'].includes(normalizedEnv)) return 'qa';
    if (['stage', 'staging', 'preprod'].includes(normalizedEnv)) return 'stage';
    if (['prod', 'production'].includes(normalizedEnv)) return 'prod';
    
    return 'dev';
  }

  private getBranchName(): string {
    return process.env.GITHUB_REF_NAME || 
           process.env.GIT_BRANCH || 
           process.env.BRANCH_NAME || 
           'unknown';
  }

  private getBuildNumber(): string {
    return process.env.GITHUB_RUN_NUMBER || 
           process.env.BUILD_NUMBER || 
           process.env.CI_PIPELINE_ID || 
           Date.now().toString();
  }

  private getTriggeredByType(): 'user' | 'system' | 'schedule' {
    if (process.env.GITHUB_EVENT_NAME === 'schedule') return 'schedule';
    if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') return 'user';
    if (process.env.CI) return 'system';
    return 'user';
  }

  private getTriggeredByName(): string {
    return process.env.GITHUB_ACTOR || 
           process.env.USER || 
           process.env.USERNAME || 
           'unknown';
  }

  private getCICDProvider(): 'github-actions' | 'jenkins' | 'azure-devops' | 'gitlab-ci' {
    if (process.env.GITHUB_ACTIONS) return 'github-actions';
    if (process.env.JENKINS_URL) return 'jenkins';
    if (process.env.AZURE_HTTP_USER_AGENT) return 'azure-devops';
    if (process.env.GITLAB_CI) return 'gitlab-ci';
    return 'github-actions';
  }

  private getCICDRunId(): string {
    return process.env.GITHUB_RUN_ID || 
           process.env.BUILD_ID || 
           process.env.CI_PIPELINE_ID || 
           'unknown';
  }

  private getCICDRunUrl(): string {
    if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID) {
      return `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
    }
    return process.env.BUILD_URL || 
           process.env.CI_PIPELINE_URL || 
           'unknown';
  }

  private getPlaywrightVersion(): string {
    try {
      const packageJson = require('@playwright/test/package.json');
      return packageJson.version;
    } catch {
      return 'unknown';
    }
  }

  private isParallelExecution(): boolean {
    return process.env.PLAYWRIGHT_WORKERS !== '1';
  }

  private getWorkerCount(): number {
    return parseInt(process.env.PLAYWRIGHT_WORKERS || '1', 10);
  }

  private getTimeout(): number {
    return parseInt(process.env.PLAYWRIGHT_TIMEOUT || '30000', 10);
  }

  private getRetryCount(): number {
    return parseInt(process.env.PLAYWRIGHT_RETRIES || '0', 10);
  }

  private getBrowserName(testInfo: TestInfo): string {
    return testInfo.project.name || 'unknown';
  }

  private getDeviceName(testInfo: TestInfo): string {
    return testInfo.project.use?.deviceScaleFactor ? 'mobile' : 'desktop';
  }

  private extractTags(testInfo: TestInfo): string[] {
    const tags: string[] = [];
    
    // Extract tags from test title
    const tagMatches = testInfo.title.match(/@(\w+)/g);
    if (tagMatches) {
      tags.push(...tagMatches.map(tag => tag.substring(1)));
    }

    // Extract tags from annotations
    testInfo.annotations.forEach(annotation => {
      if (annotation.type === 'tag') {
        tags.push(annotation.description || '');
      }
    });

    return tags.filter(tag => tag.length > 0);
  }

  private getScreenshots(testInfo: TestInfo): string[] {
    return testInfo.attachments
      .filter(attachment => attachment.contentType?.startsWith('image/'))
      .map(attachment => attachment.path || attachment.name || '');
  }

  private getVideos(testInfo: TestInfo): string[] {
    return testInfo.attachments
      .filter(attachment => attachment.contentType?.startsWith('video/'))
      .map(attachment => attachment.path || attachment.name || '');
  }

  private getAttachments(testInfo: TestInfo): string[] {
    return testInfo.attachments
      .filter(attachment => 
        !attachment.contentType?.startsWith('image/') && 
        !attachment.contentType?.startsWith('video/')
      )
      .map(attachment => attachment.path || attachment.name || '');
  }
}

/**
 * Extended Playwright test with automatic reporting
 */
export const test = base.extend({
  // Auto-initialize reporting for each test
  reportingIntegration: [async ({}, use) => {
    const integration = PlaywrightIntegration.getInstance();
    await integration.initialize();
    await use(integration);
  }, { scope: 'worker' }],

  // Auto-record test results
  autoRecord: [async ({ reportingIntegration }, use, testInfo) => {
    await use();
    await reportingIntegration.recordTestResult(testInfo);
  }, { auto: true }]
});

/**
 * Global setup hook for execution tracking
 */
export async function globalSetup(): Promise<void> {
  const integration = PlaywrightIntegration.getInstance();
  await integration.initialize();
  await integration.startExecution();
}

/**
 * Global teardown hook for execution tracking
 */
export async function globalTeardown(): Promise<void> {
  const integration = PlaywrightIntegration.getInstance();
  await integration.endExecution();
}

/**
 * Reporter class for Playwright
 */
export class TestExecutionReporter {
  private integration: PlaywrightIntegration;

  constructor() {
    this.integration = PlaywrightIntegration.getInstance();
  }

  async onBegin(): Promise<void> {
    await this.integration.initialize();
    await this.integration.startExecution();
  }

  async onTestEnd(test: any, result: any): Promise<void> {
    // Convert Playwright test result to TestInfo format
    const testInfo = {
      title: test.title,
      titlePath: test.titlePath(),
      status: result.status,
      error: result.error,
      duration: result.duration,
      retry: result.retry,
      project: test.parent.project(),
      annotations: test.annotations || []
    } as any;

    await this.integration.recordTestResult(testInfo);
  }

  async onEnd(): Promise<void> {
    await this.integration.endExecution();
  }
}