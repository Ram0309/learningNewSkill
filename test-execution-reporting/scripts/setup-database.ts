#!/usr/bin/env ts-node

/**
 * Database Setup Script
 * Initializes SQLite database with sample data for development and testing
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { SQLiteStorageService } from '../src/services/storage/SQLiteStorageService';
import { IExecutionData } from '../src/core/interfaces/IExecutionData';
import { UUIDGenerator } from '../src/utils/uuid';
import { Logger } from '../src/utils/logger';
import { DateUtils } from '../src/utils/date';

class DatabaseSetup {
  private readonly logger: Logger;
  private readonly storageService: SQLiteStorageService;

  constructor(dbPath: string = './data/execution-history.db') {
    this.logger = new Logger('DatabaseSetup');
    this.storageService = new SQLiteStorageService(dbPath);
  }

  async setup(): Promise<void> {
    try {
      this.logger.info('Starting database setup...');

      // Initialize storage service
      await this.storageService.initialize();

      // Generate sample data
      const sampleExecutions = await this.generateSampleData();

      // Save sample executions
      for (const execution of sampleExecutions) {
        await this.storageService.saveExecution(execution);
      }

      this.logger.info(`Database setup completed with ${sampleExecutions.length} sample executions`);
    } catch (error) {
      this.logger.error('Database setup failed', error);
      throw error;
    }
  }

  private async generateSampleData(): Promise<IExecutionData[]> {
    const executions: IExecutionData[] = [];
    const projects = ['E-commerce Platform', 'Banking System', 'Healthcare Portal', 'CRM Application'];
    const squads = ['QA-Automation', 'Frontend-Team', 'Backend-Team', 'DevOps-Team'];
    const environments = ['dev', 'qa', 'stage', 'prod'] as const;
    const browsers = ['chromium', 'firefox', 'webkit'];
    const testSuites = ['Login Tests', 'Registration Tests', 'Payment Tests', 'Search Tests', 'Profile Tests'];

    // Generate executions for the last 30 days
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const executionDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      
      // Generate 1-5 executions per day
      const executionsPerDay = Math.floor(Math.random() * 5) + 1;
      
      for (let j = 0; j < executionsPerDay; j++) {
        const execution = await this.generateSampleExecution(
          executionDate,
          projects[Math.floor(Math.random() * projects.length)],
          squads[Math.floor(Math.random() * squads.length)],
          environments[Math.floor(Math.random() * environments.length)],
          browsers[Math.floor(Math.random() * browsers.length)]
        );
        
        executions.push(execution);
      }
    }

    return executions.sort((a, b) => 
      new Date(b.metadata.timestamp.start).getTime() - 
      new Date(a.metadata.timestamp.start).getTime()
    );
  }

  private async generateSampleExecution(
    date: Date,
    project: string,
    squad: string,
    environment: 'dev' | 'qa' | 'stage' | 'prod',
    browser: string
  ): Promise<IExecutionData> {
    const executionId = UUIDGenerator.generateTimestampedId();
    const startTime = new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000);
    const duration = 120000 + Math.random() * 600000; // 2-12 minutes
    const endTime = new Date(startTime.getTime() + duration);

    // Generate test results
    const testCount = 20 + Math.floor(Math.random() * 80); // 20-100 tests
    const testResults = [];
    
    for (let i = 0; i < testCount; i++) {
      const testResult = this.generateSampleTestResult(executionId, browser, i);
      testResults.push(testResult);
    }

    // Calculate summary
    const passed = testResults.filter(t => t.status === 'Passed').length;
    const failed = testResults.filter(t => t.status === 'Failed').length;
    const skipped = testResults.filter(t => t.status === 'Skipped').length;
    const notExecuted = testResults.filter(t => t.status === 'Not Executed').length;
    const total = testResults.length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    const failRate = total > 0 ? (failed / total) * 100 : 0;
    const avgExecutionTime = testResults.reduce((sum, test) => sum + test.executionTime, 0) / total;

    const execution: IExecutionData = {
      metadata: {
        executionId,
        timestamp: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          duration
        },
        project,
        squad,
        environment,
        branch: this.getRandomBranch(),
        buildNumber: this.getRandomBuildNumber(),
        triggeredBy: {
          type: Math.random() > 0.7 ? 'schedule' : Math.random() > 0.5 ? 'user' : 'system',
          name: this.getRandomUser()
        },
        cicd: {
          provider: 'github-actions',
          runId: Math.floor(Math.random() * 10000).toString(),
          runUrl: `https://github.com/company/project/actions/runs/${Math.floor(Math.random() * 10000)}`
        }
      },
      summary: {
        total,
        passed,
        failed,
        skipped,
        notExecuted,
        passRate,
        failRate,
        avgExecutionTime
      },
      testResults,
      systemInfo: {
        os: 'Ubuntu 20.04',
        nodeVersion: 'v18.17.0',
        playwrightVersion: '1.40.0',
        browserVersions: {
          [browser]: this.getRandomBrowserVersion(browser)
        }
      },
      configuration: {
        parallel: Math.random() > 0.3,
        workers: Math.floor(Math.random() * 8) + 1,
        timeout: 30000,
        retries: Math.floor(Math.random() * 3)
      }
    };

    return execution;
  }

  private generateSampleTestResult(executionId: string, browser: string, index: number): any {
    const testSuites = ['Login Tests', 'Registration Tests', 'Payment Tests', 'Search Tests', 'Profile Tests'];
    const testNames = [
      'should login with valid credentials',
      'should show error for invalid credentials',
      'should register new user successfully',
      'should validate required fields',
      'should process payment correctly',
      'should handle payment failures',
      'should search products by keyword',
      'should filter search results',
      'should update profile information',
      'should change password successfully'
    ];

    const suite = testSuites[Math.floor(Math.random() * testSuites.length)];
    const name = testNames[Math.floor(Math.random() * testNames.length)];
    
    // Determine test status with realistic distribution
    let status: 'Passed' | 'Failed' | 'Skipped' | 'Not Executed';
    const rand = Math.random();
    if (rand < 0.85) status = 'Passed';
    else if (rand < 0.95) status = 'Failed';
    else if (rand < 0.98) status = 'Skipped';
    else status = 'Not Executed';

    const executionTime = 1000 + Math.random() * 10000; // 1-11 seconds
    const retryCount = status === 'Failed' ? Math.floor(Math.random() * 3) : 0;

    const result = {
      testCaseId: UUIDGenerator.generateTestCaseId(name, suite),
      testName: name,
      testSuite: suite,
      status,
      executionTime,
      retryCount,
      browser,
      device: Math.random() > 0.8 ? 'mobile' : 'desktop',
      tags: this.getRandomTags(),
      screenshots: status === 'Failed' ? [`screenshot-${index}-${Date.now()}.png`] : [],
      videos: status === 'Failed' ? [`video-${index}-${Date.now()}.webm`] : [],
      attachments: []
    };

    // Add error details for failed tests
    if (status === 'Failed') {
      result['errorMessage'] = this.getRandomErrorMessage();
      result['stackTrace'] = this.getRandomStackTrace();
    }

    return result;
  }

  private getRandomBranch(): string {
    const branches = ['main', 'develop', 'feature/user-auth', 'feature/payment-gateway', 'bugfix/login-issue'];
    return branches[Math.floor(Math.random() * branches.length)];
  }

  private getRandomBuildNumber(): string {
    return Math.floor(Math.random() * 10000).toString();
  }

  private getRandomUser(): string {
    const users = ['john.doe', 'jane.smith', 'mike.johnson', 'sarah.wilson', 'github-actions[bot]'];
    return users[Math.floor(Math.random() * users.length)];
  }

  private getRandomBrowserVersion(browser: string): string {
    const versions = {
      chromium: ['119.0.6045.105', '118.0.5993.88', '117.0.5938.92'],
      firefox: ['119.0', '118.0.2', '117.0.1'],
      webkit: ['17.0', '16.6', '16.5']
    };
    const browserVersions = versions[browser as keyof typeof versions] || ['1.0.0'];
    return browserVersions[Math.floor(Math.random() * browserVersions.length)];
  }

  private getRandomTags(): string[] {
    const allTags = ['smoke', 'regression', 'critical', 'high', 'medium', 'low', 'api', 'ui', 'integration'];
    const tagCount = Math.floor(Math.random() * 3) + 1;
    const selectedTags = [];
    
    for (let i = 0; i < tagCount; i++) {
      const tag = allTags[Math.floor(Math.random() * allTags.length)];
      if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
      }
    }
    
    return selectedTags;
  }

  private getRandomErrorMessage(): string {
    const errors = [
      'Element not found: [data-testid="login-button"]',
      'Timeout exceeded: Page did not load within 30 seconds',
      'Assertion failed: Expected "Welcome" but got "Error"',
      'Network error: Failed to fetch data from API',
      'JavaScript error: Cannot read property of undefined',
      'Page crashed: Renderer process terminated',
      'Element is not clickable at point (100, 200)',
      'Invalid selector: Unable to locate element',
      'Connection refused: Server is not responding',
      'Authentication failed: Invalid credentials provided'
    ];
    return errors[Math.floor(Math.random() * errors.length)];
  }

  private getRandomStackTrace(): string {
    return `
    at Object.<anonymous> (/tests/login.spec.ts:25:5)
    at Promise.then.completed (/node_modules/@playwright/test/lib/index.js:123:28)
    at new Promise (<anonymous>)
    at callFn (/node_modules/@playwright/test/lib/index.js:122:12)
    at Test.Runnable.run (/node_modules/@playwright/test/lib/index.js:375:7)
    at Runner.runTest (/node_modules/@playwright/test/lib/index.js:468:10)
    at /node_modules/@playwright/test/lib/index.js:541:12
    at next (/node_modules/@playwright/test/lib/index.js:456:14)
    at /node_modules/@playwright/test/lib/index.js:464:7
    at new Promise (<anonymous>)
    `.trim();
  }

  async cleanup(): Promise<void> {
    try {
      // Optional: Clean up old data
      this.logger.info('Cleaning up old test data...');
      
      // This could include removing executions older than X days
      // For now, we'll just log the action
      
      this.logger.info('Cleanup completed');
    } catch (error) {
      this.logger.error('Cleanup failed', error);
    }
  }

  async validateSetup(): Promise<boolean> {
    try {
      const executionCount = await this.storageService.getExecutionCount();
      const healthCheck = await this.storageService.healthCheck();
      
      this.logger.info(`Database validation: ${executionCount} executions, healthy: ${healthCheck}`);
      
      return healthCheck && executionCount > 0;
    } catch (error) {
      this.logger.error('Database validation failed', error);
      return false;
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const dbPath = args[0] || './data/execution-history.db';
  const command = args[1] || 'setup';

  console.log('🗄️ Database Setup Tool');
  console.log(`📁 Database Path: ${dbPath}`);
  console.log(`🔧 Command: ${command}`);
  console.log('');

  const setup = new DatabaseSetup(dbPath);

  try {
    switch (command) {
      case 'setup':
        await setup.setup();
        break;
      case 'cleanup':
        await setup.cleanup();
        break;
      case 'validate':
        const isValid = await setup.validateSetup();
        console.log(`✅ Database is ${isValid ? 'valid' : 'invalid'}`);
        process.exit(isValid ? 0 : 1);
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Available commands: setup, cleanup, validate');
        process.exit(1);
    }

    console.log('');
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { DatabaseSetup };

// Run if called directly
if (require.main === module) {
  main();
}