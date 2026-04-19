import { test, expect, databaseTest } from '../../src/core/base-test';

test.describe('Database Testing Suite', () => {

  databaseTest('should validate user data integrity @database @integrity', async ({ 
    db, 
    primaryDb, 
    testData, 
    logger 
  }) => {
    logger.info('Testing user data integrity');
    
    // Generate test user data
    const userData = await testData.generateUser();
    
    // Insert user into database
    const insertQuery = `
      INSERT INTO users (username, email, password_hash, first_name, last_name, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, created_at
    `;
    
    const insertResult = await primaryDb.query(insertQuery, [
      userData.username,
      userData.email,
      userData.passwordHash,
      userData.firstName,
      userData.lastName
    ]);
    
    expect(insertResult.rows.length).toBe(1);
    const userId = insertResult.rows[0].id;
    const createdAt = insertResult.rows[0].created_at;
    
    // Verify data was inserted correctly
    const selectQuery = 'SELECT * FROM users WHERE id = $1';
    const selectResult = await primaryDb.query(selectQuery, [userId]);
    
    expect(selectResult.rows.length).toBe(1);
    const insertedUser = selectResult.rows[0];
    
    // Validate all fields
    expect(insertedUser.username).toBe(userData.username);
    expect(insertedUser.email).toBe(userData.email);
    expect(insertedUser.password_hash).toBe(userData.passwordHash);
    expect(insertedUser.first_name).toBe(userData.firstName);
    expect(insertedUser.last_name).toBe(userData.lastName);
    expect(insertedUser.created_at).toEqual(createdAt);
    expect(insertedUser.is_active).toBe(true); // Default value
    
    // Test data constraints
    // Try to insert duplicate username
    try {
      await primaryDb.query(insertQuery, [
        userData.username, // Same username
        'different@email.com',
        'differenthash',
        'Different',
        'User'
      ]);
      
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Should throw constraint violation
      expect(error.message).toMatch(/duplicate key|unique constraint/i);
    }
    
    // Try to insert duplicate email
    try {
      await primaryDb.query(insertQuery, [
        'differentusername',
        userData.email, // Same email
        'differenthash',
        'Different',
        'User'
      ]);
      
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toMatch(/duplicate key|unique constraint/i);
    }
    
    // Cleanup
    await primaryDb.query('DELETE FROM users WHERE id = $1', [userId]);
    
    logger.info('User data integrity test completed');
  });

  databaseTest('should handle concurrent transactions @database @concurrency', async ({ 
    db, 
    logger 
  }) => {
    logger.info('Testing concurrent database transactions');
    
    // Create test account with initial balance
    const createAccountQuery = `
      INSERT INTO accounts (account_number, balance, created_at)
      VALUES ($1, $2, NOW())
      RETURNING id
    `;
    
    const accountResult = await db.query(createAccountQuery, ['TEST001', 1000.00]);
    const accountId = accountResult.rows[0].id;
    
    // Simulate concurrent transactions
    const concurrentTransactions = [];
    
    for (let i = 0; i < 10; i++) {
      const transaction = async () => {
        const client = await db.getClient();
        
        try {
          await client.query('BEGIN');
          
          // Read current balance
          const balanceResult = await client.query(
            'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE',
            [accountId]
          );
          
          const currentBalance = parseFloat(balanceResult.rows[0].balance);
          
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          
          // Update balance (subtract 50)
          const newBalance = currentBalance - 50;
          
          await client.query(
            'UPDATE accounts SET balance = $1 WHERE id = $2',
            [newBalance, accountId]
          );
          
          // Record transaction
          await client.query(
            'INSERT INTO transactions (account_id, amount, type, created_at) VALUES ($1, $2, $3, NOW())',
            [accountId, -50, 'debit']
          );
          
          await client.query('COMMIT');
          
          return { success: true, newBalance };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      };
      
      concurrentTransactions.push(transaction());
    }
    
    // Execute all transactions concurrently
    const results = await Promise.allSettled(concurrentTransactions);
    
    // All transactions should succeed
    const successful = results.filter(r => r.status === 'fulfilled').length;
    expect(successful).toBe(10);
    
    // Verify final balance is correct (1000 - (10 * 50) = 500)
    const finalBalanceResult = await db.query(
      'SELECT balance FROM accounts WHERE id = $1',
      [accountId]
    );
    
    const finalBalance = parseFloat(finalBalanceResult.rows[0].balance);
    expect(finalBalance).toBe(500.00);
    
    // Verify transaction count
    const transactionCountResult = await db.query(
      'SELECT COUNT(*) as count FROM transactions WHERE account_id = $1',
      [accountId]
    );
    
    const transactionCount = parseInt(transactionCountResult.rows[0].count);
    expect(transactionCount).toBe(10);
    
    // Cleanup
    await db.query('DELETE FROM transactions WHERE account_id = $1', [accountId]);
    await db.query('DELETE FROM accounts WHERE id = $1', [accountId]);
    
    logger.info('Concurrent transactions test completed');
  });

  databaseTest('should validate data relationships @database @relationships', async ({ 
    db, 
    testData, 
    logger 
  }) => {
    logger.info('Testing database relationships');
    
    // Create test user
    const userData = await testData.generateUser();
    const userResult = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [userData.username, userData.email, userData.passwordHash]
    );
    const userId = userResult.rows[0].id;
    
    // Create test category
    const categoryResult = await db.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
      ['Test Category', 'Test category description']
    );
    const categoryId = categoryResult.rows[0].id;
    
    // Create test post with relationships
    const postResult = await db.query(
      `INSERT INTO posts (title, content, user_id, category_id, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      ['Test Post', 'Test post content', userId, categoryId]
    );
    const postId = postResult.rows[0].id;
    
    // Test foreign key relationships
    // Verify post is linked to user
    const postUserResult = await db.query(
      `SELECT p.title, u.username 
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = $1`,
      [postId]
    );
    
    expect(postUserResult.rows.length).toBe(1);
    expect(postUserResult.rows[0].username).toBe(userData.username);
    expect(postUserResult.rows[0].title).toBe('Test Post');
    
    // Verify post is linked to category
    const postCategoryResult = await db.query(
      `SELECT p.title, c.name as category_name
       FROM posts p 
       JOIN categories c ON p.category_id = c.id 
       WHERE p.id = $1`,
      [postId]
    );
    
    expect(postCategoryResult.rows.length).toBe(1);
    expect(postCategoryResult.rows[0].category_name).toBe('Test Category');
    
    // Test cascade delete (if configured)
    // Delete user should handle related posts appropriately
    try {
      await db.query('DELETE FROM users WHERE id = $1', [userId]);
      
      // Check if posts were deleted or user_id was set to null
      const orphanedPostsResult = await db.query(
        'SELECT * FROM posts WHERE id = $1',
        [postId]
      );
      
      // Depending on cascade configuration, post should be deleted or user_id nullified
      if (orphanedPostsResult.rows.length > 0) {
        expect(orphanedPostsResult.rows[0].user_id).toBeNull();
      }
    } catch (error) {
      // If foreign key constraint prevents deletion, that's also valid
      expect(error.message).toMatch(/foreign key constraint|violates/i);
      
      // Clean up in correct order
      await db.query('DELETE FROM posts WHERE id = $1', [postId]);
      await db.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    
    // Cleanup remaining data
    await db.query('DELETE FROM categories WHERE id = $1', [categoryId]);
    
    logger.info('Database relationships test completed');
  });

  databaseTest('should handle large dataset operations @database @performance', async ({ 
    db, 
    logger 
  }) => {
    logger.info('Testing large dataset operations');
    
    const batchSize = 1000;
    const totalRecords = 5000;
    
    // Create temporary table for testing
    await db.query(`
      CREATE TEMPORARY TABLE test_large_data (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100),
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Batch insert large dataset
    const startInsertTime = Date.now();
    
    for (let batch = 0; batch < totalRecords / batchSize; batch++) {
      const values = [];
      const placeholders = [];
      
      for (let i = 0; i < batchSize; i++) {
        const recordIndex = batch * batchSize + i;
        values.push(
          `User${recordIndex}`,
          `user${recordIndex}@example.com`,
          JSON.stringify({ index: recordIndex, batch: batch })
        );
        placeholders.push(`($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`);
      }
      
      const insertQuery = `
        INSERT INTO test_large_data (name, email, data)
        VALUES ${placeholders.join(', ')}
      `;
      
      await db.query(insertQuery, values);
    }
    
    const insertTime = Date.now() - startInsertTime;
    logger.info(`Inserted ${totalRecords} records in ${insertTime}ms`);
    
    // Test query performance on large dataset
    const startQueryTime = Date.now();
    
    // Count total records
    const countResult = await db.query('SELECT COUNT(*) as count FROM test_large_data');
    expect(parseInt(countResult.rows[0].count)).toBe(totalRecords);
    
    // Test indexed search (assuming email has index)
    const searchResult = await db.query(
      'SELECT * FROM test_large_data WHERE email = $1',
      ['user2500@example.com']
    );
    expect(searchResult.rows.length).toBe(1);
    
    // Test range query
    const rangeResult = await db.query(
      'SELECT * FROM test_large_data WHERE id BETWEEN $1 AND $2',
      [1000, 2000]
    );
    expect(rangeResult.rows.length).toBe(1001); // Inclusive range
    
    // Test JSON query (if supported)
    const jsonResult = await db.query(
      "SELECT * FROM test_large_data WHERE data->>'batch' = $1",
      ['2']
    );
    expect(jsonResult.rows.length).toBe(batchSize);
    
    const queryTime = Date.now() - startQueryTime;
    logger.info(`Executed queries on ${totalRecords} records in ${queryTime}ms`);
    
    // Test bulk update
    const startUpdateTime = Date.now();
    
    const updateResult = await db.query(
      "UPDATE test_large_data SET data = data || '{\"updated\": true}' WHERE id <= $1",
      [1000]
    );
    expect(updateResult.rowCount).toBe(1000);
    
    const updateTime = Date.now() - startUpdateTime;
    logger.info(`Updated 1000 records in ${updateTime}ms`);
    
    // Test bulk delete
    const startDeleteTime = Date.now();
    
    const deleteResult = await db.query(
      'DELETE FROM test_large_data WHERE id > $1',
      [4000]
    );
    expect(deleteResult.rowCount).toBe(1000);
    
    const deleteTime = Date.now() - startDeleteTime;
    logger.info(`Deleted 1000 records in ${deleteTime}ms`);
    
    // Performance assertions
    expect(insertTime).toBeLessThan(30000); // 30 seconds for 5000 inserts
    expect(queryTime).toBeLessThan(5000); // 5 seconds for queries
    expect(updateTime).toBeLessThan(10000); // 10 seconds for 1000 updates
    expect(deleteTime).toBeLessThan(5000); // 5 seconds for 1000 deletes
    
    logger.info('Large dataset operations test completed');
  });

  databaseTest('should validate data types and constraints @database @validation', async ({ 
    db, 
    logger 
  }) => {
    logger.info('Testing data types and constraints');
    
    // Test NOT NULL constraints
    try {
      await db.query(
        'INSERT INTO users (username, email) VALUES ($1, $2)',
        [null, 'test@example.com']
      );
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error.message).toMatch(/null value|not null/i);
    }
    
    // Test CHECK constraints (if any)
    try {
      await db.query(
        'INSERT INTO users (username, email, age) VALUES ($1, $2, $3)',
        ['testuser', 'test@example.com', -5] // Invalid age
      );
      expect(true).toBe(false);
    } catch (error) {
      // May pass if no CHECK constraint on age
      if (error.message.match(/check constraint|constraint.*violated/i)) {
        logger.info('CHECK constraint properly enforced');
      }
    }
    
    // Test data type validation
    try {
      await db.query(
        'INSERT INTO users (username, email, created_at) VALUES ($1, $2, $3)',
        ['testuser', 'test@example.com', 'invalid-date']
      );
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toMatch(/invalid.*date|date.*format/i);
    }
    
    // Test string length constraints
    const longString = 'a'.repeat(1000);
    try {
      await db.query(
        'INSERT INTO users (username, email) VALUES ($1, $2)',
        [longString, 'test@example.com']
      );
      
      // If it succeeds, check if it was truncated
      const result = await db.query(
        'SELECT username FROM users WHERE email = $1',
        ['test@example.com']
      );
      
      if (result.rows.length > 0) {
        expect(result.rows[0].username.length).toBeLessThan(1000);
        // Cleanup
        await db.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
      }
    } catch (error) {
      expect(error.message).toMatch(/value too long|string.*long/i);
    }
    
    // Test numeric precision
    try {
      await db.query(
        'INSERT INTO products (name, price) VALUES ($1, $2)',
        ['Test Product', 999999999.999] // Very high precision
      );
      
      const result = await db.query(
        'SELECT price FROM products WHERE name = $1',
        ['Test Product']
      );
      
      if (result.rows.length > 0) {
        // Check if precision was maintained or rounded
        const price = parseFloat(result.rows[0].price);
        expect(price).toBeCloseTo(999999999.999, 2);
        
        // Cleanup
        await db.query('DELETE FROM products WHERE name = $1', ['Test Product']);
      }
    } catch (error) {
      expect(error.message).toMatch(/numeric.*overflow|precision/i);
    }
    
    logger.info('Data types and constraints test completed');
  });

  test.afterEach(async ({ db, logger }) => {
    // Clean up any test data that might have been left behind
    try {
      await db.query('DELETE FROM users WHERE username LIKE $1', ['testuser%']);
      await db.query('DELETE FROM users WHERE email LIKE $1', ['%@example.com']);
      await db.query('DELETE FROM products WHERE name LIKE $1', ['Test%']);
      await db.query('DELETE FROM categories WHERE name LIKE $1', ['Test%']);
    } catch (error) {
      logger.warn('Cleanup warning:', error.message);
    }
    
    logger.info('Database test cleanup completed');
  });
});