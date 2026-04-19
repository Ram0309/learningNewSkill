/**
 * Enterprise Database Test Example
 * Demonstrates comprehensive database testing for Fortune 500 environments
 */

import { test, expect, dbTest } from '../../src/core/base-test';
import { DatabaseClient } from '../../src/layers/business/api-clients/database-client';
import { DataValidator } from '../../src/layers/business/validators/data-validator';
import { UserBuilder } from '../../src/layers/business/builders/user-builder';
import { OrderBuilder } from '../../src/layers/business/builders/order-builder';

test.describe('Database Integrity & Performance Suite', () => {
  let dbClient: DatabaseClient;
  let dataValidator: DataValidator;
  let testSchema: string;

  test.beforeAll(async ({ db, testData, logger, tenantContext }) => {
    // Initialize database client with tenant isolation
    dbClient = new DatabaseClient(db, tenantContext, logger);
    dataValidator = new DataValidator(logger);
    testSchema = `tenant_${tenantContext.tenantId}_test`;

    // Create isolated test schema
    await dbClient.createSchema(testSchema);
    await dbClient.setupTestTables(testSchema);

    logger.info('Database test suite initialized', {
      tenantId: tenantContext.tenantId,
      testSchema
    });
  });

  dbTest('should validate data integrity constraints @database @integrity @critical', async ({ 
    db, 
    logger,
    performance 
  }) => {
    await performance.startMonitoring('data_integrity_test');

    // Test 1: Primary Key Constraints
    const user1 = new UserBuilder().withValidData().build();
    const insertResult1 = await dbClient.insertUser(testSchema, user1);
    expect(insertResult1.success).toBe(true);

    // Attempt duplicate primary key insertion
    const duplicateResult = await dbClient.insertUser(testSchema, { ...user1, id: user1.id });
    expect(duplicateResult.success).toBe(false);
    expect(duplicateResult.error).toContain('duplicate key');

    // Test 2: Foreign Key Constraints
    const order = new OrderBuilder()
      .withUserId(user1.id)
      .withValidItems()
      .build();

    const orderResult = await dbClient.insertOrder(testSchema, order);
    expect(orderResult.success).toBe(true);

    // Attempt invalid foreign key
    const invalidOrder = new OrderBuilder()
      .withUserId('non-existent-user-id')
      .withValidItems()
      .build();

    const invalidOrderResult = await dbClient.insertOrder(testSchema, invalidOrder);
    expect(invalidOrderResult.success).toBe(false);
    expect(invalidOrderResult.error).toContain('foreign key');

    // Test 3: Check Constraints
    const invalidUser = new UserBuilder()
      .withValidData()
      .withAge(-5) // Invalid age
      .build();

    const invalidUserResult = await dbClient.insertUser(testSchema, invalidUser);
    expect(invalidUserResult.success).toBe(false);
    expect(invalidUserResult.error).toContain('check constraint');

    // Test 4: Unique Constraints
    const user2 = new UserBuilder()
      .withValidData()
      .withEmail(user1.email) // Duplicate email
      .build();

    const duplicateEmailResult = await dbClient.insertUser(testSchema, user2);
    expect(duplicateEmailResult.success).toBe(false);
    expect(duplicateEmailResult.error).toContain('unique constraint');

    const metrics = await performance.stopMonitoring('data_integrity_test');
    expect(metrics.duration).toBeLessThan(5000); // 5 seconds max

    logger.info('Data integrity constraints validated', {
      duration: metrics.duration
    });
  });

  dbTest('should handle concurrent database operations @database @concurrency @load', async ({ 
    db, 
    logger,
    performance 
  }) => {
    const concurrentOperations = 50;
    const users = [];

    // Generate test users
    for (let i = 0; i < concurrentOperations; i++) {
      users.push(new UserBuilder()
        .withValidData()
        .withUniqueIdentifier(i)
        .build());
    }

    logger.info(`Starting concurrent database test with ${concurrentOperations} operations`);

    await performance.startMonitoring('concurrent_db_operations');

    // Execute concurrent insertions
    const insertPromises = users.map(async (user, index) => {
      try {
        const result = await dbClient.insertUser(testSchema, user);
        return {
          index,
          success: result.success,
          userId: result.success ? user.id : null,
          error: result.error
        };
      } catch (error) {
        return {
          index,
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.allSettled(insertPromises);
    const concurrentMetrics = await performance.stopMonitoring('concurrent_db_operations');

    // Analyze results
    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - successful;
    const successRate = (successful / results.length) * 100;

    // Validate performance
    expect(successRate).toBeGreaterThan(98); // 98% success rate minimum
    expect(concurrentMetrics.duration).toBeLessThan(10000); // 10 seconds max
    expect(concurrentMetrics.averageResponseTime).toBeLessThan(200); // 200ms average

    // Verify data consistency
    const totalUsers = await dbClient.countUsers(testSchema);
    expect(totalUsers).toBe(successful + 1); // +1 for user from previous test

    logger.info('Concurrent database operations completed', {
      totalOperations: concurrentOperations,
      successful,
      failed,
      successRate: `${successRate}%`,
      totalDuration: concurrentMetrics.duration,
      averageResponseTime: concurrentMetrics.averageResponseTime
    });
  });

  dbTest('should validate complex queries and joins @database @performance @queries', async ({ 
    db, 
    logger,
    performance 
  }) => {
    // Setup test data
    const users = [];
    const orders = [];

    for (let i = 0; i < 10; i++) {
      const user = new UserBuilder()
        .withValidData()
        .withUniqueIdentifier(i + 100)
        .build();
      
      await dbClient.insertUser(testSchema, user);
      users.push(user);

      // Create multiple orders per user
      for (let j = 0; j < 3; j++) {
        const order = new OrderBuilder()
          .withUserId(user.id)
          .withValidItems()
          .withUniqueIdentifier(i * 3 + j)
          .build();
        
        await dbClient.insertOrder(testSchema, order);
        orders.push(order);
      }
    }

    logger.info('Test data setup completed', {
      users: users.length,
      orders: orders.length
    });

    // Test 1: Complex JOIN query
    await performance.startMonitoring('complex_join_query');
    
    const joinQuery = `
      SELECT 
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MAX(o.created_at) as last_order_date
      FROM ${testSchema}.users u
      LEFT JOIN ${testSchema}.orders o ON u.id = o.user_id
      WHERE u.is_active = true
      GROUP BY u.id, u.email, u.first_name, u.last_name
      HAVING COUNT(o.id) > 0
      ORDER BY total_spent DESC
      LIMIT 10
    `;

    const joinResult = await dbClient.executeQuery(joinQuery);
    const joinMetrics = await performance.stopMonitoring('complex_join_query');

    expect(joinResult.rows.length).toBeGreaterThan(0);
    expect(joinResult.rows.length).toBeLessThanOrEqual(10);
    expect(joinMetrics.duration).toBeLessThan(1000); // 1 second max

    // Validate query results
    for (const row of joinResult.rows) {
      expect(row.user_id).toBeDefined();
      expect(row.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(row.order_count).toBeGreaterThan(0);
      expect(row.total_spent).toBeGreaterThan(0);
    }

    // Test 2: Subquery performance
    await performance.startMonitoring('subquery_performance');
    
    const subqueryQuery = `
      SELECT u.*
      FROM ${testSchema}.users u
      WHERE u.id IN (
        SELECT DISTINCT o.user_id
        FROM ${testSchema}.orders o
        WHERE o.total_amount > (
          SELECT AVG(total_amount)
          FROM ${testSchema}.orders
        )
      )
    `;

    const subqueryResult = await dbClient.executeQuery(subqueryQuery);
    const subqueryMetrics = await performance.stopMonitoring('subquery_performance');

    expect(subqueryResult.rows.length).toBeGreaterThan(0);
    expect(subqueryMetrics.duration).toBeLessThan(2000); // 2 seconds max

    // Test 3: Window function query
    await performance.startMonitoring('window_function_query');
    
    const windowQuery = `
      SELECT 
        o.*,
        ROW_NUMBER() OVER (PARTITION BY o.user_id ORDER BY o.created_at DESC) as order_rank,
        LAG(o.total_amount) OVER (PARTITION BY o.user_id ORDER BY o.created_at) as prev_order_amount,
        SUM(o.total_amount) OVER (PARTITION BY o.user_id) as user_total_spent
      FROM ${testSchema}.orders o
      ORDER BY o.user_id, o.created_at DESC
    `;

    const windowResult = await dbClient.executeQuery(windowQuery);
    const windowMetrics = await performance.stopMonitoring('window_function_query');

    expect(windowResult.rows.length).toBe(orders.length);
    expect(windowMetrics.duration).toBeLessThan(1500); // 1.5 seconds max

    logger.info('Complex queries performance validated', {
      joinQueryTime: joinMetrics.duration,
      subqueryTime: subqueryMetrics.duration,
      windowQueryTime: windowMetrics.duration
    });
  });

  dbTest('should validate data migration and schema changes @database @migration @schema', async ({ 
    db, 
    logger,
    performance 
  }) => {
    logger.info('Testing database migration scenarios');

    // Test 1: Add new column
    await performance.startMonitoring('add_column_migration');
    
    const addColumnResult = await dbClient.executeQuery(`
      ALTER TABLE ${testSchema}.users 
      ADD COLUMN middle_name VARCHAR(100)
    `);
    
    const addColumnMetrics = await performance.stopMonitoring('add_column_migration');
    expect(addColumnMetrics.duration).toBeLessThan(5000); // 5 seconds max

    // Verify column was added
    const columnCheck = await dbClient.executeQuery(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = '${testSchema}' 
      AND table_name = 'users' 
      AND column_name = 'middle_name'
    `);
    
    expect(columnCheck.rows.length).toBe(1);

    // Test 2: Create index
    await performance.startMonitoring('create_index');
    
    await dbClient.executeQuery(`
      CREATE INDEX idx_users_email_${testSchema} 
      ON ${testSchema}.users(email)
    `);
    
    const indexMetrics = await performance.stopMonitoring('create_index');
    expect(indexMetrics.duration).toBeLessThan(3000); // 3 seconds max

    // Test 3: Data migration with transformation
    await performance.startMonitoring('data_migration');
    
    // Update existing records with middle name
    await dbClient.executeQuery(`
      UPDATE ${testSchema}.users 
      SET middle_name = 'Test' 
      WHERE middle_name IS NULL
    `);
    
    const migrationMetrics = await performance.stopMonitoring('data_migration');
    expect(migrationMetrics.duration).toBeLessThan(2000); // 2 seconds max

    // Verify migration
    const migrationCheck = await dbClient.executeQuery(`
      SELECT COUNT(*) as count 
      FROM ${testSchema}.users 
      WHERE middle_name IS NULL
    `);
    
    expect(parseInt(migrationCheck.rows[0].count)).toBe(0);

    logger.info('Database migration scenarios completed', {
      addColumnTime: addColumnMetrics.duration,
      createIndexTime: indexMetrics.duration,
      dataMigrationTime: migrationMetrics.duration
    });
  });

  dbTest('should validate backup and recovery procedures @database @backup @recovery', async ({ 
    db, 
    logger,
    performance 
  }) => {
    logger.info('Testing backup and recovery procedures');

    // Get initial data count
    const initialUserCount = await dbClient.countUsers(testSchema);
    const initialOrderCount = await dbClient.countOrders(testSchema);

    // Test 1: Create backup
    await performance.startMonitoring('create_backup');
    
    const backupResult = await dbClient.createBackup(testSchema, 'test_backup');
    
    const backupMetrics = await performance.stopMonitoring('create_backup');
    expect(backupResult.success).toBe(true);
    expect(backupMetrics.duration).toBeLessThan(30000); // 30 seconds max

    // Test 2: Simulate data loss
    await dbClient.executeQuery(`TRUNCATE TABLE ${testSchema}.orders CASCADE`);
    await dbClient.executeQuery(`TRUNCATE TABLE ${testSchema}.users CASCADE`);

    // Verify data loss
    const afterTruncateUserCount = await dbClient.countUsers(testSchema);
    const afterTruncateOrderCount = await dbClient.countOrders(testSchema);
    
    expect(afterTruncateUserCount).toBe(0);
    expect(afterTruncateOrderCount).toBe(0);

    // Test 3: Restore from backup
    await performance.startMonitoring('restore_backup');
    
    const restoreResult = await dbClient.restoreBackup(testSchema, 'test_backup');
    
    const restoreMetrics = await performance.stopMonitoring('restore_backup');
    expect(restoreResult.success).toBe(true);
    expect(restoreMetrics.duration).toBeLessThan(60000); // 60 seconds max

    // Verify data restoration
    const restoredUserCount = await dbClient.countUsers(testSchema);
    const restoredOrderCount = await dbClient.countOrders(testSchema);
    
    expect(restoredUserCount).toBe(initialUserCount);
    expect(restoredOrderCount).toBe(initialOrderCount);

    logger.info('Backup and recovery procedures validated', {
      initialUsers: initialUserCount,
      initialOrders: initialOrderCount,
      restoredUsers: restoredUserCount,
      restoredOrders: restoredOrderCount,
      backupTime: backupMetrics.duration,
      restoreTime: restoreMetrics.duration
    });
  });

  dbTest('should validate database security and access control @database @security @access', async ({ 
    db, 
    logger,
    security 
  }) => {
    logger.info('Testing database security and access control');

    // Test 1: SQL Injection Prevention
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "' OR '1'='1' --",
      "' UNION SELECT password FROM users --"
    ];

    for (const maliciousInput of maliciousInputs) {
      const result = await dbClient.findUserByEmail(testSchema, maliciousInput);
      
      // Should return no results or handle safely
      expect(result.rows.length).toBe(0);
      
      // Verify tables still exist
      const tableCheck = await dbClient.executeQuery(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '${testSchema}' 
        AND table_name = 'users'
      `);
      
      expect(tableCheck.rows.length).toBe(1);
    }

    // Test 2: Access Control Validation
    const restrictedQueries = [
      `SELECT * FROM information_schema.tables`,
      `SELECT * FROM pg_user`,
      `SHOW ALL`
    ];

    for (const query of restrictedQueries) {
      try {
        const result = await dbClient.executeQuery(query);
        // If query succeeds, verify it doesn't expose sensitive information
        if (result.rows.length > 0) {
          const sensitiveFields = ['password', 'secret', 'key', 'token'];
          const columns = Object.keys(result.rows[0]);
          
          for (const field of sensitiveFields) {
            expect(columns.some(col => col.toLowerCase().includes(field))).toBe(false);
          }
        }
      } catch (error) {
        // Expected for restricted queries
        expect(error.message).toMatch(/permission denied|access denied|not allowed/i);
      }
    }

    // Test 3: Connection Security
    const connectionSecurity = await security.validateDatabaseConnection(db);
    expect(connectionSecurity.isEncrypted).toBe(true);
    expect(connectionSecurity.hasValidCertificate).toBe(true);
    expect(connectionSecurity.usesStrongAuthentication).toBe(true);

    logger.info('Database security validation completed');
  });

  test.afterEach(async ({ logger }) => {
    // Clean up test data after each test
    try {
      await dbClient.executeQuery(`
        DELETE FROM ${testSchema}.orders 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);
      
      await dbClient.executeQuery(`
        DELETE FROM ${testSchema}.users 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);
      
      logger.info('Test data cleanup completed');
    } catch (error) {
      logger.warn('Cleanup failed:', error.message);
    }
  });

  test.afterAll(async ({ db, logger }) => {
    // Drop test schema
    try {
      await dbClient.dropSchema(testSchema);
      logger.info(`Test schema ${testSchema} dropped`);
    } catch (error) {
      logger.warn(`Failed to drop test schema: ${error.message}`);
    }

    // Export database performance metrics
    const dbMetrics = dbClient.getPerformanceMetrics();
    await dbClient.exportMetrics('reports/database-test-metrics.json');
    
    logger.info('Database Test Suite Performance Summary:', {
      totalQueries: dbMetrics.totalQueries,
      averageQueryTime: `${dbMetrics.averageQueryTime}ms`,
      slowestQuery: dbMetrics.slowestQuery ? 
        `${dbMetrics.slowestQuery.query.substring(0, 50)}... (${dbMetrics.slowestQuery.duration}ms)` : 
        'None',
      connectionPoolStats: dbMetrics.connectionPool
    });
  });
});

/**
 * Enterprise Database Test Features Demonstrated:
 * 
 * 1. Data Integrity: Primary keys, foreign keys, check constraints, unique constraints
 * 2. Concurrency Testing: Concurrent database operations with performance validation
 * 3. Query Performance: Complex joins, subqueries, window functions with timing
 * 4. Schema Migration: DDL operations, index creation, data transformation
 * 5. Backup & Recovery: Backup creation, data loss simulation, restoration validation
 * 6. Security Testing: SQL injection prevention, access control, connection security
 * 7. Performance Monitoring: Query timing, connection pool metrics, resource usage
 * 8. Multi-tenant Isolation: Schema-based tenant separation
 * 9. Data Validation: Business rule validation, data consistency checks
 * 10. Automated Cleanup: Test data cleanup and schema management
 */