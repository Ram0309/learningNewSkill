import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Unified Playwright Configuration
 * Supports Web, Mobile, API, Performance, Security, and Database testing
 */
export default defineConfig({
  // Test directory structure
  testDir: './tests',
  
  // Global test configuration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['allure-playwright', { 
      detail: true, 
      outputFolder: 'allure-results',
      suiteTitle: false 
    }],
    ['./src/reporters/custom-reporter.ts'],
    ['./src/reporters/slack-reporter.ts'],
    ['./src/reporters/analytics-reporter.ts']
  ],

  // Global test settings
  use: {
    // Base URL for web tests
    baseURL: process.env.BASE_URL || 'https://demo.playwright.dev',
    
    // API base URL
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    
    // Tracing and debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts
    actionTimeout: 30000,
    navigationTimeout: 60000,
    
    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Ignore HTTPS errors for testing
    ignoreHTTPSErrors: true,
    
    // Custom test data
    storageState: process.env.STORAGE_STATE,
  },

  // Test timeout
  timeout: 120000,
  expect: {
    timeout: 10000,
    toHaveScreenshot: { 
      threshold: 0.2, 
      mode: 'strict' 
    },
    toMatchSnapshot: { 
      threshold: 0.2 
    }
  },

  // Project configurations for different test types and browsers
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    
    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },

    // ============ WEB UI TESTING ============
    {
      name: 'chromium-ui',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
      testMatch: /.*\.(ui|web)\.spec\.ts/,
      dependencies: ['setup'],
    },

    {
      name: 'firefox-ui',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: /.*\.(ui|web)\.spec\.ts/,
      dependencies: ['setup'],
    },

    {
      name: 'webkit-ui',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: /.*\.(ui|web)\.spec\.ts/,
      dependencies: ['setup'],
    },

    {
      name: 'edge-ui',
      use: { 
        ...devices['Desktop Edge'],
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: /.*\.(ui|web)\.spec\.ts/,
      dependencies: ['setup'],
    },

    // ============ MOBILE TESTING ============
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        hasTouch: true,
        isMobile: true,
      },
      testMatch: /.*\.mobile\.spec\.ts/,
      dependencies: ['setup'],
    },

    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        hasTouch: true,
        isMobile: true,
      },
      testMatch: /.*\.mobile\.spec\.ts/,
      dependencies: ['setup'],
    },

    {
      name: 'tablet-ipad',
      use: { 
        ...devices['iPad Pro'],
        hasTouch: true,
      },
      testMatch: /.*\.(mobile|tablet)\.spec\.ts/,
      dependencies: ['setup'],
    },

    // ============ API TESTING ============
    {
      name: 'api-tests',
      use: {
        baseURL: process.env.API_BASE_URL || 'https://api.demo.playwright.dev',
        extraHTTPHeaders: {
          'Authorization': `Bearer ${process.env.API_TOKEN}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      },
      testMatch: /.*\.api\.spec\.ts/,
    },

    // ============ DATABASE TESTING ============
    {
      name: 'database-tests',
      use: {
        // Database connection will be handled in test setup
      },
      testMatch: /.*\.database\.spec\.ts/,
    },

    // ============ PERFORMANCE TESTING ============
    {
      name: 'performance-tests',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security', '--no-sandbox']
        }
      },
      testMatch: /.*\.performance\.spec\.ts/,
      timeout: 300000, // 5 minutes for performance tests
    },

    // ============ SECURITY TESTING ============
    {
      name: 'security-tests',
      use: {
        ...devices['Desktop Chrome'],
        ignoreHTTPSErrors: true,
      },
      testMatch: /.*\.security\.spec\.ts/,
      timeout: 180000, // 3 minutes for security tests
    },

    // ============ CROSS-BROWSER COMPATIBILITY ============
    {
      name: 'cross-browser',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.cross-browser\.spec\.ts/,
      dependencies: ['setup'],
    },

    // ============ ACCESSIBILITY TESTING ============
    {
      name: 'accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable accessibility tree
        launchOptions: {
          args: ['--force-renderer-accessibility']
        }
      },
      testMatch: /.*\.accessibility\.spec\.ts/,
      dependencies: ['setup'],
    },

    // ============ VISUAL REGRESSION TESTING ============
    {
      name: 'visual-regression',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: /.*\.visual\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],

  // Web server configuration for local development
  webServer: process.env.CI ? undefined : {
    command: 'npm run start:test-server',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Global setup and teardown
  globalSetup: require.resolve('./src/setup/global-setup.ts'),
  globalTeardown: require.resolve('./src/setup/global-teardown.ts'),

  // Test metadata
  metadata: {
    framework: 'Unified Automation Framework',
    version: '1.0.0',
    environment: process.env.TEST_ENVIRONMENT || 'local',
    cloud: process.env.CLOUD_PROVIDER || 'local',
    region: process.env.CLOUD_REGION || 'us-east-1',
  },
});