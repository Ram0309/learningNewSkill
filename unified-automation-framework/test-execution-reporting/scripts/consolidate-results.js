#!/usr/bin/env node

/**
 * Consolidation Script for Test Execution Results
 * Merges multiple execution databases from GitHub Actions artifacts
 */

const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class ResultsConsolidator {
  constructor(artifactsPath, outputPath = './data/consolidated-execution-history.db') {
    this.artifactsPath = artifactsPath;
    this.outputPath = outputPath;
    this.consolidatedDb = null;
  }

  async consolidate() {
    try {
      console.log('🔄 Starting results consolidation...');
      
      // Initialize consolidated database
      await this.initializeConsolidatedDatabase();
      
      // Find all execution databases
      const dbFiles = await this.findExecutionDatabases();
      console.log(`📁 Found ${dbFiles.length} execution databases`);
      
      // Merge each database
      for (const dbFile of dbFiles) {
        await this.mergeDatabase(dbFile);
      }
      
      // Generate summary
      const summary = await this.generateSummary();
      console.log('📊 Consolidation Summary:');
      console.log(`   Total Executions: ${summary.totalExecutions}`);
      console.log(`   Total Tests: ${summary.totalTests}`);
      console.log(`   Date Range: ${summary.dateRange.start} to ${summary.dateRange.end}`);
      console.log(`   Environments: ${summary.environments.join(', ')}`);
      
      // Close database
      if (this.consolidatedDb) {
        this.consolidatedDb.close();
      }
      
      console.log('✅ Results consolidation completed successfully');
      
    } catch (error) {
      console.error('❌ Consolidation failed:', error);
      process.exit(1);
    }
  }

  async initializeConsolidatedDatabase() {
    // Ensure output directory exists
    const dir = path.dirname(this.outputPath);
    await fs.mkdir(dir, { recursive: true });

    return new Promise((resolve, reject) => {
      this.consolidatedDb = new sqlite3.Database(this.outputPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create tables
        this.consolidatedDb.serialize(() => {
          this.consolidatedDb.run(`
            CREATE TABLE IF NOT EXISTS executions (
              execution_id TEXT PRIMARY KEY,
              start_time TEXT NOT NULL,
              end_time TEXT NOT NULL,
              duration INTEGER NOT NULL,
              project TEXT NOT NULL,
              squad TEXT NOT NULL,
              environment TEXT NOT NULL,
              branch TEXT NOT NULL,
              build_number TEXT NOT NULL,
              triggered_by_type TEXT NOT NULL,
              triggered_by_name TEXT NOT NULL,
              cicd_provider TEXT NOT NULL,
              cicd_run_id TEXT NOT NULL,
              cicd_run_url TEXT NOT NULL,
              total_tests INTEGER NOT NULL,
              passed_tests INTEGER NOT NULL,
              failed_tests INTEGER NOT NULL,
              skipped_tests INTEGER NOT NULL,
              not_executed_tests INTEGER NOT NULL,
              pass_rate REAL NOT NULL,
              fail_rate REAL NOT NULL,
              avg_execution_time REAL NOT NULL,
              os TEXT NOT NULL,
              node_version TEXT NOT NULL,
              playwright_version TEXT NOT NULL,
              parallel BOOLEAN NOT NULL,
              workers INTEGER NOT NULL,
              timeout INTEGER NOT NULL,
              retries INTEGER NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              consolidated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          this.consolidatedDb.run(`
            CREATE TABLE IF NOT EXISTS test_results (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              execution_id TEXT NOT NULL,
              test_case_id TEXT NOT NULL,
              test_name TEXT NOT NULL,
              test_suite TEXT NOT NULL,
              status TEXT NOT NULL,
              error_message TEXT,
              stack_trace TEXT,
              execution_time INTEGER NOT NULL,
              retry_count INTEGER NOT NULL,
              browser TEXT,
              device TEXT,
              tags TEXT,
              screenshots TEXT,
              videos TEXT,
              attachments TEXT,
              FOREIGN KEY (execution_id) REFERENCES executions (execution_id)
            )
          `);

          // Create indexes
          this.consolidatedDb.run('CREATE INDEX IF NOT EXISTS idx_executions_start_time ON executions (start_time)');
          this.consolidatedDb.run('CREATE INDEX IF NOT EXISTS idx_executions_project ON executions (project)');
          this.consolidatedDb.run('CREATE INDEX IF NOT EXISTS idx_executions_environment ON executions (environment)');
          this.consolidatedDb.run('CREATE INDEX IF NOT EXISTS idx_test_results_execution_id ON test_results (execution_id)');
          this.consolidatedDb.run('CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results (status)');

          resolve();
        });
      });
    });
  }

  async findExecutionDatabases() {
    const dbFiles = [];
    
    try {
      const items = await fs.readdir(this.artifactsPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory()) {
          const dirPath = path.join(this.artifactsPath, item.name);
          const subItems = await fs.readdir(dirPath, { withFileTypes: true });
          
          for (const subItem of subItems) {
            if (subItem.name.endsWith('.db') || subItem.name === 'execution-history.db') {
              dbFiles.push(path.join(dirPath, subItem.name));
            }
          }
        } else if (item.name.endsWith('.db')) {
          dbFiles.push(path.join(this.artifactsPath, item.name));
        }
      }
    } catch (error) {
      console.warn('Warning: Could not read artifacts directory:', error.message);
    }
    
    return dbFiles;
  }

  async mergeDatabase(dbFilePath) {
    return new Promise((resolve, reject) => {
      console.log(`🔄 Merging database: ${path.basename(dbFilePath)}`);
      
      const sourceDb = new sqlite3.Database(dbFilePath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.warn(`Warning: Could not open database ${dbFilePath}:`, err.message);
          resolve();
          return;
        }

        // Copy executions
        sourceDb.all('SELECT * FROM executions', (err, executions) => {
          if (err) {
            console.warn(`Warning: Could not read executions from ${dbFilePath}:`, err.message);
            sourceDb.close();
            resolve();
            return;
          }

          const insertExecution = this.consolidatedDb.prepare(`
            INSERT OR REPLACE INTO executions (
              execution_id, start_time, end_time, duration, project, squad, 
              environment, branch, build_number, triggered_by_type, triggered_by_name,
              cicd_provider, cicd_run_id, cicd_run_url, total_tests, passed_tests,
              failed_tests, skipped_tests, not_executed_tests, pass_rate, fail_rate,
              avg_execution_time, os, node_version, playwright_version, parallel,
              workers, timeout, retries, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          executions.forEach(execution => {
            insertExecution.run([
              execution.execution_id,
              execution.start_time,
              execution.end_time,
              execution.duration,
              execution.project,
              execution.squad,
              execution.environment,
              execution.branch,
              execution.build_number,
              execution.triggered_by_type,
              execution.triggered_by_name,
              execution.cicd_provider,
              execution.cicd_run_id,
              execution.cicd_run_url,
              execution.total_tests,
              execution.passed_tests,
              execution.failed_tests,
              execution.skipped_tests,
              execution.not_executed_tests,
              execution.pass_rate,
              execution.fail_rate,
              execution.avg_execution_time,
              execution.os,
              execution.node_version,
              execution.playwright_version,
              execution.parallel,
              execution.workers,
              execution.timeout,
              execution.retries,
              execution.created_at
            ]);
          });

          insertExecution.finalize();

          // Copy test results
          sourceDb.all('SELECT * FROM test_results', (err, testResults) => {
            if (err) {
              console.warn(`Warning: Could not read test results from ${dbFilePath}:`, err.message);
              sourceDb.close();
              resolve();
              return;
            }

            // Delete existing test results for these executions
            const executionIds = executions.map(e => e.execution_id);
            if (executionIds.length > 0) {
              const placeholders = executionIds.map(() => '?').join(',');
              this.consolidatedDb.run(
                `DELETE FROM test_results WHERE execution_id IN (${placeholders})`,
                executionIds
              );
            }

            const insertTestResult = this.consolidatedDb.prepare(`
              INSERT INTO test_results (
                execution_id, test_case_id, test_name, test_suite, status,
                error_message, stack_trace, execution_time, retry_count,
                browser, device, tags, screenshots, videos, attachments
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            testResults.forEach(testResult => {
              insertTestResult.run([
                testResult.execution_id,
                testResult.test_case_id,
                testResult.test_name,
                testResult.test_suite,
                testResult.status,
                testResult.error_message,
                testResult.stack_trace,
                testResult.execution_time,
                testResult.retry_count,
                testResult.browser,
                testResult.device,
                testResult.tags,
                testResult.screenshots,
                testResult.videos,
                testResult.attachments
              ]);
            });

            insertTestResult.finalize();

            console.log(`✅ Merged ${executions.length} executions and ${testResults.length} test results`);
            
            sourceDb.close();
            resolve();
          });
        });
      });
    });
  }

  async generateSummary() {
    return new Promise((resolve, reject) => {
      this.consolidatedDb.get(`
        SELECT 
          COUNT(*) as totalExecutions,
          SUM(total_tests) as totalTests,
          MIN(start_time) as earliestExecution,
          MAX(start_time) as latestExecution
        FROM executions
      `, (err, basicStats) => {
        if (err) {
          reject(err);
          return;
        }

        this.consolidatedDb.all(`
          SELECT DISTINCT environment 
          FROM executions 
          ORDER BY environment
        `, (err, envRows) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            totalExecutions: basicStats.totalExecutions || 0,
            totalTests: basicStats.totalTests || 0,
            dateRange: {
              start: basicStats.earliestExecution || 'N/A',
              end: basicStats.latestExecution || 'N/A'
            },
            environments: envRows.map(row => row.environment)
          });
        });
      });
    });
  }

  async generateConsolidatedReport() {
    const reportPath = path.join(path.dirname(this.outputPath), 'consolidation-report.json');
    
    return new Promise((resolve, reject) => {
      // Generate comprehensive report
      const queries = [
        {
          name: 'executionSummary',
          sql: `
            SELECT 
              environment,
              COUNT(*) as executions,
              AVG(pass_rate) as avgPassRate,
              AVG(duration) as avgDuration,
              MIN(start_time) as firstExecution,
              MAX(start_time) as lastExecution
            FROM executions 
            GROUP BY environment
            ORDER BY environment
          `
        },
        {
          name: 'topFailingTests',
          sql: `
            SELECT 
              test_name,
              COUNT(*) as totalRuns,
              SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failures,
              (SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as failureRate
            FROM test_results 
            GROUP BY test_name
            HAVING failures > 0
            ORDER BY failures DESC
            LIMIT 20
          `
        },
        {
          name: 'dailyTrends',
          sql: `
            SELECT 
              DATE(start_time) as date,
              COUNT(*) as executions,
              AVG(pass_rate) as avgPassRate,
              SUM(total_tests) as totalTests
            FROM executions 
            WHERE start_time >= DATE('now', '-30 days')
            GROUP BY DATE(start_time)
            ORDER BY date
          `
        }
      ];

      const reportData = {
        generatedAt: new Date().toISOString(),
        consolidatedDatabase: this.outputPath,
        summary: {}
      };

      let completedQueries = 0;

      queries.forEach(query => {
        this.consolidatedDb.all(query.sql, (err, rows) => {
          if (err) {
            console.warn(`Warning: Could not execute query ${query.name}:`, err.message);
            reportData.summary[query.name] = [];
          } else {
            reportData.summary[query.name] = rows;
          }

          completedQueries++;
          
          if (completedQueries === queries.length) {
            // Save report
            fs.writeFile(reportPath, JSON.stringify(reportData, null, 2))
              .then(() => {
                console.log(`📊 Consolidation report saved: ${reportPath}`);
                resolve(reportPath);
              })
              .catch(reject);
          }
        });
      });
    });
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const artifactsPath = args[0] || './artifacts';
  const outputPath = args[1] || './data/consolidated-execution-history.db';

  console.log('🚀 Test Execution Results Consolidator');
  console.log(`📁 Artifacts Path: ${artifactsPath}`);
  console.log(`💾 Output Database: ${outputPath}`);
  console.log('');

  const consolidator = new ResultsConsolidator(artifactsPath, outputPath);
  
  try {
    await consolidator.consolidate();
    await consolidator.generateConsolidatedReport();
    
    console.log('');
    console.log('🎉 Consolidation completed successfully!');
    console.log(`📊 Consolidated database: ${outputPath}`);
    console.log(`📋 Report: ${path.join(path.dirname(outputPath), 'consolidation-report.json')}`);
    
  } catch (error) {
    console.error('💥 Consolidation failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = { ResultsConsolidator };

// Run if called directly
if (require.main === module) {
  main();
}