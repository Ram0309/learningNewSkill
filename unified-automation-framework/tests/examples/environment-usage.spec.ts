import { test, expect } from '@playwright/test';
import { RegistrationPage } from '../../src/pages/registration-page';
import { envManager } from '../../src/utils/environment-manager';
import { EnhancedUIUtils } from '../../src/utils/ui-utils';

test.describe('Environment Configuration Usage Examples', () => {
  test.beforeEach(async () => {
    // Print current environment configuration
    envManager.printConfigSummary();
  });

  test('should use environment-specific URLs and data', async ({ page, context }) => {
    const registrationPage = new RegistrationPage(page);
    const uiUtils = new EnhancedUIUtils(page, context);

    // Check if registration is enabled in current environment
    if (!registrationPage.isRegistrationEnabled()) {
      test.skip(`Registration is disabled in ${envManager.getCurrentEnvironment()} environment`);
    }

    // Get environment info
    const envInfo = registrationPage.getEnvironmentInfo();
    console.log('Environment Info:', envInfo);

    // Navigate using environment-specific URL
    await registrationPage.navigateToRegistrationPage();

    // Take screenshot with environment name
    await uiUtils.takeScreenshot(`registration-page-${envInfo.environment}`);

    // Use environment-specific test data
    const testUser = registrationPage.getTestUserData();
    console.log('Using test user:', { ...testUser, password: '***' });

    // Fill form with environment-specific data
    await registrationPage.fillRegistrationForm(testUser);

    // Verify form is filled correctly
    const fieldValues = await registrationPage.getFieldValues();
    expect(fieldValues.firstName).toBe(testUser.firstName);
    expect(fieldValues.lastName).toBe(testUser.lastName);
    expect(fieldValues.email).toBe(testUser.email);
  });

  test('should handle different environments correctly', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    // Test with current environment
    const currentEnv = envManager.getCurrentEnvironment();
    console.log(`Testing with environment: ${currentEnv}`);

    // Get environment-specific configuration
    const config = envManager.getConfig();
    console.log('Environment config:', {
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retries: config.retries,
      features: Object.keys(config.features).filter(f => config.features[f].enabled)
    });

    // Navigate to registration page
    await registrationPage.navigateToRegistrationPage();

    // Verify page loads with correct URL
    const currentUrl = page.url();
    expect(currentUrl).toContain(config.baseUrl);

    // Verify page elements are present
    await registrationPage.verifyPageLoaded();
  });

  test('should use environment-specific test data for different scenarios', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    // Skip if registration is disabled
    if (!envManager.isFeatureEnabled('registration')) {
      test.skip(`Registration is disabled in ${envManager.getCurrentEnvironment()} environment`);
    }

    // Get all available test users
    const usersData = envManager.getUsersTestData();
    console.log('Available test users:', Object.keys(usersData));

    // Test with valid user
    const validUser = envManager.getTestData('users', 'validUser');
    console.log('Valid user data:', { ...validUser, password: '***' });

    await registrationPage.navigateToRegistrationPage();
    
    await registrationPage.fillRegistrationForm({
      gender: 'Male',
      firstName: validUser.firstName || 'Test',
      lastName: validUser.lastName || 'User',
      email: validUser.email,
      password: validUser.password,
      confirmPassword: validUser.password
    });

    // Verify form is filled with environment-specific data
    const fieldValues = await registrationPage.getFieldValues();
    expect(fieldValues.email).toBe(validUser.email);
  });

  test('should respect environment restrictions', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    // Check environment restrictions
    const restrictions = envManager.getRestrictions();
    console.log('Environment restrictions:', restrictions);

    if (envManager.isSmokeTestsOnly()) {
      console.log('⚠️ Running in smoke tests only mode');
      // Only run basic navigation test
      await registrationPage.navigateToRegistrationPage();
      await registrationPage.verifyPageLoaded();
      return;
    }

    if (!envManager.isDataModificationAllowed()) {
      console.log('⚠️ Data modification not allowed in this environment');
      // Only test form filling, not submission
      await registrationPage.navigateToRegistrationPage();
      const testUser = registrationPage.getTestUserData();
      await registrationPage.fillRegistrationForm(testUser);
      return;
    }

    // Full test if no restrictions
    await registrationPage.registerWithTestData();
  });

  test('should handle environment switching', async ({ page }) => {
    // Get current environment
    const originalEnv = envManager.getCurrentEnvironment();
    console.log(`Original environment: ${originalEnv}`);

    // Get available environments
    const availableEnvs = envManager.constructor.getAvailableEnvironments();
    console.log('Available environments:', availableEnvs);

    // Test with current environment
    const registrationPage = new RegistrationPage(page);
    
    if (envManager.isFeatureEnabled('registration')) {
      await registrationPage.navigateToRegistrationPage();
      
      // Verify URL matches current environment
      const currentUrl = page.url();
      const expectedBaseUrl = envManager.getBaseUrl();
      expect(currentUrl).toContain(expectedBaseUrl);
      
      console.log(`✅ Successfully tested with ${originalEnv} environment`);
    } else {
      console.log(`⚠️ Registration disabled in ${originalEnv} environment`);
    }
  });

  test('should validate environment configuration', async () => {
    // Validate current environment configuration
    const validation = envManager.validateConfig();
    
    console.log('Configuration validation result:', validation);
    
    if (!validation.valid) {
      console.error('Configuration errors:', validation.errors);
      // In a real scenario, you might want to fail the test
      // throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    } else {
      console.log('✅ Environment configuration is valid');
    }

    // Test specific configuration values
    const config = envManager.getConfig();
    
    // Verify required fields
    expect(config.baseUrl).toBeTruthy();
    expect(config.apiBaseUrl).toBeTruthy();
    expect(config.timeout).toBeGreaterThan(0);
    expect(config.retries).toBeGreaterThanOrEqual(0);

    // Verify URLs are valid
    expect(() => new URL(config.baseUrl)).not.toThrow();
    expect(() => new URL(config.apiBaseUrl)).not.toThrow();
  });

  test('should use environment-specific integrations', async ({ page }) => {
    // Check integration configurations
    const jiraConfig = envManager.getIntegrationConfig('jira');
    const slackConfig = envManager.getIntegrationConfig('slack');
    const browserstackConfig = envManager.getIntegrationConfig('browserstack');
    const awsConfig = envManager.getIntegrationConfig('aws');

    console.log('Integration status:', {
      jira: jiraConfig.enabled,
      slack: slackConfig.enabled,
      browserstack: browserstackConfig.enabled,
      aws: awsConfig.enabled
    });

    // Example: Only run cross-browser tests if BrowserStack is enabled
    if (envManager.isIntegrationEnabled('browserstack')) {
      console.log('✅ BrowserStack integration enabled - can run cross-browser tests');
    } else {
      console.log('⚠️ BrowserStack integration disabled - skipping cross-browser tests');
    }

    // Example: Only create Jira issues if Jira integration is enabled
    if (envManager.isIntegrationEnabled('jira')) {
      console.log(`✅ Jira integration enabled - project: ${jiraConfig.projectKey}`);
    } else {
      console.log('⚠️ Jira integration disabled - no issue creation');
    }

    // Basic test regardless of integrations
    const registrationPage = new RegistrationPage(page);
    if (envManager.isFeatureEnabled('registration')) {
      await registrationPage.navigateToRegistrationPage();
      await registrationPage.verifyPageLoaded();
    }
  });

  test('should use environment-specific performance settings', async ({ page }) => {
    const performanceConfig = envManager.getPerformanceConfig();
    console.log('Performance configuration:', performanceConfig);

    // Use environment-specific timeouts
    const timeout = envManager.getTimeout();
    page.setDefaultTimeout(timeout);
    console.log(`Set page timeout to: ${timeout}ms`);

    // Use environment-specific retry settings
    const retries = envManager.getRetries();
    console.log(`Using ${retries} retries for this environment`);

    // Navigate with environment-specific settings
    const registrationPage = new RegistrationPage(page);
    if (envManager.isFeatureEnabled('registration')) {
      await registrationPage.navigateToRegistrationPage();
      
      // Verify performance thresholds
      const startTime = Date.now();
      await registrationPage.verifyPageLoaded();
      const loadTime = Date.now() - startTime;
      
      console.log(`Page load time: ${loadTime}ms`);
      console.log(`Performance threshold: ${performanceConfig.thresholds.responseTime}ms`);
      
      // In a real scenario, you might want to assert against performance thresholds
      if (loadTime > performanceConfig.thresholds.responseTime) {
        console.warn(`⚠️ Page load time (${loadTime}ms) exceeds threshold (${performanceConfig.thresholds.responseTime}ms)`);
      } else {
        console.log(`✅ Page load time within acceptable threshold`);
      }
    }
  });
});