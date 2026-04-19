import { test, expect, apiTest } from '../../src/core/base-test';

test.describe('User Management API', () => {
  let userId: string;
  let authToken: string;

  test.beforeAll(async ({ api, testData }) => {
    // Get authentication token
    const loginResponse = await api.post('/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();
    authToken = loginData.token;
  });

  apiTest('should create a new user @api @crud', async ({ api, testData, logger }) => {
    logger.info('Testing user creation API');
    
    const userData = await testData.generateUser();
    
    const response = await api.post('/api/users', userData, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      validateSchema: true,
      captureMetrics: true
    });
    
    expect(response.status()).toBe(201);
    
    const responseData = await response.json();
    expect(responseData).toHaveProperty('id');
    expect(responseData.email).toBe(userData.email);
    expect(responseData.username).toBe(userData.username);
    expect(responseData).not.toHaveProperty('password'); // Password should not be returned
    
    userId = responseData.id;
    
    // Validate response schema
    const userSchema = {
      type: 'object',
      required: ['id', 'username', 'email', 'createdAt'],
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        email: { type: 'string', format: 'email' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { type: 'string', enum: ['user', 'admin', 'moderator'] },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    };
    
    expect(await api.validateSchema(responseData, userSchema)).toBe(true);
    
    logger.info(`User created successfully with ID: ${userId}`);
  });

  apiTest('should retrieve user by ID @api @crud', async ({ api, logger }) => {
    logger.info(`Testing user retrieval for ID: ${userId}`);
    
    const response = await api.get(`/api/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      validateSchema: true,
      captureMetrics: true
    });
    
    expect(response.status()).toBe(200);
    
    const userData = await response.json();
    expect(userData.id).toBe(userId);
    expect(userData).toHaveProperty('username');
    expect(userData).toHaveProperty('email');
    
    logger.info('User retrieval test completed');
  });

  apiTest('should update user information @api @crud', async ({ api, testData, logger }) => {
    logger.info(`Testing user update for ID: ${userId}`);
    
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
      email: 'updated@example.com'
    };
    
    const response = await api.put(`/api/users/${userId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      validateSchema: true,
      captureMetrics: true
    });
    
    expect(response.status()).toBe(200);
    
    const updatedUser = await response.json();
    expect(updatedUser.firstName).toBe(updateData.firstName);
    expect(updatedUser.lastName).toBe(updateData.lastName);
    expect(updatedUser.email).toBe(updateData.email);
    expect(updatedUser.updatedAt).not.toBe(updatedUser.createdAt);
    
    logger.info('User update test completed');
  });

  apiTest('should list users with pagination @api @functional', async ({ api, logger }) => {
    logger.info('Testing user listing with pagination');
    
    const response = await api.get('/api/users?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      validateSchema: true,
      captureMetrics: true
    });
    
    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData).toHaveProperty('users');
    expect(responseData).toHaveProperty('pagination');
    expect(Array.isArray(responseData.users)).toBe(true);
    
    const pagination = responseData.pagination;
    expect(pagination).toHaveProperty('page');
    expect(pagination).toHaveProperty('limit');
    expect(pagination).toHaveProperty('total');
    expect(pagination).toHaveProperty('totalPages');
    
    // Validate pagination schema
    const paginationSchema = {
      type: 'object',
      required: ['page', 'limit', 'total', 'totalPages'],
      properties: {
        page: { type: 'number', minimum: 1 },
        limit: { type: 'number', minimum: 1 },
        total: { type: 'number', minimum: 0 },
        totalPages: { type: 'number', minimum: 0 }
      }
    };
    
    expect(await api.validateSchema(pagination, paginationSchema)).toBe(true);
    
    logger.info('User listing test completed');
  });

  apiTest('should search users by criteria @api @functional', async ({ api, logger }) => {
    logger.info('Testing user search functionality');
    
    const searchCriteria = {
      email: 'updated@example.com',
      isActive: true
    };
    
    const response = await api.post('/api/users/search', searchCriteria, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      validateSchema: true,
      captureMetrics: true
    });
    
    expect(response.status()).toBe(200);
    
    const searchResults = await response.json();
    expect(Array.isArray(searchResults)).toBe(true);
    expect(searchResults.length).toBeGreaterThan(0);
    
    // Verify search results match criteria
    const foundUser = searchResults.find(user => user.id === userId);
    expect(foundUser).toBeDefined();
    expect(foundUser.email).toBe(searchCriteria.email);
    
    logger.info('User search test completed');
  });

  apiTest('should handle user role management @api @authorization', async ({ api, logger }) => {
    logger.info('Testing user role management');
    
    // Update user role
    const roleUpdateData = { role: 'moderator' };
    
    const response = await api.put(`/api/users/${userId}/role`, roleUpdateData, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      validateSchema: true,
      captureMetrics: true
    });
    
    expect(response.status()).toBe(200);
    
    const updatedUser = await response.json();
    expect(updatedUser.role).toBe('moderator');
    
    // Verify role change in user details
    const getUserResponse = await api.get(`/api/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const userDetails = await getUserResponse.json();
    expect(userDetails.role).toBe('moderator');
    
    logger.info('User role management test completed');
  });

  apiTest('should validate input data @api @validation', async ({ api, logger }) => {
    logger.info('Testing input validation');
    
    // Test invalid email format
    const invalidUserData = {
      username: 'testuser',
      email: 'invalid-email',
      password: 'password123'
    };
    
    const response = await api.post('/api/users', invalidUserData, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(response.status()).toBe(400);
    
    const errorResponse = await response.json();
    expect(errorResponse).toHaveProperty('errors');
    expect(errorResponse.errors).toContain('Invalid email format');
    
    // Test missing required fields
    const incompleteData = {
      username: 'testuser'
      // Missing email and password
    };
    
    const response2 = await api.post('/api/users', incompleteData, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(response2.status()).toBe(400);
    
    const errorResponse2 = await response2.json();
    expect(errorResponse2.errors).toContain('Email is required');
    expect(errorResponse2.errors).toContain('Password is required');
    
    logger.info('Input validation test completed');
  });

  apiTest('should handle authentication and authorization @api @security', async ({ api, logger }) => {
    logger.info('Testing authentication and authorization');
    
    // Test without authentication token
    const response1 = await api.get('/api/users');
    expect(response1.status()).toBe(401);
    
    // Test with invalid token
    const response2 = await api.get('/api/users', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    expect(response2.status()).toBe(401);
    
    // Test with expired token (simulate)
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
    
    const response3 = await api.get('/api/users', {
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });
    expect(response3.status()).toBe(401);
    
    logger.info('Authentication and authorization test completed');
  });

  apiTest('should handle rate limiting @api @performance', async ({ api, logger }) => {
    logger.info('Testing rate limiting');
    
    // Make multiple rapid requests
    const requests = Array.from({ length: 20 }, (_, i) => 
      api.get(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
    );
    
    const responses = await Promise.all(requests);
    
    // Check if any requests were rate limited
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    
    if (rateLimitedResponses.length > 0) {
      logger.info(`Rate limiting detected: ${rateLimitedResponses.length} requests were throttled`);
      
      // Verify rate limit headers
      const rateLimitResponse = rateLimitedResponses[0];
      const headers = rateLimitResponse.headers();
      
      expect(headers).toHaveProperty('x-ratelimit-limit');
      expect(headers).toHaveProperty('x-ratelimit-remaining');
      expect(headers).toHaveProperty('x-ratelimit-reset');
    } else {
      logger.info('No rate limiting detected in this test run');
    }
    
    logger.info('Rate limiting test completed');
  });

  apiTest('should perform batch operations @api @performance', async ({ api, testData, logger }) => {
    logger.info('Testing batch user operations');
    
    // Create multiple users in batch
    const batchUserData = await Promise.all([
      testData.generateUser(),
      testData.generateUser(),
      testData.generateUser()
    ]);
    
    const batchCreateResponse = await api.post('/api/users/batch', {
      users: batchUserData
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      timeout: 10000 // Longer timeout for batch operations
    });
    
    expect(batchCreateResponse.status()).toBe(201);
    
    const batchResult = await batchCreateResponse.json();
    expect(batchResult).toHaveProperty('created');
    expect(batchResult).toHaveProperty('failed');
    expect(batchResult.created.length).toBe(3);
    expect(batchResult.failed.length).toBe(0);
    
    // Store created user IDs for cleanup
    const createdUserIds = batchResult.created.map(user => user.id);
    
    // Batch delete
    const batchDeleteResponse = await api.delete('/api/users/batch', {
      userIds: createdUserIds
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(batchDeleteResponse.status()).toBe(200);
    
    logger.info('Batch operations test completed');
  });

  apiTest('should delete user @api @crud', async ({ api, logger }) => {
    logger.info(`Testing user deletion for ID: ${userId}`);
    
    const response = await api.delete(`/api/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      captureMetrics: true
    });
    
    expect(response.status()).toBe(204);
    
    // Verify user is deleted
    const getResponse = await api.get(`/api/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(getResponse.status()).toBe(404);
    
    logger.info('User deletion test completed');
  });

  test.afterAll(async ({ api, logger }) => {
    // Get API performance summary
    const performanceSummary = api.getPerformanceSummary();
    
    logger.info('API Test Performance Summary:', {
      totalRequests: performanceSummary.totalRequests,
      averageResponseTime: `${performanceSummary.averageResponseTime}ms`,
      errorRate: `${performanceSummary.errorRate}%`,
      slowestRequest: performanceSummary.slowestRequest ? 
        `${performanceSummary.slowestRequest.method} ${performanceSummary.slowestRequest.endpoint} (${performanceSummary.slowestRequest.responseTime}ms)` : 
        'None',
    });
    
    // Export metrics for analysis
    await api.exportMetrics('test-results/api-metrics.json');
    
    // Reset metrics for next test suite
    api.resetMetrics();
  });
});