import * as winston from 'winston';
import * as path from 'path';

/**
 * Enterprise-grade logger for Test Execution Reporting System
 * Supports multiple log levels and output formats
 */
export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string = 'TestExecutionReporting') {
    this.context = context;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, context, stack }) => {
        const contextStr = context || this.context;
        const baseMessage = `${timestamp} [${level.toUpperCase()}] [${contextStr}] ${message}`;
        return stack ? `${baseMessage}\n${stack}` : baseMessage;
      })
    );

    const logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            logFormat
          )
        }),
        
        // File transport for all logs
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'test-execution-reporting.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        }),
        
        // Separate file for errors
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        })
      ],
      
      // Handle uncaught exceptions
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'exceptions.log')
        })
      ],
      
      // Handle unhandled promise rejections
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'rejections.log')
        })
      ]
    });

    return logger;
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  /**
   * Log info message
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, { context: this.context, ...meta });
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, meta?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, { 
        context: this.context, 
        stack: error.stack,
        ...meta 
      });
    } else if (error) {
      this.logger.error(message, { 
        context: this.context, 
        error: error.toString(),
        ...meta 
      });
    } else {
      this.logger.error(message, { context: this.context, ...meta });
    }
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, meta?: any): void {
    this.logger.info(`Performance: ${operation} completed in ${duration}ms`, {
      context: this.context,
      operation,
      duration,
      ...meta
    });
  }

  /**
   * Log execution start
   */
  executionStart(executionId: string, project: string, environment: string): void {
    this.logger.info(`Execution started: ${executionId}`, {
      context: this.context,
      executionId,
      project,
      environment,
      event: 'execution_start'
    });
  }

  /**
   * Log execution end
   */
  executionEnd(executionId: string, duration: number, summary: any): void {
    this.logger.info(`Execution completed: ${executionId} in ${duration}ms`, {
      context: this.context,
      executionId,
      duration,
      summary,
      event: 'execution_end'
    });
  }

  /**
   * Log test result
   */
  testResult(testName: string, status: string, duration: number, error?: string): void {
    const level = status === 'Failed' ? 'warn' : 'info';
    this.logger.log(level, `Test ${status}: ${testName} (${duration}ms)`, {
      context: this.context,
      testName,
      status,
      duration,
      error,
      event: 'test_result'
    });
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: string): Logger {
    const childLogger = new Logger(`${this.context}:${additionalContext}`);
    return childLogger;
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: string): void {
    this.logger.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): string {
    return this.logger.level;
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}