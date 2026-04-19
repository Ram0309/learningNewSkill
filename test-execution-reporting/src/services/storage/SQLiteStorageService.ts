import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs/promises';
import { IStorageService } from '../../core/interfaces/IStorageService';
import { IExecutionData, IExecutionFilter, IDashboardMetrics } from '../../core/interfaces/IExecutionData';
import { Logger } from '../../utils/logger';

/**
 * SQLite-based storage service for test execution data
 * Preferred for better filtering and query performance
 */
export class SQLiteStorageService implements IStorageService {
  private readonly dbPath: string;
  private readonly logger: Logger;
  private db: sqlite3.Database | null = null;

  constructor(dbPath: string = './data/execution-history.db') {
    this.dbPath = path.resolve(dbPath);
    this.logger = new Logger('SQLiteStorageService');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });

      // Initialize database
      await this.initializeDatabase();
      this.logger.info(`SQLite storage initialized: ${this.dbPath}`);
    } catch (error) {
      this.logger.error('Failed to initialize SQLite storage', error);
      throw error;
    }
  }

  async saveExecution(executionData: IExecutionData): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.serialize(() => {
        this.db!.run('BEGIN TRANSACTION');

        // Insert or update execution metadata
        const metadataStmt = this.db!.prepare(`
          INSERT OR REPLACE INTO executions (
            execution_id, start_time, end_time, duration, project, squad, 
            environment, branch, build_number, triggered_by_type, triggered_by_name,
            cicd_provider, cicd_run_id, cicd_run_url, total_tests, passed_tests,
            failed_tests, skipped_tests, not_executed_tests, pass_rate, fail_rate,
            avg_execution_time, os, node_version, playwright_version, parallel,
            workers, timeout, retries
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const metadata = executionData.metadata;
        const summary = executionData.summary;
        const systemInfo = executionData.systemInfo;
        const config = executionData.configuration;

        metadataStmt.run([
          metadata.executionId,
          metadata.timestamp.start,
          metadata.timestamp.end,
          metadata.timestamp.duration,
          metadata.project,
          metadata.squad,
          metadata.environment,
          metadata.branch,
          metadata.buildNumber,
          metadata.triggeredBy.type,
          metadata.triggeredBy.name,
          metadata.cicd.provider,
          metadata.cicd.runId,
          metadata.cicd.runUrl,
          summary.total,
          summary.passed,
          summary.failed,
          summary.skipped,
          summary.notExecuted,
          summary.passRate,
          summary.failRate,
          summary.avgExecutionTime,
          systemInfo.os,
          systemInfo.nodeVersion,
          systemInfo.playwrightVersion,
          config.parallel,
          config.workers,
          config.timeout,
          config.retries
        ]);

        metadataStmt.finalize();

        // Delete existing test results for this execution
        this.db!.run('DELETE FROM test_results WHERE execution_id = ?', [metadata.executionId]);

        // Insert test results
        const testStmt = this.db!.prepare(`
          INSERT INTO test_results (
            execution_id, test_case_id, test_name, test_suite, status,
            error_message, stack_trace, execution_time, retry_count,
            browser, device, tags, screenshots, videos, attachments
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        executionData.testResults.forEach(test => {
          testStmt.run([
            metadata.executionId,
            test.testCaseId,
            test.testName,
            test.testSuite,
            test.status,
            test.errorMessage || null,
            test.stackTrace || null,
            test.executionTime,
            test.retryCount,
            test.browser || null,
            test.device || null,
            JSON.stringify(test.tags),
            JSON.stringify(test.screenshots || []),
            JSON.stringify(test.videos || []),
            JSON.stringify(test.attachments || [])
          ]);
        });

        testStmt.finalize();

        this.db!.run('COMMIT', (err) => {
          if (err) {
            this.logger.error('Failed to save execution', err);
            reject(err);
          } else {
            this.logger.info(`Saved execution: ${metadata.executionId}`);
            resolve();
          }
        });
      });
    });
  }

  async getExecutions(filter?: IExecutionFilter): Promise<IExecutionData[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const { query, params } = this.buildFilterQuery(filter);
      
      this.db.all(query, params, async (err, rows: any[]) => {
        if (err) {
          this.logger.error('Failed to get executions', err);
          reject(err);
          return;
        }

        try {
          const executions: IExecutionData[] = [];
          
          for (const row of rows) {
            const testResults = await this.getTestResultsForExecution(row.execution_id);
            
            const execution: IExecutionData = {
              metadata: {
                executionId: row.execution_id,
                timestamp: {
                  start: row.start_time,
                  end: row.end_time,
                  duration: row.duration
                },
                project: row.project,
                squad: row.squad,
                environment: row.environment,
                branch: row.branch,
                buildNumber: row.build_number,
                triggeredBy: {
                  type: row.triggered_by_type,
                  name: row.triggered_by_name
                },
                cicd: {
                  provider: row.cicd_provider,
                  runId: row.cicd_run_id,
                  runUrl: row.cicd_run_url
                }
              },
              summary: {
                total: row.total_tests,
                passed: row.passed_tests,
                failed: row.failed_tests,
                skipped: row.skipped_tests,
                notExecuted: row.not_executed_tests,
                passRate: row.pass_rate,
                failRate: row.fail_rate,
                avgExecutionTime: row.avg_execution_time
              },
              testResults,
              systemInfo: {
                os: row.os,
                nodeVersion: row.node_version,
                playwrightVersion: row.playwright_version,
                browserVersions: {} // TODO: Store browser versions
              },
              configuration: {
                parallel: row.parallel,
                workers: row.workers,
                timeout: row.timeout,
                retries: row.retries
              }
            };

            executions.push(execution);
          }

          this.logger.info(`Retrieved ${executions.length} executions`);
          resolve(executions);
        } catch (error) {
          this.logger.error('Failed to process execution data', error);
          reject(error);
        }
      });
    });
  }

  async getExecutionById(executionId: string): Promise<IExecutionData | null> {
    const executions = await this.getExecutions({ 
      // Add a custom filter for execution ID
    } as any);
    
    const execution = executions.find(exec => exec.metadata.executionId === executionId);
    
    if (execution) {
      this.logger.info(`Found execution: ${executionId}`);
    } else {
      this.logger.warn(`Execution not found: ${executionId}`);
    }

    return execution || null;
  }

  async getDashboardMetrics(filter?: IExecutionFilter): Promise<IDashboardMetrics> {
    try {
      const executions = await this.getExecutions(filter);
      
      if (executions.length === 0) {
        return this.getEmptyMetrics();
      }

      // Calculate metrics using SQL queries for better performance
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('Database not initialized'));
          return;
        }

        const metricsQueries = [
          this.getBasicMetricsQuery(filter),
          this.getTopFailingTestsQuery(filter),
          this.getExecutionTrendsQuery(filter),
          this.getEnvironmentStatsQuery(filter),
          this.getErrorDistributionQuery(filter)
        ];

        Promise.all(metricsQueries.map(query => this.executeQuery(query.sql, query.params)))
          .then(results => {
            const [basicMetrics, topFailingTests, executionTrends, environmentStats, errorDistribution] = results;

            const metrics: IDashboardMetrics = {
              totalExecutions: basicMetrics[0]?.total_executions || 0,
              totalTests: basicMetrics[0]?.total_tests || 0,
              overallPassRate: basicMetrics[0]?.overall_pass_rate || 0,
              avgExecutionTime: basicMetrics[0]?.avg_execution_time || 0,
              topFailingTests: topFailingTests.map((row: any) => ({
                testName: row.test_name,
                failureCount: row.failure_count,
                failureRate: row.failure_rate
              })),
              executionTrends: executionTrends.map((row: any) => ({
                date: row.date,
                executions: row.executions,
                passRate: row.pass_rate
              })),
              environmentStats: environmentStats.reduce((acc: any, row: any) => {
                acc[row.environment] = {
                  executions: row.executions,
                  passRate: row.pass_rate
                };
                return acc;
              }, {}),
              errorDistribution: errorDistribution.reduce((acc: any, row: any) => {
                acc[row.error_type] = row.count;
                return acc;
              }, {})
            };

            resolve(metrics);
          })
          .catch(error => {
            this.logger.error('Failed to get dashboard metrics', error);
            reject(error);
          });
      });
    } catch (error) {
      this.logger.error('Failed to get dashboard metrics', error);
      throw error;
    }
  }

  async deleteExecution(executionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.serialize(() => {
        this.db!.run('BEGIN TRANSACTION');
        
        this.db!.run('DELETE FROM test_results WHERE execution_id = ?', [executionId]);
        this.db!.run('DELETE FROM executions WHERE execution_id = ?', [executionId], function(err) {
          if (err) {
            reject(err);
          } else {
            if (this.changes > 0) {
              this.db!.run('COMMIT');
              resolve();
            } else {
              this.db!.run('ROLLBACK');
              reject(new Error('Execution not found'));
            }
          }
        });
      });
    });
  }

  async getExecutionCount(filter?: IExecutionFilter): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const { query, params } = this.buildCountQuery(filter);
      
      this.db.get(query, params, (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  async healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve(false);
        return;
      }

      this.db.get('SELECT 1', (err) => {
        resolve(!err);
      });
    });
  }

  async backup(backupPath: string): Promise<void> {
    try {
      await fs.copyFile(this.dbPath, backupPath);
      this.logger.info(`Backup created: ${backupPath}`);
    } catch (error) {
      this.logger.error('Failed to create backup', error);
      throw error;
    }
  }

  async restore(backupPath: string): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
      }
      await fs.copyFile(backupPath, this.dbPath);
      await this.initializeDatabase();
      this.logger.info(`Restored from backup: ${backupPath}`);
    } catch (error) {
      this.logger.error('Failed to restore from backup', error);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.createTables()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  private async createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const executionsTable = `
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const testResultsTable = `
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
      `;

      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_executions_start_time ON executions (start_time)',
        'CREATE INDEX IF NOT EXISTS idx_executions_project ON executions (project)',
        'CREATE INDEX IF NOT EXISTS idx_executions_environment ON executions (environment)',
        'CREATE INDEX IF NOT EXISTS idx_test_results_execution_id ON test_results (execution_id)',
        'CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results (status)',
        'CREATE INDEX IF NOT EXISTS idx_test_results_test_name ON test_results (test_name)'
      ];

      this.db.serialize(() => {
        this.db!.run(executionsTable);
        this.db!.run(testResultsTable);
        
        indexes.forEach(index => {
          this.db!.run(index);
        });

        resolve();
      });
    });
  }

  private async getTestResultsForExecution(executionId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(
        'SELECT * FROM test_results WHERE execution_id = ?',
        [executionId],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const testResults = rows.map(row => ({
              testCaseId: row.test_case_id,
              testName: row.test_name,
              testSuite: row.test_suite,
              status: row.status,
              errorMessage: row.error_message,
              stackTrace: row.stack_trace,
              executionTime: row.execution_time,
              retryCount: row.retry_count,
              browser: row.browser,
              device: row.device,
              tags: JSON.parse(row.tags || '[]'),
              screenshots: JSON.parse(row.screenshots || '[]'),
              videos: JSON.parse(row.videos || '[]'),
              attachments: JSON.parse(row.attachments || '[]')
            }));
            resolve(testResults);
          }
        }
      );
    });
  }

  private buildFilterQuery(filter?: IExecutionFilter): { query: string; params: any[] } {
    let query = 'SELECT * FROM executions WHERE 1=1';
    const params: any[] = [];

    if (filter) {
      if (filter.singleDate) {
        query += ' AND DATE(start_time) = DATE(?)';
        params.push(filter.singleDate);
      }

      if (filter.dateFrom) {
        query += ' AND DATE(start_time) >= DATE(?)';
        params.push(filter.dateFrom);
      }

      if (filter.dateTo) {
        query += ' AND DATE(start_time) <= DATE(?)';
        params.push(filter.dateTo);
      }

      if (filter.project) {
        query += ' AND project = ?';
        params.push(filter.project);
      }

      if (filter.squad) {
        query += ' AND squad = ?';
        params.push(filter.squad);
      }

      if (filter.environment) {
        query += ' AND environment = ?';
        params.push(filter.environment);
      }

      if (filter.branch) {
        query += ' AND branch = ?';
        params.push(filter.branch);
      }

      if (filter.triggeredBy) {
        query += ' AND triggered_by_name = ?';
        params.push(filter.triggeredBy);
      }
    }

    query += ' ORDER BY start_time DESC';

    return { query, params };
  }

  private buildCountQuery(filter?: IExecutionFilter): { query: string; params: any[] } {
    const { query, params } = this.buildFilterQuery(filter);
    const countQuery = query.replace('SELECT * FROM executions', 'SELECT COUNT(*) as count FROM executions');
    return { query: countQuery.replace(' ORDER BY start_time DESC', ''), params };
  }

  private getBasicMetricsQuery(filter?: IExecutionFilter): { sql: string; params: any[] } {
    const { query, params } = this.buildFilterQuery(filter);
    const sql = query.replace(
      'SELECT * FROM executions',
      `SELECT 
        COUNT(*) as total_executions,
        SUM(total_tests) as total_tests,
        CASE 
          WHEN SUM(total_tests) > 0 
          THEN (SUM(passed_tests) * 100.0 / SUM(total_tests))
          ELSE 0 
        END as overall_pass_rate,
        AVG(duration) as avg_execution_time
      FROM executions`
    ).replace(' ORDER BY start_time DESC', '');

    return { sql, params };
  }

  private getTopFailingTestsQuery(filter?: IExecutionFilter): { sql: string; params: any[] } {
    let sql = `
      SELECT 
        test_name,
        COUNT(*) as total_runs,
        SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failure_count,
        (SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as failure_rate
      FROM test_results tr
      JOIN executions e ON tr.execution_id = e.execution_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filter) {
      if (filter.dateFrom) {
        sql += ' AND DATE(e.start_time) >= DATE(?)';
        params.push(filter.dateFrom);
      }
      if (filter.dateTo) {
        sql += ' AND DATE(e.start_time) <= DATE(?)';
        params.push(filter.dateTo);
      }
      if (filter.project) {
        sql += ' AND e.project = ?';
        params.push(filter.project);
      }
      if (filter.environment) {
        sql += ' AND e.environment = ?';
        params.push(filter.environment);
      }
    }

    sql += `
      GROUP BY test_name
      HAVING failure_count > 0
      ORDER BY failure_count DESC
      LIMIT 10
    `;

    return { sql, params };
  }

  private getExecutionTrendsQuery(filter?: IExecutionFilter): { sql: string; params: any[] } {
    let sql = `
      SELECT 
        DATE(start_time) as date,
        COUNT(*) as executions,
        CASE 
          WHEN SUM(total_tests) > 0 
          THEN (SUM(passed_tests) * 100.0 / SUM(total_tests))
          ELSE 0 
        END as pass_rate
      FROM executions
      WHERE DATE(start_time) >= DATE('now', '-30 days')
    `;

    const params: any[] = [];

    if (filter) {
      if (filter.project) {
        sql += ' AND project = ?';
        params.push(filter.project);
      }
      if (filter.environment) {
        sql += ' AND environment = ?';
        params.push(filter.environment);
      }
    }

    sql += ' GROUP BY DATE(start_time) ORDER BY date';

    return { sql, params };
  }

  private getEnvironmentStatsQuery(filter?: IExecutionFilter): { sql: string; params: any[] } {
    let sql = `
      SELECT 
        environment,
        COUNT(*) as executions,
        CASE 
          WHEN SUM(total_tests) > 0 
          THEN (SUM(passed_tests) * 100.0 / SUM(total_tests))
          ELSE 0 
        END as pass_rate
      FROM executions
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filter) {
      if (filter.dateFrom) {
        sql += ' AND DATE(start_time) >= DATE(?)';
        params.push(filter.dateFrom);
      }
      if (filter.dateTo) {
        sql += ' AND DATE(start_time) <= DATE(?)';
        params.push(filter.dateTo);
      }
      if (filter.project) {
        sql += ' AND project = ?';
        params.push(filter.project);
      }
    }

    sql += ' GROUP BY environment ORDER BY executions DESC';

    return { sql, params };
  }

  private getErrorDistributionQuery(filter?: IExecutionFilter): { sql: string; params: any[] } {
    let sql = `
      SELECT 
        CASE 
          WHEN error_message LIKE '%timeout%' THEN 'Timeout'
          WHEN error_message LIKE '%element%not%found%' THEN 'Element Not Found'
          WHEN error_message LIKE '%assertion%failed%' THEN 'Assertion Failed'
          WHEN error_message LIKE '%network%error%' THEN 'Network Error'
          WHEN error_message LIKE '%page%crash%' THEN 'Page Crash'
          WHEN error_message LIKE '%javascript%error%' THEN 'JavaScript Error'
          ELSE 'Other'
        END as error_type,
        COUNT(*) as count
      FROM test_results tr
      JOIN executions e ON tr.execution_id = e.execution_id
      WHERE tr.status = 'Failed' AND tr.error_message IS NOT NULL
    `;

    const params: any[] = [];

    if (filter) {
      if (filter.dateFrom) {
        sql += ' AND DATE(e.start_time) >= DATE(?)';
        params.push(filter.dateFrom);
      }
      if (filter.dateTo) {
        sql += ' AND DATE(e.start_time) <= DATE(?)';
        params.push(filter.dateTo);
      }
      if (filter.project) {
        sql += ' AND e.project = ?';
        params.push(filter.project);
      }
      if (filter.environment) {
        sql += ' AND e.environment = ?';
        params.push(filter.environment);
      }
    }

    sql += ' GROUP BY error_type ORDER BY count DESC';

    return { sql, params };
  }

  private executeQuery(sql: string, params: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  private getEmptyMetrics(): IDashboardMetrics {
    return {
      totalExecutions: 0,
      totalTests: 0,
      overallPassRate: 0,
      avgExecutionTime: 0,
      topFailingTests: [],
      executionTrends: [],
      environmentStats: {},
      errorDistribution: {}
    };
  }
}