/**
 * Enterprise API Test Example
 * Demonstrates comprehensive API testing for Fortune 500 environments
 */

import { test, expect, apiTest } from '../../src/core/base-test';
import { UserClient } from '../../src/layers/business/api-clients/user-client';
import { OrderClient } from '../../src/layers/business/api-clients/order-client';
import { UserValidator } from '../../src/layers/business/validators/user-validator';
import { UserBuilder } from '../../src/layers/business/builders/user-builder';
import { OrderBuilder } from '../../src/layers/business/builders/order-builder';

test.describe('User Management API Suite', () => {
  let userClient: UserClient;
  let orderClient: OrderClient;
  let userValidator: UserValidator;
  let authToken: string;

  test.beforeAll(async ({ api, testData, logger, tenantContext }) => {
    // Initialize API clients with tenant context
    userClient = new UserClient(api, tenantContext, logger);
    orderClient = new OrderClient(api, tenantContext, logger);
    userValidator = new UserValidator(logger);

    // Authenticate and get token
    const authResponse = await api.post('/api/v1/auth/login', {
      username: 'api-test-user',
      password: process.env.API_TEST_PASSWORD,
      tenantId: tenantContext.tenantId
    }, {
      validateSchema: true,
      captureMetrics: true
    });

    expect(authResponse.status()).toBe(200);
    const authData = await authResponse.json();
    authToken = authData.accessToken;

    logger.info('API test suite initialized', {
      tenantId: tenantContext.tenantId,
      authToken: authToken.substring(0, 10) + '...'
    });
  });

  apiTest('should create user with comprehensive validation @api @crud @smoke', async ({ 
    api, 
    testData, 
    logger,
    performance,
    security 
  }) => {
    // Start performance monitoring
    await performance.startMonitoring('user_creation');

    // Generate test user data
    const userData = new UserBuilder()
      .withValidData()
      .withTenant(test.info().project?.metadata?.tenantId)
      .withRole('customer')
      .build();

    logger.info('Creating user via API', { 
      email: userData.email,
      role: userData.role 
    });

    // Create user via API
    const createResponse = await userClient.createUser(userData, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      validateSchema: true,
      validateContract: true,
      captureMetrics: true
    });

    // Validate response
    expect(createResponse.status()).toBe(201);
    
    const createdUser = await createResponse.json();
    expect(createdUser).toHaveProperty('id');
    expect(createdUser.email).toBe(userData.email);
    expect(createdUser.firstName).toBe(userData.firstName);
    expect(createdUser.lastName).toBe(userData.lastName);
    expect(createdUser).not.toHaveProperty('password'); // Security check

    // Business validation
    const validationResult = await userValidator.validateUser(createdUser);
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);

    // Verify user in database
    await expect(createdUser).toHaveRecordInDatabase('users', { 
      id: createdUser.id,
      email: userData.email 
    });

    // Security validation
    const securityCheck = await security.validateAPIResponse(createResponse);
    expect(securityCheck.hasSecurityHeaders).toBe(true);
    expect(securityCheck.exposesInternalData).toBe(false);

    // Performance validation
    const performanceMetrics = await performance.stopMonitoring('user_creation');
    expect(performanceMetrics.responseTime).toBeLessThan(500); // 500ms max
    
    logger.info('User creation completed', {
      userId: createdUser.id,
      responseTime: performanceMetrics.responseTime
    });

    // Store for cleanup
    test.info().annotations.push({ 
      type: 'cleanup', 
      description: `user:${createdUser.id}` 
    });
  });

  apiTest('should handle concurrent user operations @api @load @scalability', async ({ 
    api, 
    logger,
    performance 
  }) => {
    const concurrentRequests = 20;
    const users = [];

    // Generate test users
    for (let i = 0; i < concurrentRequests; i++) {
      users.push(new UserBuilder()
        .withValidData()
        .withUniqueIdentifier(i)
        .build());
    }

    logger.info(`Starting concurrent API test with ${concurrentRequests} requests`);

    // Execute concurrent user creation
    await performance.startMonitoring('concurrent_user_creation');
    
    const createPromises = users.map(async (userData, index) => {
      try {
        const response = await userClient.createUser(userData, {
          headers: { 'Authorization': `Bearer ${authToken}` },
          captureMetrics: true,
          timeout: 10000
        });
        
        return {
          index,
          success: response.status() === 201,
          status: response.status(),
          user: response.status() === 201 ? await response.json() : null
        };
      } catch (error) {
        return {
          index,
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.allSettled(createPromises);
    const concurrentMetrics = await performance.stopMonitoring('concurrent_user_creation');

    // Analyze results
    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - successful;
    const successRate = (successful / results.length) * 100;

    // Validate performance
    expect(successRate).toBeGreaterThan(95); // 95% success rate minimum
    expect(concurrentMetrics.duration).toBeLessThan(15000); // 15 seconds max
    expect(concurrentMetrics.averageResponseTime).toBeLessThan(1000); // 1 second average

    logger.info('Concurrent API test completed', {
      totalRequests: concurrentRequests,
      successful,
      failed,
      successRate: `${successRate}%`,
      totalDuration: concurrentMetrics.duration,
      averageResponseTime: concurrentMetrics.averageResponseTime
    });

    // Store successful users for cleanup
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success && result.value.user) {
        test.info().annotations.push({ 
          type: 'cleanup', 
          description: `user:${result.value.user.id}` 
        });
      }
    });
  });

  apiTest('should validate API contract compliance @api @contract @integration', async ({ 
    api, 
    logger 
  }) => {
    // Test API contract compliance using Pact-style validation
    const userData = new UserBuilder().withValidData().build();

    logger.info('Testing API contract compliance');

    // Create user
    const createResponse = await userClient.createUser(userData, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      validateContract: true
    });

    expect(createResponse.status()).toBe(201);
    const createdUser = await createResponse.json();

    // Validate response schema
    const userSchema = {
      type: 'object',
      required: ['id', 'email', 'firstName', 'lastName', 'createdAt'],
      properties: {
        id: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' },
        email: { type: 'string', format: 'email' },
        firstName: { type: 'string', minLength: 1 },
        lastName: { type: 'string', minLength: 1 },
        role: { type: 'string', enum: ['admin', 'user', 'customer'] },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      },
      additionalProperties: false
    };

    expect(await api.validateSchema(createdUser, userSchema)).toBe(true);

    // Test GET endpoint contract
    const getResponse = await userClient.getUserById(createdUser.id, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      validateContract: true
    });

    expect(getResponse.status()).toBe(200);
    const retrievedUser = await getResponse.json();
    expect(await api.validateSchema(retrievedUser, userSchema)).toBe(true);

    // Test UPDATE endpoint contract
    const updateData = { firstName: 'Updated' };
    const updateResponse = await userClient.updateUser(createdUser.id, updateData, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      validateContract: true
    });

    expect(updateResponse.status()).toBe(200);
    const updatedUser = await updateResponse.json();
    expect(await api.validateSchema(updatedUser, userSchema)).toBe(true);
    expect(updatedUser.firstName).toBe('Updated');

    logger.info('API contract compliance validated');

    // Store for cleanup
    test.info().annotations.push({ 
      type: 'cleanup', 
      description: `user:${createdUser.id}` 
    });
  });

  apiTest('should handle API security scenarios @api @security @owasp', async ({ 
    api, 
    logger,
    security 
  }) => {
    logger.info('Testing API security scenarios');

    // Test 1: SQL Injection Prevention
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --"
    ];

    for (const payload of sqlInjectionPayloads) {
      const maliciousData = new UserBuilder()
        .withValidData()
        .withFirstName(payload)
        .build();

      const response = await userClient.createUser(maliciousData, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      // Should either reject with 400 or sanitize the input
      if (response.status() === 201) {
        const user = await response.json();
        expect(user.firstName).not.toContain('DROP TABLE');
        expect(user.firstName).not.toContain('UNION SELECT');
        
        // Store for cleanup
        test.info().annotations.push({ 
          type: 'cleanup', 
          description: `user:${user.id}` 
        });
      } else {
        expect([400, 422]).toContain(response.status());
      }
    }

    // Test 2: XSS Prevention
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("xss")'
    ];

    for (const payload of xssPayloads) {
      const xssData = new UserBuilder()
        .withValidData()
        .withFirstName(payload)
        .build();

      const response = await userClient.createUser(xssData, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.status() === 201) {
        const user = await response.json();
        expect(user.firstName).not.toContain('<script>');
        expect(user.firstName).not.toContain('javascript:');
        
        // Store for cleanup
        test.info().annotations.push({ 
          type: 'cleanup', 
          description: `user:${user.id}` 
        });
      }
    }

    // Test 3: Authentication bypass attempts
    const bypassAttempts = [
      '', // Empty token
      'Bearer invalid-token',
      'Bearer ' + 'a'.repeat(1000), // Oversized token
      'Basic dGVzdDp0ZXN0' // Wrong auth type
    ];

    for (const authHeader of bypassAttempts) {
      const response = await api.get('/api/v1/users/profile', {
        headers: { 'Authorization': authHeader }
      });

      expect(response.status()).toBe(401);
    }

    // Test 4: Rate limiting
    const rateLimitTest = await security.testRateLimit('/api/v1/users', {
      method: 'POST',
      requestCount: 100,
      timeWindow: 60000, // 1 minute
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(rateLimitTest.rateLimitTriggered).toBe(true);
    expect(rateLimitTest.blockedRequests).toBeGreaterThan(0);

    logger.info('API security scenarios completed');
  });

  apiTest('should validate data integrity across services @api @integration @data', async ({ 
    api, 
    db,
    logger 
  }) => {
    logger.info('Testing data integrity across services');

    // Create user via API
    const userData = new UserBuilder().withValidData().build();
    const createResponse = await userClient.createUser(userData, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(createResponse.status()).toBe(201);
    const createdUser = await createResponse.json();

    // Verify data consistency in database
    const dbUser = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [createdUser.id]
    );

    expect(dbUser.rows).toHaveLength(1);
    expect(dbUser.rows[0].email).toBe(userData.email);
    expect(dbUser.rows[0].first_name).toBe(userData.firstName);

    // Create order for the user
    const orderData = new OrderBuilder()
      .withUserId(createdUser.id)
      .withValidItems()
      .build();

    const orderResponse = await orderClient.createOrder(orderData, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(orderResponse.status()).toBe(201);
    const createdOrder = await orderResponse.json();

    // Verify foreign key relationship
    const dbOrder = await db.query(
      'SELECT * FROM orders WHERE id = $1',
      [createdOrder.id]
    );

    expect(dbOrder.rows).toHaveLength(1);
    expect(dbOrder.rows[0].user_id).toBe(createdUser.id);

    // Test cascade operations
    const deleteResponse = await userClient.deleteUser(createdUser.id, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(deleteResponse.status()).toBe(204);

    // Verify cascade delete or proper handling
    const deletedUser = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [createdUser.id]
    );

    expect(deletedUser.rows).toHaveLength(0);

    // Check order handling (should be deleted or user_id nullified)
    const orphanedOrder = await db.query(
      'SELECT * FROM orders WHERE id = $1',
      [createdOrder.id]
    );

    if (orphanedOrder.rows.length > 0) {
      expect(orphanedOrder.rows[0].user_id).toBeNull();
    }

    logger.info('Data integrity validation completed');
  });

  apiTest('should handle API versioning and backward compatibility @api @versioning @compatibility', async ({ 
    api, 
    logger 
  }) => {
    logger.info('Testing API versioning and backward compatibility');

    const userData = new UserBuilder().withValidData().build();

    // Test v1 API
    const v1Response = await api.post('/api/v1/users', userData, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json',
        'API-Version': 'v1'
      }
    });

    expect(v1Response.status()).toBe(201);
    const v1User = await v1Response.json();

    // Test v2 API (if available)
    const v2Response = await api.post('/api/v2/users', userData, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json',
        'API-Version': 'v2'
      }
    });

    // v2 might have different response structure but should be compatible
    if (v2Response.status() === 201) {
      const v2User = await v2Response.json();
      
      // Core fields should be present in both versions
      expect(v2User).toHaveProperty('id');
      expect(v2User).toHaveProperty('email');
      expect(v2User.email).toBe(userData.email);

      // Store for cleanup
      test.info().annotations.push({ 
        type: 'cleanup', 
        description: `user:${v2User.id}` 
      });
    }

    // Test deprecated endpoint handling
    const deprecatedResponse = await api.get('/api/v1/users/deprecated-endpoint', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    // Should return deprecation warning in headers
    if (deprecatedResponse.status() === 200) {
      const headers = deprecatedResponse.headers();
      expect(headers).toHaveProperty('deprecation-warning');
    }

    // Store for cleanup
    test.info().annotations.push({ 
      type: 'cleanup', 
      description: `user:${v1User.id}` 
    });

    logger.info('API versioning test completed');
  });

  test.afterEach(async ({ logger }) => {
    // Cleanup created resources
    const cleanupItems = test.info().annotations
      .filter(annotation => annotation.type === 'cleanup')
      .map(annotation => annotation.description);

    for (const item of cleanupItems) {
      try {
        if (item.startsWith('user:')) {
          const userId = item.replace('user:', '');
          await userClient.deleteUser(userId, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          logger.info(`Cleaned up user: ${userId}`);
        }
      } catch (error) {
        logger.warn(`Cleanup failed for ${item}:`, error.message);
      }
    }
  });

  test.afterAll(async ({ api, logger }) => {
    // Get API performance summary
    const performanceSummary = api.getPerformanceSummary();
    
    logger.info('API Test Suite Performance Summary:', {
      totalRequests: performanceSummary.totalRequests,
      averageResponseTime: `${performanceSummary.averageResponseTime}ms`,
      errorRate: `${performanceSummary.errorRate}%`,
      slowestRequest: performanceSummary.slowestRequest ? 
        `${performanceSummary.slowestRequest.method} ${performanceSummary.slowestRequest.endpoint} (${performanceSummary.slowestRequest.responseTime}ms)` : 
        'None'
    });

    // Export metrics for analysis
    await api.exportMetrics('reports/api-test-metrics.json');
  });
});

/**
 * Enterprise API Test Features Demonstrated:
 * 
 * 1. Comprehensive CRUD Operations: Create, Read, Update, Delete with validation
 * 2. Performance Testing: Response time monitoring and concurrent load testing
 * 3. Security Testing: SQL injection, XSS, authentication, rate limiting
 * 4. Contract Testing: Schema validation and API contract compliance
 * 5. Data Integrity: Cross-service data consistency validation
 * 6. Scalability Testing: Concurrent API operations with performance metrics
 * 7. Versioning Support: API version compatibility testing
 * 8. Error Handling: Comprehensive error scenario coverage
 * 9. Multi-tenant Support: Tenant-aware API testing
 * 10. Automated Cleanup: Resource cleanup after test execution
 */