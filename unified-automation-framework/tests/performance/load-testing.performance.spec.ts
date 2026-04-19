import { test, expect, performanceTest } from '../../src/core/base-test';

test.describe('Performance Load Testing', () => {
  
  performanceTest('should handle homepage load under normal conditions @performance @load', async ({ 
    performancePage, 
    performance, 
    logger 
  }) => {
    logger.info('Starting homepage load performance test');
    
    // Start performance monitoring
    await performance.startMonitoring('homepage_load');
    
    // Navigate to homepage
    const startTime = Date.now();
    await performancePage.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    // Collect Core Web Vitals
    const webVitals = await performancePage.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay (FID) - simulated
        vitals.fid = 0; // Will be measured during interaction
        
        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
        
        // First Contentful Paint (FCP)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.fcp = entries[0].startTime;
        }).observe({ entryTypes: ['paint'] });
        
        // Time to Interactive (TTI) - approximated
        vitals.tti = performance.now();
        
        setTimeout(() => resolve(vitals), 2000);
      });
    });
    
    // Performance assertions
    expect(loadTime).toBeLessThan(3000); // Page should load within 3 seconds
    expect(webVitals.lcp).toBeLessThan(2500); // LCP should be under 2.5s
    expect(webVitals.fcp).toBeLessThan(1800); // FCP should be under 1.8s
    expect(webVitals.cls).toBeLessThan(0.1); // CLS should be under 0.1
    
    // Memory usage check
    const memoryUsage = await performancePage.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });
    
    if (memoryUsage) {
      const memoryUsagePercent = (memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100;
      expect(memoryUsagePercent).toBeLessThan(50); // Memory usage should be under 50%
    }
    
    // Stop monitoring and collect metrics
    const metrics = await performance.stopMonitoring('homepage_load');
    
    logger.info('Homepage performance metrics:', {
      loadTime: `${loadTime}ms`,
      lcp: `${webVitals.lcp}ms`,
      fcp: `${webVitals.fcp}ms`,
      cls: webVitals.cls,
      memoryUsage: memoryUsage ? `${Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024)}MB` : 'N/A'
    });
  });

  performanceTest('should handle API response times under load @performance @api', async ({ 
    api, 
    performance, 
    logger 
  }) => {
    logger.info('Starting API performance test');
    
    const apiEndpoints = [
      '/api/users',
      '/api/products',
      '/api/orders',
      '/api/analytics/dashboard'
    ];
    
    // Test each endpoint under concurrent load
    for (const endpoint of apiEndpoints) {
      logger.info(`Testing ${endpoint} under load`);
      
      await performance.startMonitoring(`api_${endpoint.replace(/\//g, '_')}`);
      
      // Create 50 concurrent requests
      const concurrentRequests = Array.from({ length: 50 }, () => 
        api.get(endpoint, { 
          timeout: 10000,
          captureMetrics: true 
        })
      );
      
      const startTime = Date.now();
      const responses = await Promise.allSettled(concurrentRequests);
      const endTime = Date.now();
      
      // Analyze results
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const failed = responses.filter(r => r.status === 'rejected').length;
      const successRate = (successful / responses.length) * 100;
      
      // Performance assertions
      expect(successRate).toBeGreaterThan(95); // 95% success rate minimum
      expect(endTime - startTime).toBeLessThan(30000); // All requests within 30 seconds
      
      // Check individual response times
      const successfulResponses = responses
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      for (const response of successfulResponses) {
        expect(response.status()).toBeLessThan(400);
      }
      
      await performance.stopMonitoring(`api_${endpoint.replace(/\//g, '_')}`);
      
      logger.info(`${endpoint} performance results:`, {
        successRate: `${successRate}%`,
        totalTime: `${endTime - startTime}ms`,
        successful,
        failed
      });
      
      // Wait between endpoint tests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  performanceTest('should handle database query performance @performance @database', async ({ 
    db, 
    performance, 
    logger 
  }) => {
    logger.info('Starting database performance test');
    
    await performance.startMonitoring('database_queries');
    
    // Test different types of queries
    const queryTests = [
      {
        name: 'Simple SELECT',
        query: 'SELECT * FROM users LIMIT 100',
        maxTime: 100
      },
      {
        name: 'JOIN Query',
        query: `
          SELECT u.id, u.username, p.title 
          FROM users u 
          LEFT JOIN posts p ON u.id = p.user_id 
          LIMIT 100
        `,
        maxTime: 500
      },
      {
        name: 'Aggregation Query',
        query: `
          SELECT COUNT(*) as total_users, 
                 AVG(age) as avg_age 
          FROM users 
          WHERE created_at > NOW() - INTERVAL '30 days'
        `,
        maxTime: 1000
      },
      {
        name: 'Complex Query with Subquery',
        query: `
          SELECT * FROM users 
          WHERE id IN (
            SELECT user_id FROM orders 
            WHERE total > 100 
            AND created_at > NOW() - INTERVAL '7 days'
          )
        `,
        maxTime: 2000
      }
    ];
    
    for (const queryTest of queryTests) {
      logger.info(`Testing: ${queryTest.name}`);
      
      // Run query multiple times to get average
      const iterations = 10;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        try {
          await db.query(queryTest.query);
          const queryTime = Date.now() - startTime;
          times.push(queryTime);
        } catch (error) {
          logger.error(`Query failed: ${queryTest.name}`, error);
          throw error;
        }
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      // Performance assertions
      expect(avgTime).toBeLessThan(queryTest.maxTime);
      expect(maxTime).toBeLessThan(queryTest.maxTime * 2); // Max time shouldn't be more than 2x expected
      
      logger.info(`${queryTest.name} performance:`, {
        avgTime: `${avgTime.toFixed(2)}ms`,
        minTime: `${minTime}ms`,
        maxTime: `${maxTime}ms`,
        threshold: `${queryTest.maxTime}ms`
      });
    }
    
    await performance.stopMonitoring('database_queries');
  });

  performanceTest('should handle memory usage during extended operations @performance @memory', async ({ 
    performancePage, 
    performance, 
    logger 
  }) => {
    logger.info('Starting memory usage performance test');
    
    await performance.startMonitoring('memory_usage');
    
    // Navigate to a data-heavy page
    await performancePage.goto('/dashboard');
    
    // Get initial memory baseline
    const initialMemory = await performancePage.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });
    
    // Perform memory-intensive operations
    const operations = [
      'Load large dataset',
      'Filter and sort data',
      'Generate charts',
      'Export data',
      'Refresh data multiple times'
    ];
    
    const memorySnapshots = [{ operation: 'Initial', memory: initialMemory }];
    
    for (const operation of operations) {
      logger.info(`Performing: ${operation}`);
      
      switch (operation) {
        case 'Load large dataset':
          await performancePage.click('[data-testid="load-large-dataset"]');
          await performancePage.waitForSelector('[data-testid="dataset-loaded"]', { timeout: 30000 });
          break;
          
        case 'Filter and sort data':
          await performancePage.fill('[data-testid="search-filter"]', 'test filter');
          await performancePage.click('[data-testid="sort-by-date"]');
          await performancePage.waitForTimeout(2000);
          break;
          
        case 'Generate charts':
          await performancePage.click('[data-testid="generate-charts"]');
          await performancePage.waitForSelector('[data-testid="charts-generated"]', { timeout: 15000 });
          break;
          
        case 'Export data':
          await performancePage.click('[data-testid="export-data"]');
          await performancePage.waitForTimeout(3000);
          break;
          
        case 'Refresh data multiple times':
          for (let i = 0; i < 5; i++) {
            await performancePage.click('[data-testid="refresh-data"]');
            await performancePage.waitForTimeout(1000);
          }
          break;
      }
      
      // Take memory snapshot
      const currentMemory = await performancePage.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });
      
      memorySnapshots.push({ operation, memory: currentMemory });
      
      // Force garbage collection if possible
      await performancePage.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      await performancePage.waitForTimeout(1000);
    }
    
    // Analyze memory usage
    const finalMemory = memorySnapshots[memorySnapshots.length - 1].memory;
    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
    
    // Memory assertions
    expect(memoryIncreasePercent).toBeLessThan(200); // Memory shouldn't increase by more than 200%
    expect(finalMemory).toBeLessThan(100 * 1024 * 1024); // Final memory should be under 100MB
    
    // Check for memory leaks (memory should not continuously increase)
    const memoryTrend = memorySnapshots.slice(-3); // Last 3 snapshots
    const isIncreasing = memoryTrend.every((snapshot, index) => 
      index === 0 || snapshot.memory > memoryTrend[index - 1].memory
    );
    
    if (isIncreasing) {
      logger.warn('Potential memory leak detected - memory continuously increasing');
    }
    
    await performance.stopMonitoring('memory_usage');
    
    logger.info('Memory usage analysis:', {
      initialMemory: `${Math.round(initialMemory / 1024 / 1024)}MB`,
      finalMemory: `${Math.round(finalMemory / 1024 / 1024)}MB`,
      increase: `${Math.round(memoryIncrease / 1024 / 1024)}MB (${memoryIncreasePercent.toFixed(1)}%)`,
      snapshots: memorySnapshots.map(s => ({
        operation: s.operation,
        memory: `${Math.round(s.memory / 1024 / 1024)}MB`
      }))
    });
  });

  performanceTest('should handle concurrent user simulation @performance @stress', async ({ 
    performance, 
    logger 
  }) => {
    logger.info('Starting concurrent user simulation');
    
    await performance.startMonitoring('concurrent_users');
    
    // Simulate different user journeys
    const userJourneys = [
      {
        name: 'Browse Products',
        actions: [
          { action: 'goto', url: '/products' },
          { action: 'wait', time: 1000 },
          { action: 'click', selector: '[data-testid="product-1"]' },
          { action: 'wait', time: 2000 },
          { action: 'click', selector: '[data-testid="add-to-cart"]' }
        ]
      },
      {
        name: 'User Registration',
        actions: [
          { action: 'goto', url: '/register' },
          { action: 'fill', selector: '[data-testid="email"]', value: 'test@example.com' },
          { action: 'fill', selector: '[data-testid="password"]', value: 'password123' },
          { action: 'click', selector: '[data-testid="register-button"]' },
          { action: 'wait', time: 3000 }
        ]
      },
      {
        name: 'Search and Filter',
        actions: [
          { action: 'goto', url: '/search' },
          { action: 'fill', selector: '[data-testid="search-input"]', value: 'laptop' },
          { action: 'click', selector: '[data-testid="search-button"]' },
          { action: 'wait', time: 2000 },
          { action: 'click', selector: '[data-testid="price-filter"]' }
        ]
      }
    ];
    
    // Create multiple browser contexts to simulate concurrent users
    const concurrentUsers = 20;
    const userPromises = [];
    
    for (let i = 0; i < concurrentUsers; i++) {
      const journeyIndex = i % userJourneys.length;
      const journey = userJourneys[journeyIndex];
      
      const userPromise = performance.simulateUser(journey, i);
      userPromises.push(userPromise);
    }
    
    // Wait for all users to complete their journeys
    const startTime = Date.now();
    const results = await Promise.allSettled(userPromises);
    const endTime = Date.now();
    
    // Analyze results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const successRate = (successful / results.length) * 100;
    
    // Performance assertions
    expect(successRate).toBeGreaterThan(90); // 90% success rate minimum
    expect(endTime - startTime).toBeLessThan(60000); // All users complete within 60 seconds
    
    await performance.stopMonitoring('concurrent_users');
    
    logger.info('Concurrent user simulation results:', {
      totalUsers: concurrentUsers,
      successful,
      failed,
      successRate: `${successRate}%`,
      totalTime: `${endTime - startTime}ms`,
      avgTimePerUser: `${(endTime - startTime) / concurrentUsers}ms`
    });
  });

  test.afterEach(async ({ performance, logger }) => {
    // Generate performance report
    const performanceReport = await performance.generateReport();
    
    logger.info('Performance test summary:', {
      totalTests: performanceReport.totalTests,
      passedTests: performanceReport.passedTests,
      failedTests: performanceReport.failedTests,
      averageResponseTime: `${performanceReport.averageResponseTime}ms`,
      peakMemoryUsage: `${performanceReport.peakMemoryUsage}MB`
    });
    
    // Export detailed metrics
    await performance.exportMetrics(`test-results/performance-${Date.now()}.json`);
  });
});