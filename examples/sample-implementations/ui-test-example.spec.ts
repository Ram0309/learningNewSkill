/**
 * Enterprise UI Test Example
 * Demonstrates best practices for Fortune 500 test automation
 */

import { test, expect } from '../../src/core/base-test';
import { LoginPage } from '../../src/layers/business/page-objects/web/login-page';
import { CheckoutPage } from '../../src/layers/business/page-objects/web/checkout-page';
import { LoginWorkflow } from '../../src/layers/business/workflows/login-workflow';
import { UserBuilder } from '../../src/layers/business/builders/user-builder';

// Test configuration with enterprise features
test.describe('E-Commerce Login Flow', () => {
  let loginPage: LoginPage;
  let checkoutPage: CheckoutPage;
  let loginWorkflow: LoginWorkflow;

  test.beforeEach(async ({ 
    healingPage, 
    testData, 
    logger, 
    tenantContext,
    pluginManager 
  }) => {
    // Initialize page objects with self-healing capabilities
    loginPage = new LoginPage(healingPage, logger);
    checkoutPage = new CheckoutPage(healingPage, logger);
    loginWorkflow = new LoginWorkflow(loginPage, logger);

    // Execute pre-test plugins
    await pluginManager.executeTestHooks('beforeTest', tenantContext.tenantId, {
      testId: test.info().testId,
      testName: test.info().title,
      tenantId: tenantContext.tenantId,
      projectId: tenantContext.projectId,
      metadata: { browser: 'chromium', environment: 'staging' }
    });

    // Navigate to application
    await healingPage.goto('/login');
    
    logger.info('Test setup completed', {
      testId: test.info().testId,
      tenant: tenantContext.tenantId
    });
  });

  test('should login with valid credentials @smoke @ui @critical', async ({ 
    healingPage, 
    testData, 
    logger,
    performance,
    security 
  }) => {
    // Start performance monitoring
    await performance.startMonitoring('login_flow');

    // Generate test data using builder pattern
    const user = new UserBuilder()
      .withValidCredentials()
      .withRole('customer')
      .withTenant(test.info().project?.metadata?.tenantId)
      .build();

    logger.info('Generated test user', { userId: user.id });

    // Execute login workflow with self-healing
    const loginResult = await loginWorkflow.loginWithCredentials(
      user.email, 
      user.password
    );

    // Validate login success
    expect(loginResult.success).toBe(true);
    expect(loginResult.redirectUrl).toContain('/dashboard');

    // Verify user session
    await expect(healingPage.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(healingPage.locator('[data-testid="user-name"]')).toContainText(user.firstName);

    // Security validation
    const securityCheck = await security.validateSession(healingPage);
    expect(securityCheck.isSecure).toBe(true);
    expect(securityCheck.hasValidToken).toBe(true);

    // Performance validation
    const performanceMetrics = await performance.stopMonitoring('login_flow');
    expect(performanceMetrics.duration).toBeLessThan(3000); // 3 seconds max
    expect(performanceMetrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB max

    logger.info('Login test completed successfully', {
      duration: performanceMetrics.duration,
      memoryUsage: performanceMetrics.memoryUsage
    });
  });

  test('should handle invalid credentials gracefully @negative @ui @security', async ({ 
    healingPage, 
    logger,
    security 
  }) => {
    // Test with invalid credentials
    const invalidUser = new UserBuilder()
      .withInvalidCredentials()
      .build();

    logger.info('Testing with invalid credentials');

    // Attempt login with invalid credentials
    const loginResult = await loginWorkflow.loginWithCredentials(
      invalidUser.email, 
      invalidUser.password
    );

    // Validate failure handling
    expect(loginResult.success).toBe(false);
    expect(loginResult.errorMessage).toContain('Invalid credentials');

    // Verify error message display
    await expect(healingPage.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(healingPage.locator('[data-testid="error-message"]')).toContainText('Invalid username or password');

    // Security validation - ensure no sensitive data exposure
    const pageContent = await healingPage.content();
    expect(pageContent).not.toContain(invalidUser.password);
    expect(pageContent).not.toContain('database error');
    expect(pageContent).not.toContain('stack trace');

    // Verify rate limiting (security feature)
    const rateLimitCheck = await security.checkRateLimit(healingPage, '/login');
    expect(rateLimitCheck.isWithinLimits).toBe(true);

    logger.info('Invalid credentials test completed');
  });

  test('should support multi-factor authentication @security @ui @enterprise', async ({ 
    healingPage, 
    testData, 
    logger,
    security 
  }) => {
    // Generate MFA-enabled user
    const mfaUser = new UserBuilder()
      .withValidCredentials()
      .withMFAEnabled()
      .withRole('admin')
      .build();

    logger.info('Testing MFA flow', { userId: mfaUser.id });

    // Step 1: Login with credentials
    await loginWorkflow.loginWithCredentials(mfaUser.email, mfaUser.password);

    // Step 2: Verify MFA challenge appears
    await expect(healingPage.locator('[data-testid="mfa-challenge"]')).toBeVisible();
    await expect(healingPage.locator('[data-testid="mfa-code-input"]')).toBeVisible();

    // Step 3: Enter MFA code
    const mfaCode = await testData.generateMFACode(mfaUser.id);
    await healingPage.fill('[data-testid="mfa-code-input"]', mfaCode);
    await healingPage.click('[data-testid="verify-mfa-button"]');

    // Step 4: Verify successful MFA completion
    await expect(healingPage).toHaveURL(/.*dashboard/);
    await expect(healingPage.locator('[data-testid="user-menu"]')).toBeVisible();

    // Security validation
    const sessionValidation = await security.validateMFASession(healingPage);
    expect(sessionValidation.isMFAVerified).toBe(true);
    expect(sessionValidation.sessionStrength).toBe('high');

    logger.info('MFA test completed successfully');
  });

  test('should maintain session across page navigation @functional @ui @session', async ({ 
    healingPage, 
    logger,
    performance 
  }) => {
    // Login with valid user
    const user = new UserBuilder().withValidCredentials().build();
    await loginWorkflow.loginWithCredentials(user.email, user.password);

    // Navigate through multiple pages
    const pages = ['/products', '/cart', '/profile', '/orders'];
    
    for (const pagePath of pages) {
      await performance.startMonitoring(`navigation_${pagePath}`);
      
      await healingPage.goto(pagePath);
      
      // Verify user remains logged in
      await expect(healingPage.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // Verify page loads correctly
      await expect(healingPage.locator('[data-testid="page-content"]')).toBeVisible();
      
      const navMetrics = await performance.stopMonitoring(`navigation_${pagePath}`);
      expect(navMetrics.duration).toBeLessThan(2000); // 2 seconds max per page
      
      logger.info(`Navigation to ${pagePath} completed`, {
        duration: navMetrics.duration
      });
    }

    logger.info('Session persistence test completed');
  });

  test('should handle concurrent user sessions @load @ui @scalability', async ({ 
    browser, 
    logger,
    performance 
  }) => {
    const concurrentUsers = 10;
    const userSessions = [];

    logger.info(`Starting concurrent session test with ${concurrentUsers} users`);

    // Create multiple browser contexts for concurrent users
    for (let i = 0; i < concurrentUsers; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      const user = new UserBuilder()
        .withValidCredentials()
        .withUniqueIdentifier(i)
        .build();

      userSessions.push({ context, page, user });
    }

    // Execute concurrent logins
    await performance.startMonitoring('concurrent_logins');
    
    const loginPromises = userSessions.map(async (session, index) => {
      const loginPage = new LoginPage(session.page, logger);
      const workflow = new LoginWorkflow(loginPage, logger);
      
      await session.page.goto('/login');
      return await workflow.loginWithCredentials(session.user.email, session.user.password);
    });

    const results = await Promise.all(loginPromises);
    const concurrentMetrics = await performance.stopMonitoring('concurrent_logins');

    // Validate all logins succeeded
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      logger.info(`User ${index + 1} login successful`);
    });

    // Performance validation
    expect(concurrentMetrics.duration).toBeLessThan(10000); // 10 seconds max for all
    expect(concurrentMetrics.averageResponseTime).toBeLessThan(1000); // 1 second average

    // Cleanup
    await Promise.all(userSessions.map(session => session.context.close()));

    logger.info('Concurrent sessions test completed', {
      totalUsers: concurrentUsers,
      totalDuration: concurrentMetrics.duration,
      averageResponseTime: concurrentMetrics.averageResponseTime
    });
  });

  test.afterEach(async ({ 
    healingPage, 
    logger, 
    pluginManager, 
    tenantContext,
    selfHealing 
  }) => {
    // Capture test artifacts
    if (test.info().status === 'failed') {
      await healingPage.screenshot({ 
        path: `reports/screenshots/${test.info().testId}-failure.png`,
        fullPage: true 
      });
      
      // Trigger self-healing analysis
      await selfHealing.analyzeFailure(test.info().testId, test.info().error);
    }

    // Execute post-test plugins
    await pluginManager.executeTestHooks('afterTest', tenantContext.tenantId, {
      testId: test.info().testId,
      testName: test.info().title,
      tenantId: tenantContext.tenantId,
      projectId: tenantContext.projectId,
      metadata: { 
        status: test.info().status,
        duration: test.info().duration,
        browser: 'chromium'
      }
    }, {
      testId: test.info().testId,
      status: test.info().status === 'passed' ? 'PASSED' : 'FAILED',
      startTime: new Date(Date.now() - (test.info().duration || 0)),
      endTime: new Date(),
      duration: test.info().duration || 0,
      retryCount: test.info().retry,
      error: test.info().error ? {
        message: test.info().error.message,
        stack: test.info().error.stack || '',
        type: test.info().error.name
      } : undefined,
      artifacts: {
        screenshots: test.info().status === 'failed' ? [`${test.info().testId}-failure.png`] : [],
        videos: [],
        logs: [],
        traces: [],
        reports: []
      },
      metrics: {
        assertions: 1,
        networkRequests: 5,
        pageLoads: 1,
        memoryUsage: 100,
        cpuUsage: 50
      }
    });

    logger.info('Test cleanup completed', {
      testId: test.info().testId,
      status: test.info().status,
      duration: test.info().duration
    });
  });
});

/**
 * Enterprise Test Features Demonstrated:
 * 
 * 1. Self-Healing: Automatic element recovery using AI
 * 2. Multi-Tenant: Tenant-aware test execution
 * 3. Plugin System: Pre/post test hooks
 * 4. Performance Monitoring: Real-time metrics collection
 * 5. Security Testing: Session validation and rate limiting
 * 6. Scalability Testing: Concurrent user simulation
 * 7. Comprehensive Logging: Structured logging with context
 * 8. Test Data Management: Builder pattern for data generation
 * 9. Artifact Collection: Screenshots, videos, traces
 * 10. Enterprise Patterns: Page objects, workflows, validators
 */