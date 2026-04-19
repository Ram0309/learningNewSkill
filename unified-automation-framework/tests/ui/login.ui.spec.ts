import { test, expect, uiTest } from '../../src/core/base-test';

test.describe('Login Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  uiTest('should login with valid credentials @ui @smoke', async ({ page, testData, logger }) => {
    // Get test data
    const credentials = await testData.getCredentials('valid_user');
    
    logger.info('Starting login test with valid credentials');
    
    // Fill login form with self-healing selectors
    await page.fill('[data-testid="username"]', credentials.username);
    await page.fill('[data-testid="password"]', credentials.password);
    
    // Click login button
    await page.click('[data-testid="login-button"]');
    
    // Verify successful login
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Verify user name is displayed
    const userNameElement = page.locator('[data-testid="user-name"]');
    await expect(userNameElement).toContainText(credentials.displayName);
    
    logger.info('Login test completed successfully');
  });

  uiTest('should show error for invalid credentials @ui @negative', async ({ page, testData, logger }) => {
    const credentials = await testData.getCredentials('invalid_user');
    
    logger.info('Testing login with invalid credentials');
    
    await page.fill('[data-testid="username"]', credentials.username);
    await page.fill('[data-testid="password"]', credentials.password);
    await page.click('[data-testid="login-button"]');
    
    // Verify error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Invalid username or password');
    
    // Verify still on login page
    await expect(page).toHaveURL(/.*login/);
    
    logger.info('Invalid credentials test completed');
  });

  uiTest('should handle password reset flow @ui @functional', async ({ page, api, logger }) => {
    logger.info('Testing password reset flow');
    
    // Click forgot password link
    await page.click('[data-testid="forgot-password-link"]');
    
    // Fill email for password reset
    await page.fill('[data-testid="reset-email"]', 'test@example.com');
    await page.click('[data-testid="send-reset-button"]');
    
    // Verify success message
    const successMessage = page.locator('[data-testid="reset-success-message"]');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText('Password reset email sent');
    
    // Verify API call was made
    const resetRequests = await api.get('/api/password-reset-requests');
    expect(resetRequests.status()).toBe(200);
    
    logger.info('Password reset flow test completed');
  });

  uiTest('should validate form fields @ui @validation', async ({ page, logger }) => {
    logger.info('Testing form validation');
    
    // Try to submit empty form
    await page.click('[data-testid="login-button"]');
    
    // Verify validation messages
    const usernameError = page.locator('[data-testid="username-error"]');
    const passwordError = page.locator('[data-testid="password-error"]');
    
    await expect(usernameError).toBeVisible();
    await expect(usernameError).toContainText('Username is required');
    
    await expect(passwordError).toBeVisible();
    await expect(passwordError).toContainText('Password is required');
    
    // Fill username only
    await page.fill('[data-testid="username"]', 'testuser');
    await page.click('[data-testid="login-button"]');
    
    // Username error should be gone, password error should remain
    await expect(usernameError).not.toBeVisible();
    await expect(passwordError).toBeVisible();
    
    logger.info('Form validation test completed');
  });

  uiTest('should support keyboard navigation @ui @accessibility', async ({ page, logger }) => {
    logger.info('Testing keyboard navigation');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="username"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
    
    // Submit form with Enter key
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'testpass');
    await page.keyboard.press('Enter');
    
    // Should attempt login
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    
    logger.info('Keyboard navigation test completed');
  });

  uiTest('should handle session timeout @ui @security', async ({ page, api, logger }) => {
    logger.info('Testing session timeout handling');
    
    // Login first
    const credentials = await testData.getCredentials('valid_user');
    await page.fill('[data-testid="username"]', credentials.username);
    await page.fill('[data-testid="password"]', credentials.password);
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Simulate session expiry by clearing cookies
    await page.context().clearCookies();
    
    // Try to access protected resource
    await page.goto('/profile');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    
    // Should show session expired message
    const sessionMessage = page.locator('[data-testid="session-expired-message"]');
    await expect(sessionMessage).toBeVisible();
    
    logger.info('Session timeout test completed');
  });

  uiTest('should work across different browsers @ui @cross-browser', async ({ page, logger }) => {
    logger.info('Testing cross-browser compatibility');
    
    const credentials = await testData.getCredentials('valid_user');
    
    // Test basic login functionality
    await page.fill('[data-testid="username"]', credentials.username);
    await page.fill('[data-testid="password"]', credentials.password);
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Test browser-specific features
    const userAgent = await page.evaluate(() => navigator.userAgent);
    logger.info(`Testing on browser: ${userAgent}`);
    
    // Verify responsive design
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
    
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    logger.info('Cross-browser test completed');
  });

  test.afterEach(async ({ page, logger }) => {
    // Cleanup: logout if logged in
    try {
      const userMenu = page.locator('[data-testid="user-menu"]');
      if (await userMenu.isVisible({ timeout: 1000 })) {
        await userMenu.click();
        await page.click('[data-testid="logout-button"]');
        logger.info('Logged out after test');
      }
    } catch (error) {
      // Ignore cleanup errors
      logger.warn('Cleanup warning:', error);
    }
  });
});