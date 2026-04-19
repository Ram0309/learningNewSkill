"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const registration_page_1 = require("../../src/pages/registration-page");
const environment_manager_1 = require("../../src/utils/environment-manager");
const ui_utils_1 = require("../../src/utils/ui-utils");
test_1.test.describe('Environment Configuration Usage Examples', () => {
    test_1.test.beforeEach(async () => {
        // Print current environment configuration
        environment_manager_1.envManager.printConfigSummary();
    });
    (0, test_1.test)('should use environment-specific URLs and data', async ({ page, context }) => {
        const registrationPage = new registration_page_1.RegistrationPage(page);
        const uiUtils = new ui_utils_1.EnhancedUIUtils(page, context);
        // Check if registration is enabled in current environment
        if (!registrationPage.isRegistrationEnabled()) {
            test_1.test.skip(`Registration is disabled in ${environment_manager_1.envManager.getCurrentEnvironment()} environment`);
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
        (0, test_1.expect)(fieldValues.firstName).toBe(testUser.firstName);
        (0, test_1.expect)(fieldValues.lastName).toBe(testUser.lastName);
        (0, test_1.expect)(fieldValues.email).toBe(testUser.email);
    });
    (0, test_1.test)('should handle different environments correctly', async ({ page }) => {
        const registrationPage = new registration_page_1.RegistrationPage(page);
        // Test with current environment
        const currentEnv = environment_manager_1.envManager.getCurrentEnvironment();
        console.log(`Testing with environment: ${currentEnv}`);
        // Get environment-specific configuration
        const config = environment_manager_1.envManager.getConfig();
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
        (0, test_1.expect)(currentUrl).toContain(config.baseUrl);
        // Verify page elements are present
        await registrationPage.verifyPageLoaded();
    });
    (0, test_1.test)('should use environment-specific test data for different scenarios', async ({ page }) => {
        const registrationPage = new registration_page_1.RegistrationPage(page);
        // Skip if registration is disabled
        if (!environment_manager_1.envManager.isFeatureEnabled('registration')) {
            test_1.test.skip(`Registration is disabled in ${environment_manager_1.envManager.getCurrentEnvironment()} environment`);
        }
        // Get all available test users
        const usersData = environment_manager_1.envManager.getUsersTestData();
        console.log('Available test users:', Object.keys(usersData));
        // Test with valid user
        const validUser = environment_manager_1.envManager.getTestData('users', 'validUser');
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
        (0, test_1.expect)(fieldValues.email).toBe(validUser.email);
    });
    (0, test_1.test)('should respect environment restrictions', async ({ page }) => {
        const registrationPage = new registration_page_1.RegistrationPage(page);
        // Check environment restrictions
        const restrictions = environment_manager_1.envManager.getRestrictions();
        console.log('Environment restrictions:', restrictions);
        if (environment_manager_1.envManager.isSmokeTestsOnly()) {
            console.log('⚠️ Running in smoke tests only mode');
            // Only run basic navigation test
            await registrationPage.navigateToRegistrationPage();
            await registrationPage.verifyPageLoaded();
            return;
        }
        if (!environment_manager_1.envManager.isDataModificationAllowed()) {
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
    (0, test_1.test)('should handle environment switching', async ({ page }) => {
        // Get current environment
        const originalEnv = environment_manager_1.envManager.getCurrentEnvironment();
        console.log(`Original environment: ${originalEnv}`);
        // Get available environments
        const availableEnvs = environment_manager_1.envManager.constructor.getAvailableEnvironments();
        console.log('Available environments:', availableEnvs);
        // Test with current environment
        const registrationPage = new registration_page_1.RegistrationPage(page);
        if (environment_manager_1.envManager.isFeatureEnabled('registration')) {
            await registrationPage.navigateToRegistrationPage();
            // Verify URL matches current environment
            const currentUrl = page.url();
            const expectedBaseUrl = environment_manager_1.envManager.getBaseUrl();
            (0, test_1.expect)(currentUrl).toContain(expectedBaseUrl);
            console.log(`✅ Successfully tested with ${originalEnv} environment`);
        }
        else {
            console.log(`⚠️ Registration disabled in ${originalEnv} environment`);
        }
    });
    (0, test_1.test)('should validate environment configuration', async () => {
        // Validate current environment configuration
        const validation = environment_manager_1.envManager.validateConfig();
        console.log('Configuration validation result:', validation);
        if (!validation.valid) {
            console.error('Configuration errors:', validation.errors);
            // In a real scenario, you might want to fail the test
            // throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }
        else {
            console.log('✅ Environment configuration is valid');
        }
        // Test specific configuration values
        const config = environment_manager_1.envManager.getConfig();
        // Verify required fields
        (0, test_1.expect)(config.baseUrl).toBeTruthy();
        (0, test_1.expect)(config.apiBaseUrl).toBeTruthy();
        (0, test_1.expect)(config.timeout).toBeGreaterThan(0);
        (0, test_1.expect)(config.retries).toBeGreaterThanOrEqual(0);
        // Verify URLs are valid
        (0, test_1.expect)(() => new URL(config.baseUrl)).not.toThrow();
        (0, test_1.expect)(() => new URL(config.apiBaseUrl)).not.toThrow();
    });
    (0, test_1.test)('should use environment-specific integrations', async ({ page }) => {
        // Check integration configurations
        const jiraConfig = environment_manager_1.envManager.getIntegrationConfig('jira');
        const slackConfig = environment_manager_1.envManager.getIntegrationConfig('slack');
        const browserstackConfig = environment_manager_1.envManager.getIntegrationConfig('browserstack');
        const awsConfig = environment_manager_1.envManager.getIntegrationConfig('aws');
        console.log('Integration status:', {
            jira: jiraConfig.enabled,
            slack: slackConfig.enabled,
            browserstack: browserstackConfig.enabled,
            aws: awsConfig.enabled
        });
        // Example: Only run cross-browser tests if BrowserStack is enabled
        if (environment_manager_1.envManager.isIntegrationEnabled('browserstack')) {
            console.log('✅ BrowserStack integration enabled - can run cross-browser tests');
        }
        else {
            console.log('⚠️ BrowserStack integration disabled - skipping cross-browser tests');
        }
        // Example: Only create Jira issues if Jira integration is enabled
        if (environment_manager_1.envManager.isIntegrationEnabled('jira')) {
            console.log(`✅ Jira integration enabled - project: ${jiraConfig.projectKey}`);
        }
        else {
            console.log('⚠️ Jira integration disabled - no issue creation');
        }
        // Basic test regardless of integrations
        const registrationPage = new registration_page_1.RegistrationPage(page);
        if (environment_manager_1.envManager.isFeatureEnabled('registration')) {
            await registrationPage.navigateToRegistrationPage();
            await registrationPage.verifyPageLoaded();
        }
    });
    (0, test_1.test)('should use environment-specific performance settings', async ({ page }) => {
        const performanceConfig = environment_manager_1.envManager.getPerformanceConfig();
        console.log('Performance configuration:', performanceConfig);
        // Use environment-specific timeouts
        const timeout = environment_manager_1.envManager.getTimeout();
        page.setDefaultTimeout(timeout);
        console.log(`Set page timeout to: ${timeout}ms`);
        // Use environment-specific retry settings
        const retries = environment_manager_1.envManager.getRetries();
        console.log(`Using ${retries} retries for this environment`);
        // Navigate with environment-specific settings
        const registrationPage = new registration_page_1.RegistrationPage(page);
        if (environment_manager_1.envManager.isFeatureEnabled('registration')) {
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
            }
            else {
                console.log(`✅ Page load time within acceptable threshold`);
            }
        }
    });
});
//# sourceMappingURL=environment-usage.spec.js.map