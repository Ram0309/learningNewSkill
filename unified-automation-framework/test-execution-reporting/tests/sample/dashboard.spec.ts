import { test, expect } from '@playwright/test';

/**
 * Sample test suite for the Test Execution Dashboard
 * Demonstrates integration with the reporting system
 */
test.describe('Test Execution Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
  });

  test('should display dashboard header @smoke', async ({ page }) => {
    // Check if dashboard header is visible
    await expect(page.locator('h1')).toContainText('Test Execution Dashboard');
    
    // Check if refresh button is present
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    
    // Check if export button is present
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('should load metrics cards @smoke', async ({ page }) => {
    // Wait for metrics cards to load
    await page.waitForSelector('#metricsCards');
    
    // Check if all metric cards are present
    await expect(page.locator('#totalExecutions')).toBeVisible();
    await expect(page.locator('#totalTests')).toBeVisible();
    await expect(page.locator('#overallPassRate')).toBeVisible();
    await expect(page.locator('#avgExecutionTime')).toBeVisible();
  });

  test('should display charts @regression', async ({ page }) => {
    // Wait for charts to load
    await page.waitForTimeout(2000);
    
    // Check if trend chart is present
    await expect(page.locator('#trendsChart')).toBeVisible();
    
    // Check if pass/fail chart is present
    await expect(page.locator('#passFailChart')).toBeVisible();
    
    // Check if environment chart is present
    await expect(page.locator('#environmentChart')).toBeVisible();
    
    // Check if error chart is present
    await expect(page.locator('#errorChart')).toBeVisible();
  });

  test('should apply date filters @regression', async ({ page }) => {
    // Set date filters
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    await page.fill('#dateFrom', thirtyDaysAgo);
    await page.fill('#dateTo', today);
    
    // Apply filters
    await page.click('button:has-text("Apply Filters")');
    
    // Wait for data to reload
    await page.waitForTimeout(1000);
    
    // Verify filters were applied (check if loading spinner appeared and disappeared)
    await expect(page.locator('.loading-spinner')).toBeHidden();
  });

  test('should open export modal @regression', async ({ page }) => {
    // Click export button
    await page.click('button:has-text("Export")');
    
    // Check if export modal is visible
    await expect(page.locator('#exportModal')).toBeVisible();
    
    // Check if export format dropdown is present
    await expect(page.locator('#exportFormat')).toBeVisible();
    
    // Check if export data dropdown is present
    await expect(page.locator('#exportData')).toBeVisible();
    
    // Close modal
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('#exportModal')).toBeHidden();
  });

  test('should display executions table @regression', async ({ page }) => {
    // Wait for executions table to load
    await page.waitForSelector('#executionsTable');
    
    // Check if table headers are present
    await expect(page.locator('th:has-text("Execution ID")')).toBeVisible();
    await expect(page.locator('th:has-text("Project")')).toBeVisible();
    await expect(page.locator('th:has-text("Environment")')).toBeVisible();
    await expect(page.locator('th:has-text("Pass Rate")')).toBeVisible();
  });

  test('should display failing tests table @regression', async ({ page }) => {
    // Wait for failing tests table to load
    await page.waitForSelector('#failingTestsTable');
    
    // Check if table headers are present
    await expect(page.locator('th:has-text("Test Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Failure Count")')).toBeVisible();
    await expect(page.locator('th:has-text("Failure Rate")')).toBeVisible();
  });

  test('should refresh dashboard data @smoke', async ({ page }) => {
    // Click refresh button
    await page.click('button:has-text("Refresh")');
    
    // Wait for refresh to complete
    await page.waitForTimeout(1000);
    
    // Verify data is still displayed
    await expect(page.locator('#totalExecutions')).toBeVisible();
  });

  test('should handle environment filter @regression', async ({ page }) => {
    // Select environment filter
    await page.selectOption('#environmentFilter', 'qa');
    
    // Apply filters
    await page.click('button:has-text("Apply Filters")');
    
    // Wait for data to reload
    await page.waitForTimeout(1000);
    
    // Verify filter was applied
    await expect(page.locator('#environmentFilter')).toHaveValue('qa');
  });

  test('should toggle auto-refresh @regression', async ({ page }) => {
    // Click auto-refresh toggle
    await page.click('button:has-text("Enable Auto-refresh")');
    
    // Verify button text changed
    await expect(page.locator('button:has-text("Disable Auto-refresh")')).toBeVisible();
    
    // Toggle back
    await page.click('button:has-text("Disable Auto-refresh")');
    await expect(page.locator('button:has-text("Enable Auto-refresh")')).toBeVisible();
  });

  test('should handle keyboard shortcuts @regression', async ({ page }) => {
    // Test Ctrl+R for refresh
    await page.keyboard.press('Control+r');
    
    // Wait for refresh to complete
    await page.waitForTimeout(1000);
    
    // Verify dashboard is still functional
    await expect(page.locator('#totalExecutions')).toBeVisible();
  });

  test('should be responsive on mobile @mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if dashboard is still functional
    await expect(page.locator('h1')).toContainText('Test Execution Dashboard');
    
    // Check if metrics cards are stacked vertically
    const metricsCards = page.locator('#metricsCards .col-md-3');
    await expect(metricsCards.first()).toBeVisible();
  });

  test('should handle error states gracefully @error-handling', async ({ page }) => {
    // Simulate network error by intercepting API calls
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // Refresh page to trigger API calls
    await page.reload();
    
    // Check if error message is displayed
    await expect(page.locator('.error-message')).toBeVisible();
  });
});