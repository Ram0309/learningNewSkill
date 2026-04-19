#!/usr/bin/env node

/**
 * Command Line Interface for Test Execution Reporting System
 * Provides easy access to all reporting functionality
 */

import { Command } from 'commander';
import * as inquirer from 'inquirer';
import * as chalk from 'chalk';
import * as ora from 'ora';
import { table } from 'table';
import { SQLiteStorageService } from './services/storage/SQLiteStorageService';
import { JSONStorageService } from './services/storage/JSONStorageService';
import { ExcelExportService } from './services/export/ExcelExportService';
import { CSVExportService } from './services/export/CSVExportService';
import { AWSMigrationService } from '../scripts/migrate-to-aws';
import { DatabaseSetup } from '../scripts/setup-database';
import { Logger } from './utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();
const logger = new Logger('CLI');

program
  .name('test-execution-reporting')
  .description('Enterprise Test Execution Reporting System CLI')
  .version('1.0.0');

// Setup command
program
  .command('setup')
  .description('Initialize database with sample data')
  .option('-p, --path <path>', 'Database path', './data/execution-history.db')
  .option('-s, --samples <count>', 'Number of sample executions', '100')
  .action(async (options) => {
    const spinner = ora('Setting up database...').start();
    
    try {
      const setup = new DatabaseSetup(options.path);
      await setup.setup();
      
      spinner.succeed(chalk.green('Database setup completed successfully!'));
      
      const isValid = await setup.validateSetup();
      if (isValid) {
        console.log(chalk.green('✅ Database validation passed'));
      } else {
        console.log(chalk.red('❌ Database validation failed'));
      }
    } catch (error) {
      spinner.fail(chalk.red('Database setup failed'));
      console.error(error);
      process.exit(1);
    }
  });

// Dashboard command
program
  .command('dashboard')
  .description('Start the dashboard server')
  .option('-p, --port <port>', 'Port number', '8080')
  .option('-h, --host <host>', 'Host address', 'localhost')
  .action(async (options) => {
    const { spawn } = require('child_process');
    
    console.log(chalk.blue('🚀 Starting Test Execution Dashboard...'));
    console.log(chalk.gray(`   URL: http://${options.host}:${options.port}`));
    console.log(chalk.gray('   Press Ctrl+C to stop'));
    console.log('');
    
    const server = spawn('npx', ['http-server', 'src/dashboard', '-p', options.port, '-c-1'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Stopping dashboard server...'));
      server.kill();
      process.exit(0);
    });
  });

// Export command
program
  .command('export')
  .description('Export execution data')
  .option('-f, --format <format>', 'Export format (excel, csv, json)', 'excel')
  .option('-o, --output <path>', 'Output file path')
  .option('-d, --database <path>', 'Database path', './data/execution-history.db')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--project <project>', 'Filter by project')
  .option('--environment <env>', 'Filter by environment')
  .action(async (options) => {
    const spinner = ora('Exporting data...').start();
    
    try {
      // Initialize storage service
      const storageService = new SQLiteStorageService(options.database);
      await storageService.initialize();
      
      // Build filters
      const filters: any = {};
      if (options.from) filters.dateFrom = options.from;
      if (options.to) filters.dateTo = options.to;
      if (options.project) filters.project = options.project;
      if (options.environment) filters.environment = options.environment;
      
      // Get executions
      const executions = await storageService.getExecutions(filters);
      
      if (executions.length === 0) {
        spinner.warn(chalk.yellow('No executions found matching the criteria'));
        return;
      }
      
      // Generate output path if not provided
      const timestamp = new Date().toISOString().split('T')[0];
      const defaultOutput = `./reports/export-${timestamp}.${options.format === 'excel' ? 'xlsx' : options.format}`;
      const outputPath = options.output || defaultOutput;
      
      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      
      // Export data
      if (options.format === 'excel') {
        const exportService = new ExcelExportService();
        await exportService.exportToExcel(executions, outputPath, filters);
      } else if (options.format === 'csv') {
        const exportService = new CSVExportService();
        await exportService.exportToCSV(executions, outputPath, filters);
      } else if (options.format === 'json') {
        const exportService = new CSVExportService();
        await exportService.exportToJSON(executions, outputPath, filters);
      } else {
        throw new Error(`Unsupported format: ${options.format}`);
      }
      
      spinner.succeed(chalk.green(`Data exported successfully to ${outputPath}`));
      console.log(chalk.gray(`   Executions: ${executions.length}`));
      console.log(chalk.gray(`   Format: ${options.format.toUpperCase()}`));
      
    } catch (error) {
      spinner.fail(chalk.red('Export failed'));
      console.error(error);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show database statistics')
  .option('-d, --database <path>', 'Database path', './data/execution-history.db')
  .action(async (options) => {
    const spinner = ora('Loading statistics...').start();
    
    try {
      const storageService = new SQLiteStorageService(options.database);
      await storageService.initialize();
      
      const metrics = await storageService.getDashboardMetrics();
      
      spinner.stop();
      
      console.log(chalk.blue.bold('\n📊 Test Execution Statistics\n'));
      
      // Basic metrics table
      const basicData = [
        ['Metric', 'Value'],
        ['Total Executions', metrics.totalExecutions.toLocaleString()],
        ['Total Tests', metrics.totalTests.toLocaleString()],
        ['Overall Pass Rate', `${metrics.overallPassRate.toFixed(1)}%`],
        ['Avg Execution Time', `${Math.round(metrics.avgExecutionTime / 1000)}s`]
      ];
      
      console.log(table(basicData, {
        header: {
          alignment: 'center',
          content: chalk.cyan.bold('Basic Metrics')
        }
      }));
      
      // Environment stats
      if (Object.keys(metrics.environmentStats).length > 0) {
        console.log(chalk.blue.bold('\n🌍 Environment Statistics\n'));
        
        const envData = [['Environment', 'Executions', 'Pass Rate']];
        Object.entries(metrics.environmentStats).forEach(([env, stats]) => {
          envData.push([
            env.toUpperCase(),
            stats.executions.toString(),
            `${stats.passRate.toFixed(1)}%`
          ]);
        });
        
        console.log(table(envData));
      }
      
      // Top failing tests
      if (metrics.topFailingTests.length > 0) {
        console.log(chalk.blue.bold('\n❌ Top Failing Tests\n'));
        
        const failingData = [['Test Name', 'Failures', 'Failure Rate']];
        metrics.topFailingTests.slice(0, 5).forEach(test => {
          failingData.push([
            test.testName.length > 50 ? test.testName.substring(0, 47) + '...' : test.testName,
            test.failureCount.toString(),
            `${test.failureRate.toFixed(1)}%`
          ]);
        });
        
        console.log(table(failingData));
      }
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to load statistics'));
      console.error(error);
      process.exit(1);
    }
  });

// Migrate command
program
  .command('migrate')
  .description('Migrate data to AWS')
  .option('-d, --database <path>', 'Local database path', './data/execution-history.db')
  .option('-r, --region <region>', 'AWS region', 'us-east-1')
  .option('-b, --bucket <bucket>', 'S3 bucket name', 'test-execution-reporting')
  .option('--dynamo-prefix <prefix>', 'DynamoDB table prefix', 'test-execution')
  .option('--athena-db <database>', 'Athena database name', 'test_execution_db')
  .action(async (options) => {
    const spinner = ora('Migrating to AWS...').start();
    
    try {
      const config = {
        region: options.region,
        s3Bucket: options.bucket,
        dynamoTablePrefix: options.dynamoPrefix,
        athenaDatabase: options.athenaDb,
        athenaWorkgroup: 'primary'
      };
      
      const migrationService = new AWSMigrationService(config);
      
      // Validate AWS configuration
      const isValid = await migrationService.validateAWSConfiguration();
      if (!isValid) {
        throw new Error('AWS configuration validation failed');
      }
      
      // Perform migration
      await migrationService.migrateToAWS(options.database);
      
      spinner.succeed(chalk.green('AWS migration completed successfully!'));
      console.log(chalk.gray(`   S3 Bucket: ${options.bucket}`));
      console.log(chalk.gray(`   DynamoDB Tables: ${options.dynamoPrefix}-*`));
      console.log(chalk.gray(`   Athena Database: ${options.athenaDb}`));
      
    } catch (error) {
      spinner.fail(chalk.red('AWS migration failed'));
      console.error(error);
      process.exit(1);
    }
  });

// Interactive command
program
  .command('interactive')
  .alias('i')
  .description('Interactive mode')
  .action(async () => {
    console.log(chalk.blue.bold('🎯 Test Execution Reporting System - Interactive Mode\n'));
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '📊 View Statistics', value: 'stats' },
          { name: '📤 Export Data', value: 'export' },
          { name: '🚀 Start Dashboard', value: 'dashboard' },
          { name: '🗄️ Setup Database', value: 'setup' },
          { name: '☁️ Migrate to AWS', value: 'migrate' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);
    
    if (action === 'exit') {
      console.log(chalk.gray('Goodbye! 👋'));
      return;
    }
    
    // Handle the selected action
    switch (action) {
      case 'stats':
        await handleStatsInteractive();
        break;
      case 'export':
        await handleExportInteractive();
        break;
      case 'dashboard':
        await handleDashboardInteractive();
        break;
      case 'setup':
        await handleSetupInteractive();
        break;
      case 'migrate':
        await handleMigrateInteractive();
        break;
    }
  });

// Interactive handlers
async function handleStatsInteractive() {
  const { database } = await inquirer.prompt([
    {
      type: 'input',
      name: 'database',
      message: 'Database path:',
      default: './data/execution-history.db'
    }
  ]);
  
  // Execute stats command
  await program.parseAsync(['node', 'cli.js', 'stats', '-d', database]);
}

async function handleExportInteractive() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'database',
      message: 'Database path:',
      default: './data/execution-history.db'
    },
    {
      type: 'list',
      name: 'format',
      message: 'Export format:',
      choices: ['excel', 'csv', 'json']
    },
    {
      type: 'input',
      name: 'output',
      message: 'Output file path (leave empty for auto-generated):'
    }
  ]);
  
  const args = ['node', 'cli.js', 'export', '-d', answers.database, '-f', answers.format];
  if (answers.output) {
    args.push('-o', answers.output);
  }
  
  await program.parseAsync(args);
}

async function handleDashboardInteractive() {
  const { port } = await inquirer.prompt([
    {
      type: 'input',
      name: 'port',
      message: 'Port number:',
      default: '8080'
    }
  ]);
  
  await program.parseAsync(['node', 'cli.js', 'dashboard', '-p', port]);
}

async function handleSetupInteractive() {
  const { database } = await inquirer.prompt([
    {
      type: 'input',
      name: 'database',
      message: 'Database path:',
      default: './data/execution-history.db'
    }
  ]);
  
  await program.parseAsync(['node', 'cli.js', 'setup', '-p', database]);
}

async function handleMigrateInteractive() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'database',
      message: 'Local database path:',
      default: './data/execution-history.db'
    },
    {
      type: 'input',
      name: 'region',
      message: 'AWS region:',
      default: 'us-east-1'
    },
    {
      type: 'input',
      name: 'bucket',
      message: 'S3 bucket name:',
      default: 'test-execution-reporting'
    }
  ]);
  
  await program.parseAsync([
    'node', 'cli.js', 'migrate',
    '-d', answers.database,
    '-r', answers.region,
    '-b', answers.bucket
  ]);
}

// Health check command
program
  .command('health')
  .description('Check system health')
  .option('-d, --database <path>', 'Database path', './data/execution-history.db')
  .action(async (options) => {
    const spinner = ora('Checking system health...').start();
    
    try {
      const storageService = new SQLiteStorageService(options.database);
      await storageService.initialize();
      
      const isHealthy = await storageService.healthCheck();
      const executionCount = await storageService.getExecutionCount();
      
      spinner.stop();
      
      if (isHealthy) {
        console.log(chalk.green('✅ System is healthy'));
        console.log(chalk.gray(`   Database: ${options.database}`));
        console.log(chalk.gray(`   Executions: ${executionCount}`));
      } else {
        console.log(chalk.red('❌ System is unhealthy'));
        process.exit(1);
      }
      
    } catch (error) {
      spinner.fail(chalk.red('Health check failed'));
      console.error(error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}