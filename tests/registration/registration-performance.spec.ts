import { test, expect } from '@playwright/test';
import { RegistrationPage } from '../../src/pages/registration-page';
import { TestDataGenerator } from '../../src/utils/test-data-generator';
import registrationData from '../../test-data/registration.json';

test.describe('Registration Performance Tests', () => {
  let registrationPage: RegistrationPage;

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page);
  });

  test.describe('Load Performance Tests', () => {
    test('REG_PERF_001: Page load performance under 5 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await registrationPage.navigateToRegistrationPage();
      await registrationPage.verifyPageLoaded();
      
      const loadTime = Date.now() - startTime;
      
      console.log(`Page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
      
      // Verify all critical elements are loaded
      await registrationPage.verifyFormFieldProperties();
    });

    test('REG_PERF_002: Form submission performance', async () => {
      await registrationPage.navigateToRegistrationPage();
      
      const validUser = TestDataGenerator.generateValidUser();
      await registrationPage.fillRegistrationForm(validUser);
      
      const startTime = Date.now();
      await registrationPage.clickRegisterButton();
      await registrationPage.verifySuccessfulRegistration();
      const submissionTime = Date.now() - startTime;
      
      console.log(`Form submission time: ${submissionTime}ms`);
      expect(submissionTime).toBeLessThan(10000);
    });
  });

  test.describe('Bulk Registration Tests', () => {
    test('REG_PERF_003: Sequential bulk user registration', async () => {
      const userCount = 10;
      const users = TestDataGenerator.generatePerformanceTestUsers(userCount);
      const results: { user: string; time: number; success: boolean }[] = [];
      
      for (const user of users) {
        await registrationPage.navigateToRegistrationPage();
        
        const startTime = Date.now();
        
        try {
          await registrationPage.registerUser(user);
          await registrationPage.verifySuccessfulRegistration();
          
          const registrationTime = Date.now() - startTime;
          results.push({
            user: user.testId || 'unknown',
            time: registrationTime,
            success: true
          });
          
          console.log(`User ${user.testId} registered in ${registrationTime}ms`);
          
          // Navigate away to reset for next user
          await registrationPage.clickContinueButton();
          
        } catch (error) {
          const registrationTime = Date.now() - startTime;
          results.push({
            user: user.testId || 'unknown',
            time: registrationTime,
            success: false
          });
          
          console.error(`User ${user.testId} registration failed: ${error}`);
        }
      }
      
      // Analyze results
      const successfulRegistrations = results.filter(r => r.success);
      const averageTime = successfulRegistrations.reduce((sum, r) => sum + r.time, 0) / successfulRegistrations.length;
      const maxTime = Math.max(...successfulRegistrations.map(r => r.time));
      const minTime = Math.min(...successfulRegistrations.map(r => r.time));
      
      console.log(`Performance Summary:
        - Total users: ${userCount}
        - Successful: ${successfulRegistrations.length}
        - Failed: ${results.length - successfulRegistrations.length}
        - Average time: ${averageTime.toFixed(2)}ms
        - Max time: ${maxTime}ms
        - Min time: ${minTime}ms`);
      
      // Performance assertions
      expect(successfulRegistrations.length).toBeGreaterThan(userCount * 0.8); // 80% success rate
      expect(averageTime).toBeLessThan(8000); // Average under 8 seconds
      expect(maxTime).toBeLessThan(15000); // Max under 15 seconds
    });
  });

  test.describe('Concurrent Registration Tests', () => {
    test('REG_PERF_004: Concurrent user registration', async ({ browser }) => {
      const concurrentUsers = 5;
      const users = TestDataGenerator.generateConcurrentTestUsers(concurrentUsers);
      
      const registrationPromises = users.map(async (user, index) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const regPage = new RegistrationPage(page);
        
        const startTime = Date.now();
        
        try {
          await regPage.navigateToRegistrationPage();
          await regPage.registerUser(user);
          await regPage.verifySuccessfulRegistration();
          
          const registrationTime = Date.now() - startTime;
          
          await context.close();
          
          return {
            userIndex: index,
            userId: user.testId,
            time: registrationTime,
            success: true
          };
        } catch (error) {
          const registrationTime = Date.now() - startTime;
          
          await context.close();
          
          return {
            userIndex: index,
            userId: user.testId,
            time: registrationTime,
            success: false,
            error: error.message
          };
        }
      });
      
      const startTime = Date.now();
      const results = await Promise.all(registrationPromises);
      const totalTime = Date.now() - startTime;
      
      // Analyze concurrent results
      const successfulRegistrations = results.filter(r => r.success);
      const averageTime = successfulRegistrations.reduce((sum, r) => sum + r.time, 0) / successfulRegistrations.length;
      
      console.log(`Concurrent Registration Summary:
        - Total concurrent users: ${concurrentUsers}
        - Successful: ${successfulRegistrations.length}
        - Failed: ${results.length - successfulRegistrations.length}
        - Total execution time: ${totalTime}ms
        - Average individual time: ${averageTime.toFixed(2)}ms`);
      
      // Performance assertions for concurrent execution
      expect(successfulRegistrations.length).toBeGreaterThan(concurrentUsers * 0.6); // 60% success rate for concurrent
      expect(totalTime).toBeLessThan(20000); // Total time under 20 seconds
      expect(averageTime).toBeLessThan(12000); // Average individual time under 12 seconds
    });
  });

  test.describe('Memory and Resource Tests', () => {
    test('REG_PERF_005: Memory usage during form interactions', async ({ page }) => {
      await registrationPage.navigateToRegistrationPage();
      
      // Get initial memory usage
      const initialMetrics = await page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
          totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0
        };
      });
      
      // Perform multiple form interactions
      for (let i = 0; i < 10; i++) {
        const user = TestDataGenerator.generateValidUser();
        await registrationPage.fillRegistrationForm(user);
        await registrationPage.clearAllFields();
      }
      
      // Get final memory usage
      const finalMetrics = await page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
          totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0
        };
      });
      
      const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
      
      console.log(`Memory Usage:
        - Initial: ${(initialMetrics.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB
        - Final: ${(finalMetrics.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB
        - Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      
      // Memory should not increase significantly (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('REG_PERF_006: Network performance monitoring', async ({ page }) => {
      // Monitor network requests
      const networkRequests: any[] = [];
      
      page.on('request', request => {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      });
      
      page.on('response', response => {
        const request = networkRequests.find(req => req.url === response.url());
        if (request) {
          request.responseTime = Date.now() - request.timestamp;
          request.status = response.status();
          request.size = response.headers()['content-length'] || 0;
        }
      });
      
      await registrationPage.navigateToRegistrationPage();
      
      const validUser = TestDataGenerator.generateValidUser();
      await registrationPage.registerUser(validUser);
      
      // Wait for all network requests to complete
      await page.waitForLoadState('networkidle');
      
      // Analyze network performance
      const completedRequests = networkRequests.filter(req => req.responseTime);
      const averageResponseTime = completedRequests.reduce((sum, req) => sum + req.responseTime, 0) / completedRequests.length;
      const slowRequests = completedRequests.filter(req => req.responseTime > 3000);
      
      console.log(`Network Performance:
        - Total requests: ${networkRequests.length}
        - Completed requests: ${completedRequests.length}
        - Average response time: ${averageResponseTime.toFixed(2)}ms
        - Slow requests (>3s): ${slowRequests.length}`);
      
      // Network performance assertions
      expect(averageResponseTime).toBeLessThan(2000); // Average response time under 2 seconds
      expect(slowRequests.length).toBeLessThan(completedRequests.length * 0.1); // Less than 10% slow requests
    });
  });

  test.describe('Stress Testing', () => {
    test('REG_PERF_007: Form field stress test', async () => {
      await registrationPage.navigateToRegistrationPage();
      
      const startTime = Date.now();
      
      // Rapidly fill and clear form fields
      for (let i = 0; i < 50; i++) {
        const user = TestDataGenerator.generateValidUser();
        
        await registrationPage.fillFirstName(user.firstName);
        await registrationPage.fillLastName(user.lastName);
        await registrationPage.fillEmail(user.email);
        await registrationPage.fillPassword(user.password);
        await registrationPage.fillConfirmPassword(user.confirmPassword);
        
        // Clear fields
        await registrationPage.clearAllFields();
      }
      
      const totalTime = Date.now() - startTime;
      
      console.log(`Stress test completed in ${totalTime}ms`);
      
      // Verify form is still functional after stress test
      const finalUser = TestDataGenerator.generateValidUser();
      await registrationPage.registerUser(finalUser);
      await registrationPage.verifySuccessfulRegistration();
      
      // Stress test should complete within reasonable time
      expect(totalTime).toBeLessThan(30000); // 30 seconds for 50 iterations
    });
  });

  test.describe('Browser Performance Tests', () => {
    test('REG_PERF_008: Performance across different viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1920, height: 1080, name: 'Desktop' }
      ];
      
      const results: any[] = [];
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        const startTime = Date.now();
        await registrationPage.navigateToRegistrationPage();
        await registrationPage.verifyPageLoaded();
        const loadTime = Date.now() - startTime;
        
        const user = TestDataGenerator.generateValidUser();
        
        const formStartTime = Date.now();
        await registrationPage.registerUser(user);
        await registrationPage.verifySuccessfulRegistration();
        const formTime = Date.now() - formStartTime;
        
        results.push({
          viewport: viewport.name,
          loadTime,
          formTime,
          totalTime: loadTime + formTime
        });
        
        console.log(`${viewport.name} (${viewport.width}x${viewport.height}):
          - Load time: ${loadTime}ms
          - Form time: ${formTime}ms
          - Total time: ${loadTime + formTime}ms`);
        
        // Navigate away for next test
        await registrationPage.clickContinueButton();
      }
      
      // Performance should be consistent across viewports
      const maxLoadTime = Math.max(...results.map(r => r.loadTime));
      const maxFormTime = Math.max(...results.map(r => r.formTime));
      
      expect(maxLoadTime).toBeLessThan(8000); // Load time under 8 seconds on any viewport
      expect(maxFormTime).toBeLessThan(12000); // Form submission under 12 seconds on any viewport
    });
  });
});