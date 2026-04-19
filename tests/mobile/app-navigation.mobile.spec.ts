import { test, expect, mobileTest } from '../../src/core/base-test';

test.describe('Mobile App Navigation', () => {
  test.beforeEach(async ({ mobilePage }) => {
    // Launch mobile app or navigate to mobile web app
    await mobilePage.goto('/mobile-app');
    
    // Wait for app to load
    await mobilePage.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  mobileTest('should navigate through main app sections @mobile @smoke', async ({ mobilePage, logger }) => {
    logger.info('Testing main app navigation on mobile');
    
    // Verify home screen is loaded
    await expect(mobilePage.locator('[data-testid="home-screen"]')).toBeVisible();
    
    // Test bottom navigation
    const bottomNav = mobilePage.locator('[data-testid="bottom-navigation"]');
    await expect(bottomNav).toBeVisible();
    
    // Navigate to Profile section
    await mobilePage.tap('[data-testid="nav-profile"]');
    await expect(mobilePage.locator('[data-testid="profile-screen"]')).toBeVisible();
    
    // Navigate to Settings section
    await mobilePage.tap('[data-testid="nav-settings"]');
    await expect(mobilePage.locator('[data-testid="settings-screen"]')).toBeVisible();
    
    // Navigate to Search section
    await mobilePage.tap('[data-testid="nav-search"]');
    await expect(mobilePage.locator('[data-testid="search-screen"]')).toBeVisible();
    
    // Return to Home
    await mobilePage.tap('[data-testid="nav-home"]');
    await expect(mobilePage.locator('[data-testid="home-screen"]')).toBeVisible();
    
    logger.info('Main app navigation test completed');
  });

  mobileTest('should handle touch gestures @mobile @gestures', async ({ mobilePage, logger }) => {
    logger.info('Testing touch gestures');
    
    // Test swipe gestures on carousel
    const carousel = mobilePage.locator('[data-testid="image-carousel"]');
    await expect(carousel).toBeVisible();
    
    // Get initial image
    const initialImage = await mobilePage.locator('[data-testid="carousel-image"].active').getAttribute('src');
    
    // Swipe left to next image
    await carousel.swipe('left');
    await mobilePage.waitForTimeout(500); // Wait for animation
    
    const nextImage = await mobilePage.locator('[data-testid="carousel-image"].active').getAttribute('src');
    expect(nextImage).not.toBe(initialImage);
    
    // Swipe right to previous image
    await carousel.swipe('right');
    await mobilePage.waitForTimeout(500);
    
    const previousImage = await mobilePage.locator('[data-testid="carousel-image"].active').getAttribute('src');
    expect(previousImage).toBe(initialImage);
    
    // Test pull-to-refresh
    const contentArea = mobilePage.locator('[data-testid="content-area"]');
    await contentArea.swipe('down', { startY: 100, endY: 300 });
    
    // Verify refresh indicator appears
    await expect(mobilePage.locator('[data-testid="refresh-indicator"]')).toBeVisible();
    
    // Wait for refresh to complete
    await expect(mobilePage.locator('[data-testid="refresh-indicator"]')).not.toBeVisible({ timeout: 5000 });
    
    logger.info('Touch gestures test completed');
  });

  mobileTest('should work in portrait and landscape modes @mobile @orientation', async ({ mobilePage, logger }) => {
    logger.info('Testing orientation changes');
    
    // Start in portrait mode
    await mobilePage.setViewportSize({ width: 375, height: 812 });
    
    // Verify portrait layout
    await expect(mobilePage.locator('[data-testid="portrait-layout"]')).toBeVisible();
    await expect(mobilePage.locator('[data-testid="landscape-layout"]')).not.toBeVisible();
    
    // Switch to landscape mode
    await mobilePage.setViewportSize({ width: 812, height: 375 });
    
    // Wait for layout change
    await mobilePage.waitForTimeout(1000);
    
    // Verify landscape layout
    await expect(mobilePage.locator('[data-testid="landscape-layout"]')).toBeVisible();
    await expect(mobilePage.locator('[data-testid="portrait-layout"]')).not.toBeVisible();
    
    // Test navigation in landscape mode
    await mobilePage.tap('[data-testid="nav-profile"]');
    await expect(mobilePage.locator('[data-testid="profile-screen"]')).toBeVisible();
    
    // Switch back to portrait
    await mobilePage.setViewportSize({ width: 375, height: 812 });
    await mobilePage.waitForTimeout(1000);
    
    // Verify portrait layout is restored
    await expect(mobilePage.locator('[data-testid="portrait-layout"]')).toBeVisible();
    
    logger.info('Orientation test completed');
  });

  mobileTest('should handle form input on mobile @mobile @forms', async ({ mobilePage, testData, logger }) => {
    logger.info('Testing mobile form input');
    
    // Navigate to form screen
    await mobilePage.tap('[data-testid="nav-profile"]');
    await mobilePage.tap('[data-testid="edit-profile-button"]');
    
    // Test text input
    const nameInput = mobilePage.locator('[data-testid="name-input"]');
    await nameInput.tap();
    await nameInput.fill('John Doe Mobile');
    
    // Test email input with mobile keyboard
    const emailInput = mobilePage.locator('[data-testid="email-input"]');
    await emailInput.tap();
    await emailInput.fill('john.mobile@example.com');
    
    // Test phone number input
    const phoneInput = mobilePage.locator('[data-testid="phone-input"]');
    await phoneInput.tap();
    await phoneInput.fill('+1234567890');
    
    // Test date picker
    await mobilePage.tap('[data-testid="birthdate-input"]');
    await expect(mobilePage.locator('[data-testid="date-picker"]')).toBeVisible();
    
    // Select date
    await mobilePage.tap('[data-testid="date-1990"]');
    await mobilePage.tap('[data-testid="month-january"]');
    await mobilePage.tap('[data-testid="day-15"]');
    await mobilePage.tap('[data-testid="date-confirm"]');
    
    // Test dropdown/select
    await mobilePage.tap('[data-testid="country-select"]');
    await expect(mobilePage.locator('[data-testid="country-dropdown"]')).toBeVisible();
    await mobilePage.tap('[data-testid="country-usa"]');
    
    // Submit form
    await mobilePage.tap('[data-testid="save-button"]');
    
    // Verify success message
    await expect(mobilePage.locator('[data-testid="success-message"]')).toBeVisible();
    
    logger.info('Mobile form input test completed');
  });

  mobileTest('should handle offline functionality @mobile @offline', async ({ mobilePage, logger }) => {
    logger.info('Testing offline functionality');
    
    // Go online first and load content
    await mobilePage.context().setOffline(false);
    await mobilePage.reload();
    await expect(mobilePage.locator('[data-testid="home-screen"]')).toBeVisible();
    
    // Load some content
    await mobilePage.tap('[data-testid="nav-search"]');
    await mobilePage.fill('[data-testid="search-input"]', 'test query');
    await mobilePage.tap('[data-testid="search-button"]');
    
    // Wait for results to load
    await expect(mobilePage.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Go offline
    await mobilePage.context().setOffline(true);
    
    // Verify offline indicator
    await expect(mobilePage.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Test cached content is still available
    await mobilePage.tap('[data-testid="nav-home"]');
    await expect(mobilePage.locator('[data-testid="home-screen"]')).toBeVisible();
    
    // Test offline message for new requests
    await mobilePage.tap('[data-testid="nav-profile"]');
    await expect(mobilePage.locator('[data-testid="offline-message"]')).toBeVisible();
    
    // Go back online
    await mobilePage.context().setOffline(false);
    
    // Verify online indicator
    await expect(mobilePage.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    
    // Verify content loads normally
    await mobilePage.reload();
    await expect(mobilePage.locator('[data-testid="profile-screen"]')).toBeVisible();
    
    logger.info('Offline functionality test completed');
  });

  mobileTest('should handle push notifications @mobile @notifications', async ({ mobilePage, logger }) => {
    logger.info('Testing push notifications');
    
    // Navigate to settings
    await mobilePage.tap('[data-testid="nav-settings"]');
    
    // Enable notifications
    const notificationToggle = mobilePage.locator('[data-testid="notification-toggle"]');
    
    if (!(await notificationToggle.isChecked())) {
      await notificationToggle.tap();
    }
    
    // Verify notification permission request (if supported)
    try {
      await mobilePage.waitForEvent('dialog', { timeout: 2000 });
      await mobilePage.getByRole('button', { name: 'Allow' }).click();
    } catch (error) {
      logger.info('No notification permission dialog appeared');
    }
    
    // Test notification preferences
    await mobilePage.tap('[data-testid="notification-settings"]');
    
    // Enable different notification types
    await mobilePage.tap('[data-testid="email-notifications"]');
    await mobilePage.tap('[data-testid="push-notifications"]');
    await mobilePage.tap('[data-testid="sms-notifications"]');
    
    // Save settings
    await mobilePage.tap('[data-testid="save-notification-settings"]');
    
    // Verify success message
    await expect(mobilePage.locator('[data-testid="settings-saved-message"]')).toBeVisible();
    
    logger.info('Push notifications test completed');
  });

  mobileTest('should handle app state changes @mobile @lifecycle', async ({ mobilePage, logger }) => {
    logger.info('Testing app state changes');
    
    // Load initial content
    await expect(mobilePage.locator('[data-testid="home-screen"]')).toBeVisible();
    
    // Simulate app going to background
    await mobilePage.evaluate(() => {
      // Simulate visibility change
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden'
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Wait a moment
    await mobilePage.waitForTimeout(1000);
    
    // Simulate app coming back to foreground
    await mobilePage.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible'
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Verify app state is restored
    await expect(mobilePage.locator('[data-testid="home-screen"]')).toBeVisible();
    
    // Test memory management - navigate through multiple screens
    const screens = ['profile', 'settings', 'search', 'home'];
    
    for (const screen of screens) {
      await mobilePage.tap(`[data-testid="nav-${screen}"]`);
      await expect(mobilePage.locator(`[data-testid="${screen}-screen"]`)).toBeVisible();
      
      // Check for memory leaks or performance issues
      const memoryUsage = await mobilePage.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });
      
      logger.info(`Memory usage on ${screen} screen: ${memoryUsage} bytes`);
    }
    
    logger.info('App state changes test completed');
  });

  mobileTest('should work with different screen sizes @mobile @responsive', async ({ mobilePage, logger }) => {
    logger.info('Testing different mobile screen sizes');
    
    const screenSizes = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPhone 12 Pro Max', width: 428, height: 926 },
      { name: 'Samsung Galaxy S21', width: 360, height: 800 },
      { name: 'iPad Mini', width: 768, height: 1024 }
    ];
    
    for (const size of screenSizes) {
      logger.info(`Testing on ${size.name} (${size.width}x${size.height})`);
      
      await mobilePage.setViewportSize({ width: size.width, height: size.height });
      await mobilePage.waitForTimeout(500); // Wait for layout adjustment
      
      // Verify main elements are visible and properly sized
      await expect(mobilePage.locator('[data-testid="app-container"]')).toBeVisible();
      await expect(mobilePage.locator('[data-testid="bottom-navigation"]')).toBeVisible();
      
      // Test navigation on this screen size
      await mobilePage.tap('[data-testid="nav-profile"]');
      await expect(mobilePage.locator('[data-testid="profile-screen"]')).toBeVisible();
      
      // Verify text is readable (not too small)
      const fontSize = await mobilePage.locator('[data-testid="profile-title"]').evaluate(el => {
        return window.getComputedStyle(el).fontSize;
      });
      
      const fontSizeNum = parseInt(fontSize.replace('px', ''));
      expect(fontSizeNum).toBeGreaterThanOrEqual(14); // Minimum readable font size
      
      // Return to home for next iteration
      await mobilePage.tap('[data-testid="nav-home"]');
    }
    
    logger.info('Screen sizes test completed');
  });

  test.afterEach(async ({ mobilePage, logger }) => {
    // Capture screenshot for mobile test results
    await mobilePage.screenshot({ 
      path: `test-results/mobile-screenshots/${test.info().title.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
      fullPage: true 
    });
    
    // Reset to online state
    await mobilePage.context().setOffline(false);
    
    logger.info('Mobile test cleanup completed');
  });
});