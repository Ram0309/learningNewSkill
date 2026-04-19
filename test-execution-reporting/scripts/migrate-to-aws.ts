import * as AWS from 'aws-sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IExecutionData } from '../src/core/interfaces/IExecutionData';
import { SQLiteStorageService } from '../src/services/storage/SQLiteStorageService';
import { Logger } from '../src/utils/logger';
import { DateUtils } from '../src/utils/date';

/**
 * AWS Migration Script for Test Execution Reporting System
 * Migrates local SQLite/JSON data to AWS services
 */
export class AWSMigrationService {
  private readonly logger: Logger;
  private readonly s3: AWS.S3;
  private readonly dynamodb: AWS.DynamoDB.DocumentClient;
  private readonly athena: AWS.Athena;

  constructor(
    private readonly config: {
      region: string;
      s3Bucket: string;
      dynamoTablePrefix: string;
      athenaDatabase: string;
      athenaWorkgroup: string;
    }
  ) {
    this.logger = new Logger('AWSMigrationService');
    
    // Initialize AWS services
    AWS.config.update({ region: this.config.region });
    this.s3 = new AWS.S3();
    this.dynamodb = new AWS.DynamoDB.DocumentClient();
    this.athena = new AWS.Athena();
  }

  /**
   * Migrate all data from local storage to AWS
   */
  async migrateToAWS(localDbPath: string): Promise<void> {
    try {
      this.logger.info('Starting AWS migration...');

      // Step 1: Setup AWS infrastructure
      await this.setupAWSInfrastructure();

      // Step 2: Load local data
      const localStorage = new SQLiteStorageService(localDbPath);
      await localStorage.initialize();
      const executions = await localStorage.getExecutions();

      this.logger.info(`Found ${executions.length} executions to migrate`);

      // Step 3: Migrate to S3
      await this.migrateToS3(executions);

      // Step 4: Migrate to DynamoDB
      await this.migrateToDynamoDB(executions);

      // Step 5: Setup Athena tables
      await this.setupAthenaTables();

      // Step 6: Create QuickSight data source (optional)
      await this.setupQuickSightDataSource();

      this.logger.info('AWS migration completed successfully');
    } catch (error) {
      this.logger.error('AWS migration failed', error);
      throw error;
    }
  }

  /**
   * Setup AWS infrastructure (S3 bucket, DynamoDB tables, etc.)
   */
  private async setupAWSInfrastructure(): Promise<void> {
    try {
      // Create S3 bucket if it doesn't exist
      await this.createS3Bucket();

      // Create DynamoDB tables
      await this.createDynamoDBTables();

      // Create Athena database
      await this.createAthenaDatabase();

      this.logger.info('AWS infrastructure setup completed');
    } catch (error) {
      this.logger.error('Failed to setup AWS infrastructure', error);
      throw error;
    }
  }

  /**
   * Create S3 bucket for storing execution data
   */
  private async createS3Bucket(): Promise<void> {
    try {
      await this.s3.headBucket({ Bucket: this.config.s3Bucket }).promise();
      this.logger.info(`S3 bucket ${this.config.s3Bucket} already exists`);
    } catch (error) {
      if ((error as any).statusCode === 404) {
        // Bucket doesn't exist, create it
        await this.s3.createBucket({
          Bucket: this.config.s3Bucket,
          CreateBucketConfiguration: {
            LocationConstraint: this.config.region !== 'us-east-1' ? this.config.region : undefined
          }
        }).promise();

        // Enable versioning
        await this.s3.putBucketVersioning({
          Bucket: this.config.s3Bucket,
          VersioningConfiguration: {
            Status: 'Enabled'
          }
        }).promise();

        // Set lifecycle policy
        await this.s3.putBucketLifecycleConfiguration({
          Bucket: this.config.s3Bucket,
          LifecycleConfiguration: {
            Rules: [
              {
                Id: 'DeleteOldVersions',
                Status: 'Enabled',
                NoncurrentVersionExpiration: {
                  NoncurrentDays: 90
                }
              },
              {
                Id: 'TransitionToIA',
                Status: 'Enabled',
                Transitions: [
                  {
                    Days: 30,
                    StorageClass: 'STANDARD_IA'
                  },
                  {
                    Days: 90,
                    StorageClass: 'GLACIER'
                  }
                ]
              }
            ]
          }
        }).promise();

        this.logger.info(`Created S3 bucket: ${this.config.s3Bucket}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Create DynamoDB tables for fast queries
   */
  private async createDynamoDBTables(): Promise<void> {
    const dynamodb = new AWS.DynamoDB();

    // Executions table
    const executionsTableName = `${this.config.dynamoTablePrefix}-executions`;
    try {
      await dynamodb.describeTable({ TableName: executionsTableName }).promise();
      this.logger.info(`DynamoDB table ${executionsTableName} already exists`);
    } catch (error) {
      if ((error as any).code === 'ResourceNotFoundException') {
        await dynamodb.createTable({
          TableName: executionsTableName,
          KeySchema: [
            { AttributeName: 'executionId', KeyType: 'HASH' }
          ],
          AttributeDefinitions: [
            { AttributeName: 'executionId', AttributeType: 'S' },
            { AttributeName: 'project', AttributeType: 'S' },
            { AttributeName: 'environment', AttributeType: 'S' },
            { AttributeName: 'startTime', AttributeType: 'S' }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: 'ProjectEnvironmentIndex',
              KeySchema: [
                { AttributeName: 'project', KeyType: 'HASH' },
                { AttributeName: 'environment', KeyType: 'RANGE' }
              ],
              Projection: { ProjectionType: 'ALL' },
              ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            },
            {
              IndexName: 'TimeIndex',
              KeySchema: [
                { AttributeName: 'environment', KeyType: 'HASH' },
                { AttributeName: 'startTime', KeyType: 'RANGE' }
              ],
              Projection: { ProjectionType: 'ALL' },
              ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            }
          ],
          ProvisionedThroughput: { ReadCapacityUnits: 10, WriteCapacityUnits: 10 }
        }).promise();

        this.logger.info(`Created DynamoDB table: ${executionsTableName}`);
      } else {
        throw error;
      }
    }

    // Test results table
    const testResultsTableName = `${this.config.dynamoTablePrefix}-test-results`;
    try {
      await dynamodb.describeTable({ TableName: testResultsTableName }).promise();
      this.logger.info(`DynamoDB table ${testResultsTableName} already exists`);
    } catch (error) {
      if ((error as any).code === 'ResourceNotFoundException') {
        await dynamodb.createTable({
          TableName: testResultsTableName,
          KeySchema: [
            { AttributeName: 'executionId', KeyType: 'HASH' },
            { AttributeName: 'testCaseId', KeyType: 'RANGE' }
          ],
          AttributeDefinitions: [
            { AttributeName: 'executionId', AttributeType: 'S' },
            { AttributeName: 'testCaseId', AttributeType: 'S' },
            { AttributeName: 'testName', AttributeType: 'S' },
            { AttributeName: 'status', AttributeType: 'S' }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: 'TestNameIndex',
              KeySchema: [
                { AttributeName: 'testName', KeyType: 'HASH' },
                { AttributeName: 'status', KeyType: 'RANGE' }
              ],
              Projection: { ProjectionType: 'ALL' },
              ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            }
          ],
          ProvisionedThroughput: { ReadCapacityUnits: 15, WriteCapacityUnits: 15 }
        }).promise();

        this.logger.info(`Created DynamoDB table: ${testResultsTableName}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Create Athena database for analytics
   */
  private async createAthenaDatabase(): Promise<void> {
    try {
      const createDatabaseQuery = `
        CREATE DATABASE IF NOT EXISTS ${this.config.athenaDatabase}
        COMMENT 'Test execution reporting database'
        LOCATION 's3://${this.config.s3Bucket}/athena-results/'
      `;

      await this.executeAthenaQuery(createDatabaseQuery);
      this.logger.info(`Created Athena database: ${this.config.athenaDatabase}`);
    } catch (error) {
      this.logger.error('Failed to create Athena database', error);
      throw error;
    }
  }

  /**
   * Migrate execution data to S3
   */
  private async migrateToS3(executions: IExecutionData[]): Promise<void> {
    try {
      this.logger.info('Migrating data to S3...');

      // Group executions by date for efficient storage
      const executionsByDate = new Map<string, IExecutionData[]>();
      
      executions.forEach(execution => {
        const date = DateUtils.formatDate(execution.metadata.timestamp.start);
        if (!executionsByDate.has(date)) {
          executionsByDate.set(date, []);
        }
        executionsByDate.get(date)!.push(execution);
      });

      // Upload each date's data as a separate file
      for (const [date, dateExecutions] of executionsByDate) {
        const key = `executions/year=${date.substring(0, 4)}/month=${date.substring(5, 7)}/day=${date.substring(8, 10)}/executions.json`;
        
        const data = {
          date,
          executionCount: dateExecutions.length,
          executions: dateExecutions
        };

        await this.s3.putObject({
          Bucket: this.config.s3Bucket,
          Key: key,
          Body: JSON.stringify(data, null, 2),
          ContentType: 'application/json',
          Metadata: {
            'execution-count': dateExecutions.length.toString(),
            'upload-date': new Date().toISOString()
          }
        }).promise();

        this.logger.info(`Uploaded ${dateExecutions.length} executions for ${date}`);
      }

      // Upload summary file
      const summary = {
        totalExecutions: executions.length,
        totalTests: executions.reduce((sum, exec) => sum + exec.summary.total, 0),
        dateRange: {
          start: executions.reduce((earliest, exec) => 
            exec.metadata.timestamp.start < earliest ? exec.metadata.timestamp.start : earliest,
            executions[0]?.metadata.timestamp.start || ''
          ),
          end: executions.reduce((latest, exec) => 
            exec.metadata.timestamp.start > latest ? exec.metadata.timestamp.start : latest,
            executions[0]?.metadata.timestamp.start || ''
          )
        },
        environments: [...new Set(executions.map(exec => exec.metadata.environment))],
        projects: [...new Set(executions.map(exec => exec.metadata.project))],
        migratedAt: new Date().toISOString()
      };

      await this.s3.putObject({
        Bucket: this.config.s3Bucket,
        Key: 'summary/migration-summary.json',
        Body: JSON.stringify(summary, null, 2),
        ContentType: 'application/json'
      }).promise();

      this.logger.info('S3 migration completed');
    } catch (error) {
      this.logger.error('Failed to migrate to S3', error);
      throw error;
    }
  }

  /**
   * Migrate execution data to DynamoDB
   */
  private async migrateToDynamoDB(executions: IExecutionData[]): Promise<void> {
    try {
      this.logger.info('Migrating data to DynamoDB...');

      const executionsTableName = `${this.config.dynamoTablePrefix}-executions`;
      const testResultsTableName = `${this.config.dynamoTablePrefix}-test-results`;

      // Batch write executions
      const executionBatches = this.chunkArray(executions, 25); // DynamoDB batch limit

      for (const batch of executionBatches) {
        const putRequests = batch.map(execution => ({
          PutRequest: {
            Item: {
              executionId: execution.metadata.executionId,
              project: execution.metadata.project,
              squad: execution.metadata.squad,
              environment: execution.metadata.environment,
              branch: execution.metadata.branch,
              startTime: execution.metadata.timestamp.start,
              endTime: execution.metadata.timestamp.end,
              duration: execution.metadata.timestamp.duration,
              totalTests: execution.summary.total,
              passedTests: execution.summary.passed,
              failedTests: execution.summary.failed,
              skippedTests: execution.summary.skipped,
              passRate: execution.summary.passRate,
              failRate: execution.summary.failRate,
              avgExecutionTime: execution.summary.avgExecutionTime,
              triggeredBy: execution.metadata.triggeredBy,
              cicd: execution.metadata.cicd,
              systemInfo: execution.systemInfo,
              configuration: execution.configuration,
              createdAt: new Date().toISOString()
            }
          }
        }));

        await this.dynamodb.batchWrite({
          RequestItems: {
            [executionsTableName]: putRequests
          }
        }).promise();

        this.logger.info(`Migrated ${batch.length} executions to DynamoDB`);
      }

      // Batch write test results
      const allTestResults: any[] = [];
      executions.forEach(execution => {
        execution.testResults.forEach(test => {
          allTestResults.push({
            executionId: execution.metadata.executionId,
            testCaseId: test.testCaseId,
            testName: test.testName,
            testSuite: test.testSuite,
            status: test.status,
            errorMessage: test.errorMessage,
            stackTrace: test.stackTrace,
            executionTime: test.executionTime,
            retryCount: test.retryCount,
            browser: test.browser,
            device: test.device,
            tags: test.tags,
            screenshots: test.screenshots,
            videos: test.videos,
            attachments: test.attachments,
            createdAt: new Date().toISOString()
          });
        });
      });

      const testResultBatches = this.chunkArray(allTestResults, 25);

      for (const batch of testResultBatches) {
        const putRequests = batch.map(testResult => ({
          PutRequest: { Item: testResult }
        }));

        await this.dynamodb.batchWrite({
          RequestItems: {
            [testResultsTableName]: putRequests
          }
        }).promise();

        this.logger.info(`Migrated ${batch.length} test results to DynamoDB`);
      }

      this.logger.info('DynamoDB migration completed');
    } catch (error) {
      this.logger.error('Failed to migrate to DynamoDB', error);
      throw error;
    }
  }

  /**
   * Setup Athena tables for analytics
   */
  private async setupAthenaTables(): Promise<void> {
    try {
      this.logger.info('Setting up Athena tables...');

      // Create executions table
      const createExecutionsTableQuery = `
        CREATE EXTERNAL TABLE IF NOT EXISTS ${this.config.athenaDatabase}.executions (
          date string,
          executionCount int,
          executions array<struct<
            metadata: struct<
              executionId: string,
              timestamp: struct<
                start: string,
                end: string,
                duration: bigint
              >,
              project: string,
              squad: string,
              environment: string,
              branch: string,
              buildNumber: string,
              triggeredBy: struct<
                type: string,
                name: string
              >,
              cicd: struct<
                provider: string,
                runId: string,
                runUrl: string
              >
            >,
            summary: struct<
              total: int,
              passed: int,
              failed: int,
              skipped: int,
              notExecuted: int,
              passRate: double,
              failRate: double,
              avgExecutionTime: double
            >,
            testResults: array<struct<
              testCaseId: string,
              testName: string,
              testSuite: string,
              status: string,
              errorMessage: string,
              executionTime: bigint,
              retryCount: int,
              browser: string,
              device: string,
              tags: array<string>
            >>,
            systemInfo: struct<
              os: string,
              nodeVersion: string,
              playwrightVersion: string
            >,
            configuration: struct<
              parallel: boolean,
              workers: int,
              timeout: int,
              retries: int
            >
          >>
        )
        PARTITIONED BY (
          year string,
          month string,
          day string
        )
        STORED AS JSON
        LOCATION 's3://${this.config.s3Bucket}/executions/'
        TBLPROPERTIES ('has_encrypted_data'='false')
      `;

      await this.executeAthenaQuery(createExecutionsTableQuery);

      // Repair partitions
      const repairPartitionsQuery = `MSCK REPAIR TABLE ${this.config.athenaDatabase}.executions`;
      await this.executeAthenaQuery(repairPartitionsQuery);

      this.logger.info('Athena tables setup completed');
    } catch (error) {
      this.logger.error('Failed to setup Athena tables', error);
      throw error;
    }
  }

  /**
   * Setup QuickSight data source (optional)
   */
  private async setupQuickSightDataSource(): Promise<void> {
    try {
      this.logger.info('Setting up QuickSight data source...');
      
      // This would require QuickSight API calls
      // Implementation depends on specific QuickSight setup requirements
      
      this.logger.info('QuickSight setup completed (placeholder)');
    } catch (error) {
      this.logger.warn('QuickSight setup failed (optional)', error);
    }
  }

  /**
   * Execute Athena query
   */
  private async executeAthenaQuery(query: string): Promise<string> {
    const params = {
      QueryString: query,
      WorkGroup: this.config.athenaWorkgroup,
      ResultConfiguration: {
        OutputLocation: `s3://${this.config.s3Bucket}/athena-results/`
      }
    };

    const result = await this.athena.startQueryExecution(params).promise();
    const queryExecutionId = result.QueryExecutionId!;

    // Wait for query completion
    let status = 'RUNNING';
    while (status === 'RUNNING' || status === 'QUEUED') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const execution = await this.athena.getQueryExecution({
        QueryExecutionId: queryExecutionId
      }).promise();
      
      status = execution.QueryExecution!.Status!.State!;
    }

    if (status === 'FAILED') {
      const reason = await this.athena.getQueryExecution({
        QueryExecutionId: queryExecutionId
      }).promise();
      throw new Error(`Athena query failed: ${reason.QueryExecution!.Status!.StateChangeReason}`);
    }

    return queryExecutionId;
  }

  /**
   * Utility method to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Validate AWS configuration
   */
  async validateAWSConfiguration(): Promise<boolean> {
    try {
      // Test S3 access
      await this.s3.listBuckets().promise();
      
      // Test DynamoDB access
      await this.dynamodb.listTables().promise();
      
      // Test Athena access
      await this.athena.listWorkGroups().promise();
      
      this.logger.info('AWS configuration validated successfully');
      return true;
    } catch (error) {
      this.logger.error('AWS configuration validation failed', error);
      return false;
    }
  }
}

// CLI execution
async function main() {
  const config = {
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.S3_BUCKET || 'test-execution-reporting',
    dynamoTablePrefix: process.env.DYNAMO_TABLE_PREFIX || 'test-execution',
    athenaDatabase: process.env.ATHENA_DATABASE || 'test_execution_db',
    athenaWorkgroup: process.env.ATHENA_WORKGROUP || 'primary'
  };

  const localDbPath = process.argv[2] || './data/execution-history.db';

  console.log('🚀 AWS Migration Service');
  console.log(`📁 Local Database: ${localDbPath}`);
  console.log(`🌍 AWS Region: ${config.region}`);
  console.log(`🪣 S3 Bucket: ${config.s3Bucket}`);
  console.log(`🗄️ DynamoDB Prefix: ${config.dynamoTablePrefix}`);
  console.log('');

  const migrationService = new AWSMigrationService(config);

  try {
    // Validate AWS configuration
    const isValid = await migrationService.validateAWSConfiguration();
    if (!isValid) {
      console.error('❌ AWS configuration validation failed');
      process.exit(1);
    }

    // Perform migration
    await migrationService.migrateToAWS(localDbPath);
    
    console.log('');
    console.log('🎉 AWS migration completed successfully!');
    console.log(`📊 Data available in S3: s3://${config.s3Bucket}/`);
    console.log(`🗄️ DynamoDB tables: ${config.dynamoTablePrefix}-*`);
    console.log(`📈 Athena database: ${config.athenaDatabase}`);
    
  } catch (error) {
    console.error('💥 AWS migration failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { AWSMigrationService };

// Run if called directly
if (require.main === module) {
  main();
}