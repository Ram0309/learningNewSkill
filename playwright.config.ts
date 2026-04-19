import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Enterprise Playwright Configuration
 * Supports cross-browser testing, mobile testing, and CI/CD integration
 */
export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Global test timeout
  timeout: 60000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 10000,
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { 
      outputFile: 'test-results/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/junit-results.xml' 
    }],
    ['allure-playwright', {
      detail: true,
      outputFolder: 'allure-results',
      suiteTitle: false,
    }],
    ['line'],
    ...(process.env.CI ? [['github']] : [])
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: 'https://demowebshop.tricentis.com',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Global test timeout
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Accept downloads
    acceptDownloads: true,
    
    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // User agent
    userAgent: 'Playwright-Enterprise-Test-Framework/1.0.0',
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome-specific settings
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-dev-shm-usage',
            '--no-sandbox'
          ]
        }
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'security.tls.insecure_fallback_hosts': 'localhost',
            'network.stricttransportsecurity.preloadlist': false
          }
        }
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // Safari-specific settings
      },
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
      },
    },

    // Tablet browsers
    {
      name: 'tablet-chrome',
      use: { 
        ...devices['Galaxy Tab S4'],
      },
    },
    {
      name: 'tablet-safari',
      use: { 
        ...devices['iPad Pro'],
      },
    },

    // Microsoft Edge
    {
      name: 'msedge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge' 
      },
    },

    // Google Chrome
    {
      name: 'chrome',
      use: { 
        ...devices['Desktop Chrome'], 
        channel: 'chrome' 
      },
    },

    // Branded browsers for enterprise testing
    {
      name: 'enterprise-chrome',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images'
          ]
        }
      },
    },

    // Headless mode for CI/CD
    {
      name: 'headless-chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
  ],

  // Output directory for test artifacts
  outputDir: 'test-results/',

  // Web server configuration for local development
  // webServer: process.env.CI ? undefined : {
  //   command: 'npm run start:mock-server',
  //   port: 3000,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },

  // Test metadata
  metadata: {
    'test-framework': 'Playwright',
    'framework-version': '1.40.0',
    'enterprise-features': [
      'Cross-browser testing',
      'Mobile testing',
      'API testing',
      'Performance testing',
      'Security testing',
      'Multi-tenant support',
      'CI/CD integration'
    ]
  },

  // Test patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/*.e2e.ts'
  ],

  // Test ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**'
  ],

  // Maximum failures before stopping
  maxFailures: process.env.CI ? 10 : undefined,

  // Update snapshots in non-CI environments
  updateSnapshots: process.env.CI ? 'none' : 'missing',

  // Preserve output on exit
  preserveOutput: 'failures-only',

  // Shard configuration for parallel execution
  shard: process.env.SHARD ? {
    current: parseInt(process.env.SHARD_INDEX || '1'),
    total: parseInt(process.env.SHARD_TOTAL || '1')
  } : undefined,
});