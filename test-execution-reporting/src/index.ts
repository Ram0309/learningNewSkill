/**
 * Test Execution Reporting System - Main Entry Point
 * Enterprise-grade reporting system for automation testing
 */

// Core interfaces
export * from './core/interfaces/IExecutionData';
export * from './core/interfaces/IStorageService';

// Storage services
export { SQLiteStorageService } from './services/storage/SQLiteStorageService';
export { JSONStorageService } from './services/storage/JSONStorageService';

// Export services
export { ExcelExportService } from './services/export/ExcelExportService';
export { CSVExportService } from './services/export/CSVExportService';

// Integration services
export { PlaywrightIntegration, test, globalSetup, globalTeardown, TestExecutionReporter } from './services/integration/PlaywrightIntegration';

// Utilities
export { Logger } from './utils/logger';
export { UUIDGenerator } from './utils/uuid';
export { DateUtils } from './utils/date';

// Main reporting system class
export class TestExecutionReportingSystem {
  private storageService: any;
  private exportService: any;
  private integration: any;

  constructor(config: {
    storageType?: 'sqlite' | 'json';
    storagePath?: string;
    enablePlaywrightIntegration?: boolean;
  } = {}) {
    const {
      storageType = 'sqlite',
      storagePath = './data/execution-history.db',
      enablePlaywrightIntegration = true
    } = config;

    // Initialize storage service
    if (storageType === 'sqlite') {
      this.storageService = new (require('./services/storage/SQLiteStorageService').SQLiteStorageService)(storagePath);
    } else {
      this.storageService = new (require('./services/storage/JSONStorageService').JSONStorageService)(storagePath);
    }

    // Initialize export service
    this.exportService = new (require('./services/export/ExcelExportService').ExcelExportService)();

    // Initialize Playwright integration if enabled
    if (enablePlaywrightIntegration) {
      this.integration = require('./services/integration/PlaywrightIntegration').PlaywrightIntegration.getInstance();
    }
  }

  async initialize(): Promise<void> {
    await this.storageService.initialize();
    
    if (this.integration) {
      await this.integration.initialize();
    }
  }

  getStorageService() {
    return this.storageService;
  }

  getExportService() {
    return this.exportService;
  }

  getIntegration() {
    return this.integration;
  }
}

// Default export
export default TestExecutionReportingSystem;