"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Global setup for the test suite
 * Runs once before all tests
 */
async function globalSetup(config) {
    console.log('🚀 Starting Enterprise Test Automation Framework Global Setup...');
    // Create necessary directories
    const directories = [
        'test-results',
        'screenshots',
        'videos',
        'traces',
        'allure-results',
        'playwright-report'
    ];
    directories.forEach(dir => {
        const dirPath = path_1.default.join(process.cwd(), dir);
        if (!fs_1.default.existsSync(dirPath)) {
            fs_1.default.mkdirSync(dirPath, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    });
    // Environment validation
    console.log('🔍 Validating test environment...');
    // Check required environment variables
    const requiredEnvVars = ['NODE_ENV'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
        console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
    }
    // Set default environment if not specified
    if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'test';
        console.log('🔧 Set NODE_ENV to "test"');
    }
    // Browser validation
    console.log('🌐 Validating browser availability...');
    try {
        const browser = await test_1.chromium.launch();
        await browser.close();
        console.log('✅ Chromium browser available');
    }
    catch (error) {
        console.error('❌ Chromium browser not available:', error);
        throw new Error('Browser validation failed');
    }
    // Test data validation
    console.log('📊 Validating test data...');
    const testDataPath = path_1.default.join(process.cwd(), 'test-data', 'registration.json');
    if (fs_1.default.existsSync(testDataPath)) {
        try {
            const testData = JSON.parse(fs_1.default.readFileSync(testDataPath, 'utf8'));
            // Validate test data structure
            const requiredSections = ['validUsers', 'invalidUsers', 'edgeCases'];
            const missingSections = requiredSections.filter(section => !testData[section]);
            if (missingSections.length > 0) {
                throw new Error(`Missing test data sections: ${missingSections.join(', ')}`);
            }
            console.log(`✅ Test data validated - ${testData.validUsers.length} valid users, ${testData.invalidUsers.length} invalid users, ${testData.edgeCases.length} edge cases`);
        }
        catch (error) {
            console.error('❌ Test data validation failed:', error);
            throw error;
        }
    }
    else {
        console.warn('⚠️  Test data file not found, using generated data');
    }
    // Application health check
    console.log('🏥 Performing application health check...');
    try {
        const browser = await test_1.chromium.launch();
        const context = await browser.newContext();
        const page = await context.newPage();
        // Check if the application is accessible
        const response = await page.goto('https://demowebshop.tricentis.com/register', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        if (response && response.ok()) {
            console.log('✅ Application health check passed');
        }
        else {
            throw new Error(`Application health check failed with status: ${response?.status()}`);
        }
        await browser.close();
    }
    catch (error) {
        console.error('❌ Application health check failed:', error);
        // Don't throw error here to allow tests to run and report the issue
        console.warn('⚠️  Continuing with tests despite health check failure');
    }
    // Performance baseline setup
    console.log('⚡ Setting up performance baselines...');
    const performanceBaselines = {
        pageLoadTime: 5000, // 5 seconds
        formSubmissionTime: 10000, // 10 seconds
        apiResponseTime: 3000, // 3 seconds
        memoryUsageLimit: 100 * 1024 * 1024 // 100MB
    };
    // Store baselines for use in tests
    process.env.PERF_PAGE_LOAD_BASELINE = performanceBaselines.pageLoadTime.toString();
    process.env.PERF_FORM_SUBMIT_BASELINE = performanceBaselines.formSubmissionTime.toString();
    process.env.PERF_API_RESPONSE_BASELINE = performanceBaselines.apiResponseTime.toString();
    process.env.PERF_MEMORY_BASELINE = performanceBaselines.memoryUsageLimit.toString();
    console.log('✅ Performance baselines configured');
    // Security configuration
    console.log('🔒 Configuring security settings...');
    // Set security headers for API tests
    process.env.SECURITY_HEADERS_ENABLED = 'true';
    process.env.CSRF_PROTECTION_ENABLED = 'true';
    process.env.XSS_PROTECTION_ENABLED = 'true';
    console.log('✅ Security settings configured');
    // Test execution metadata
    const metadata = {
        startTime: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        framework: 'Playwright',
        version: '1.40.0',
        platform: process.platform,
        nodeVersion: process.version,
        testSuite: 'Enterprise Registration Tests'
    };
    // Save metadata for reporting
    const metadataPath = path_1.default.join(process.cwd(), 'test-results', 'metadata.json');
    fs_1.default.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('📝 Test execution metadata saved');
    // Cleanup old test results
    console.log('🧹 Cleaning up old test results...');
    const cleanupDirs = ['test-results', 'screenshots', 'videos', 'traces'];
    cleanupDirs.forEach(dir => {
        const dirPath = path_1.default.join(process.cwd(), dir);
        if (fs_1.default.existsSync(dirPath)) {
            const files = fs_1.default.readdirSync(dirPath);
            files.forEach(file => {
                if (file !== 'metadata.json' && file !== '.gitkeep') {
                    const filePath = path_1.default.join(dirPath, file);
                    try {
                        if (fs_1.default.statSync(filePath).isDirectory()) {
                            fs_1.default.rmSync(filePath, { recursive: true, force: true });
                        }
                        else {
                            fs_1.default.unlinkSync(filePath);
                        }
                    }
                    catch (error) {
                        console.warn(`⚠️  Could not delete ${filePath}:`, error.message);
                    }
                }
            });
        }
    });
    console.log('✅ Cleanup completed');
    // Final setup validation
    console.log('🔍 Final setup validation...');
    const setupValidation = {
        directories: directories.every(dir => fs_1.default.existsSync(path_1.default.join(process.cwd(), dir))),
        environment: !!process.env.NODE_ENV,
        testData: fs_1.default.existsSync(testDataPath),
        metadata: fs_1.default.existsSync(metadataPath)
    };
    const validationPassed = Object.values(setupValidation).every(Boolean);
    if (validationPassed) {
        console.log('✅ Global setup completed successfully');
        console.log('🎯 Ready to execute enterprise test automation suite');
    }
    else {
        console.error('❌ Global setup validation failed:', setupValidation);
        throw new Error('Global setup validation failed');
    }
    // Log configuration summary
    console.log('\n📋 Configuration Summary:');
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log(`   Base URL: ${config.use?.baseURL || 'Not configured'}`);
    console.log(`   Workers: ${config.workers || 'Default'}`);
    console.log(`   Retries: ${config.retries || 0}`);
    console.log(`   Timeout: ${config.timeout || 30000}ms`);
    console.log(`   Projects: ${config.projects?.length || 0}`);
    console.log('');
}
exports.default = globalSetup;
//# sourceMappingURL=global-setup.js.map