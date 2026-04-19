import { test as base, expect, Page, APIRequestContext, BrowserContext } from '@playwright/test';
import { DatabaseManager } from './database/database-manager';
import { APIManager } from './api/api-manager';
import { PerformanceManager } from './performance/performance-manager';
import { SecurityManager } from './security/security-manager';
import { SelfHealingManager } from './self-healing/self-healing-manager';
import { CloudManager } from './cloud/cloud-manager';
import { ReportingManager } from './reporting/reporting-manager';
import { TestDataManager } from './data/test-data-manager';
import { ConfigManager } from './config/config-manager';
import { Logger } from './utils/logger';

// Extended test fixtures with all framework capabilities
type TestFixtures = {
  // Core Playwright fixtures
  page: Page;
  context: BrowserContext;
  request: APIRequestContext;
  
  // Framework managers
  db: DatabaseManager;
  api: APIManager;
  performance: PerformanceManager;
  security: SecurityManager;
  selfHealing: SelfHealingManager;
  cloud: CloudManager;
  reporting: ReportingManager;
  testData: TestDataManager;
  config: ConfigManager;
  logger: Logger;
  
  // Enhanced page with self-healing capabilities
  healingPage: Page;
  
  // Mobile-specific fixtures
  mobileContext: BrowserContext;
  mobilePage: Page;
  
  // Performance monitoring
  performancePage: Page;
  
  // Security testing context
  securityContext: BrowserContext;
  
  // Database connections
  primaryDb: any;
  readOnlyDb: any;
  
  // Test environment data
  testEnvironment: string;
  cloudProvider: string;
};

// Worker-scoped fixtures (shared across tests in same worker)
type WorkerFixtures = {
  workerStorageState: string;
  workerDatabase: DatabaseManager;
  workerCloud: CloudManager;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // ============ WORKER FIXTURES ============
  workerStorageState: [async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Perform authentication once per worker
    await page.goto('/login');
    await page.fill('[data-testid="username"]', process.env.TEST_USERNAME || 'testuser');
    await page.fill('[data-testid="password"]', process.env.TEST_PASSWORD || 'testpass');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Save authentication state
    const storageState = await context.storageState();
    await context.close();
    
    await use(JSON.stringify(storageState));
  }, { scope: 'worker' }],

  workerDatabase: [async ({}, use) => {
    const db = new DatabaseManager();
    await db.initialize();
    await use(db);
    await db.cleanup();
  }, { scope: 'worker' }],

  workerCloud: [async ({}, use) => {
    const cloud = new CloudManager();
    await cloud.initialize();
    await use(cloud);
    await cloud.cleanup();
  }, { scope: 'worker' }],

  // ============ TEST FIXTURES ============
  
  // Configuration Manager
  config: async ({}, use) => {
    const config = new ConfigManager();
    await config.load();
    await use(config);
  },

  // Logger
  logger: async ({ config }, use) => {
    const logger = new Logger(config.get('logging'));
    await use(logger);
  },

  // Test Data Manager
  testData: async ({ config, logger }, use) => {
    const testData = new TestDataManager(config, logger);
    await testData.initialize();
    await use(testData);
    await testData.cleanup();
  },

  // Database Manager
  db: async ({ workerDatabase, logger }, use) => {
    await use(workerDatabase);
  },

  // Primary Database Connection
  primaryDb: async ({ db }, use) => {
    const connection = await db.getPrimaryConnection();
    await use(connection);
  },

  // Read-Only Database Connection
  readOnlyDb: async ({ db }, use) => {
    const connection = await db.getReadOnlyConnection();
    await use(connection);
  },

  // API Manager
  api: async ({ request, config, logger }, use) => {
    const api = new APIManager(request, config, logger);
    await use(api);
  },

  // Performance Manager
  performance: async ({ config, logger }, use) => {
    const performance = new PerformanceManager(config, logger);
    await performance.initialize();
    await use(performance);
    await performance.finalize();
  },

  // Security Manager
  security: async ({ config, logger }, use) => {
    const security = new SecurityManager(config, logger);
    await security.initialize();
    await use(security);
  },

  // Self-Healing Manager
  selfHealing: async ({ config, logger }, use) => {
    const selfHealing = new SelfHealingManager(config, logger);
    await selfHealing.initialize();
    await use(selfHealing);
  },

  // Cloud Manager
  cloud: async ({ workerCloud }, use) => {
    await use(workerCloud);
  },

  // Reporting Manager
  reporting: async ({ config, logger }, use) => {
    const reporting = new ReportingManager(config, logger);
    await reporting.initialize();
    await use(reporting);
    await reporting.finalize();
  },

  // Enhanced Page with Self-Healing
  healingPage: async ({ browser, workerStorageState, selfHealing, logger }, use) => {
    const context = await browser.newContext({
      storageState: JSON.parse(workerStorageState)
    });
    
    const page = await context.newPage();
    
    // Enhance page with self-healing capabilities
    await selfHealing.enhancePage(page);
    
    // Add error handling and recovery
    page.on('pageerror', async (error) => {
      logger.error('Page error detected:', error);
      await selfHealing.handlePageError(page, error);
    });
    
    await use(page);
    await context.close();
  },

  // Mobile Context
  mobileContext: async ({ browser, workerStorageState }, use) => {
    const context = await browser.newContext({
      ...base.devices['iPhone 13'],
      storageState: JSON.parse(workerStorageState)
    });
    
    await use(context);
    await context.close();
  },

  // Mobile Page
  mobilePage: async ({ mobileContext }, use) => {
    const page = await mobileContext.newPage();
    await use(page);
  },

  // Performance Page with monitoring
  performancePage: async ({ browser, workerStorageState, performance }, use) => {
    const context = await browser.newContext({
      storageState: JSON.parse(workerStorageState)
    });
    
    const page = await context.newPage();
    
    // Enable performance monitoring
    await performance.enableMonitoring(page);
    
    await use(page);
    
    // Collect performance metrics
    await performance.collectMetrics(page);
    await context.close();
  },

  // Security Context with enhanced settings
  securityContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      extraHTTPHeaders: {
        'X-Security-Test': 'true'
      }
    });
    
    await use(context);
    await context.close();
  },

  // Test Environment
  testEnvironment: async ({ config }, use) => {
    await use(config.get('environment') || 'local');
  },

  // Cloud Provider
  cloudProvider: async ({ config }, use) => {
    await use(config.get('cloud.provider') || 'local');
  },
});

// Enhanced expect with custom matchers
export { expect } from '@playwright/test';

// Custom expect matchers
expect.extend({
  // Database assertion
  async toHaveRecordInDatabase(received: any, table: string, condition: object) {
    const db = new DatabaseManager();
    await db.initialize();
    
    const record = await db.findRecord(table, condition);
    const pass = !!record;
    
    await db.cleanup();
    
    return {
      message: () => pass 
        ? `Expected not to find record in ${table} with condition ${JSON.stringify(condition)}`
        : `Expected to find record in ${table} with condition ${JSON.stringify(condition)}`,
      pass,
    };
  },

  // API response assertion
  async toHaveValidAPIResponse(received: any, schema: object) {
    const api = new APIManager(null as any, null as any, null as any);
    const isValid = await api.validateSchema(received, schema);
    
    return {
      message: () => isValid 
        ? `Expected API response not to match schema`
        : `Expected API response to match schema`,
      pass: isValid,
    };
  },

  // Performance assertion
  async toMeetPerformanceThreshold(received: any, metric: string, threshold: number) {
    const performance = new PerformanceManager(null as any, null as any);
    const meetsThreshold = await performance.checkThreshold(received, metric, threshold);
    
    return {
      message: () => meetsThreshold 
        ? `Expected ${metric} not to meet threshold of ${threshold}`
        : `Expected ${metric} to meet threshold of ${threshold}`,
      pass: meetsThreshold,
    };
  },

  // Security assertion
  async toBeSecure(received: any, securityChecks: string[]) {
    const security = new SecurityManager(null as any, null as any);
    const isSecure = await security.runSecurityChecks(received, securityChecks);
    
    return {
      message: () => isSecure 
        ? `Expected security vulnerabilities to be found`
        : `Expected no security vulnerabilities`,
      pass: isSecure,
    };
  },
});

// Test decorators for different test types
export const uiTest = test.extend({
  page: async ({ healingPage }, use) => {
    await use(healingPage);
  },
});

export const apiTest = test.extend({
  // API-specific setup
});

export const mobileTest = test.extend({
  page: async ({ mobilePage }, use) => {
    await use(mobilePage);
  },
});

export const performanceTest = test.extend({
  page: async ({ performancePage }, use) => {
    await use(performancePage);
  },
});

export const securityTest = test.extend({
  context: async ({ securityContext }, use) => {
    await use(securityContext);
  },
});

export const databaseTest = test.extend({
  // Database-specific setup
});

// Export all managers for direct use
export {
  DatabaseManager,
  APIManager,
  PerformanceManager,
  SecurityManager,
  SelfHealingManager,
  CloudManager,
  ReportingManager,
  TestDataManager,
  ConfigManager,
  Logger,
};