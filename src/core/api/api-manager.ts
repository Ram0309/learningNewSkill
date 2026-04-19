import { APIRequestContext, APIResponse } from '@playwright/test';
import { ConfigManager } from '../config/config-manager';
import { Logger } from '../utils/logger';
import Joi from 'joi';
import Ajv from 'ajv';

export interface APITestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  validateSchema?: boolean;
  validateContract?: boolean;
  captureMetrics?: boolean;
}

export interface APIMetrics {
  responseTime: number;
  statusCode: number;
  contentLength: number;
  timestamp: Date;
  endpoint: string;
  method: string;
}

export interface ContractValidation {
  provider: string;
  consumer: string;
  interaction: string;
  expected: any;
  actual: any;
  isValid: boolean;
}

export class APIManager {
  private ajv: Ajv;
  private metrics: APIMetrics[] = [];
  private contracts: Map<string, any> = new Map();

  constructor(
    private request: APIRequestContext,
    private config: ConfigManager,
    private logger: Logger
  ) {
    this.ajv = new Ajv({ allErrors: true });
    this.loadContracts();
  }

  /**
   * Enhanced GET request with validation and metrics
   */
  async get(url: string, options: APITestOptions = {}): Promise<APIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.request.get(url, {
        timeout: options.timeout || 30000,
        headers: {
          ...this.getDefaultHeaders(),
          ...options.headers,
        },
      });

      await this.captureMetrics('GET', url, response, startTime);
      
      if (options.validateSchema) {
        await this.validateResponseSchema(response, url, 'GET');
      }
      
      if (options.validateContract) {
        await this.validateContract(response, url, 'GET');
      }

      return response;
    } catch (error) {
      this.logger.error(`GET request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Enhanced POST request with validation and metrics
   */
  async post(url: string, data?: any, options: APITestOptions = {}): Promise<APIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.request.post(url, {
        data,
        timeout: options.timeout || 30000,
        headers: {
          ...this.getDefaultHeaders(),
          ...options.headers,
        },
      });

      await this.captureMetrics('POST', url, response, startTime);
      
      if (options.validateSchema) {
        await this.validateResponseSchema(response, url, 'POST');
      }
      
      if (options.validateContract) {
        await this.validateContract(response, url, 'POST', data);
      }

      return response;
    } catch (error) {
      this.logger.error(`POST request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Enhanced PUT request with validation and metrics
   */
  async put(url: string, data?: any, options: APITestOptions = {}): Promise<APIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.request.put(url, {
        data,
        timeout: options.timeout || 30000,
        headers: {
          ...this.getDefaultHeaders(),
          ...options.headers,
        },
      });

      await this.captureMetrics('PUT', url, response, startTime);
      
      if (options.validateSchema) {
        await this.validateResponseSchema(response, url, 'PUT');
      }

      return response;
    } catch (error) {
      this.logger.error(`PUT request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Enhanced DELETE request with validation and metrics
   */
  async delete(url: string, options: APITestOptions = {}): Promise<APIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.request.delete(url, {
        timeout: options.timeout || 30000,
        headers: {
          ...this.getDefaultHeaders(),
          ...options.headers,
        },
      });

      await this.captureMetrics('DELETE', url, response, startTime);
      
      if (options.validateSchema) {
        await this.validateResponseSchema(response, url, 'DELETE');
      }

      return response;
    } catch (error) {
      this.logger.error(`DELETE request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * GraphQL query execution
   */
  async graphql(query: string, variables?: any, options: APITestOptions = {}): Promise<APIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.request.post('/graphql', {
        data: {
          query,
          variables,
        },
        timeout: options.timeout || 30000,
        headers: {
          ...this.getDefaultHeaders(),
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      await this.captureMetrics('POST', '/graphql', response, startTime);
      
      // Validate GraphQL response structure
      const responseBody = await response.json();
      if (responseBody.errors) {
        this.logger.warn('GraphQL errors detected:', responseBody.errors);
      }

      return response;
    } catch (error) {
      this.logger.error('GraphQL request failed:', error);
      throw error;
    }
  }

  /**
   * Batch API requests with parallel execution
   */
  async batch(requests: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    data?: any;
    options?: APITestOptions;
  }>): Promise<APIResponse[]> {
    const promises = requests.map(req => {
      switch (req.method) {
        case 'GET':
          return this.get(req.url, req.options);
        case 'POST':
          return this.post(req.url, req.data, req.options);
        case 'PUT':
          return this.put(req.url, req.data, req.options);
        case 'DELETE':
          return this.delete(req.url, req.options);
        default:
          throw new Error(`Unsupported method: ${req.method}`);
      }
    });

    return Promise.all(promises);
  }

  /**
   * Validate response against JSON schema
   */
  async validateSchema(response: any, schema: object): Promise<boolean> {
    try {
      const validate = this.ajv.compile(schema);
      const isValid = validate(response);
      
      if (!isValid) {
        this.logger.error('Schema validation failed:', validate.errors);
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error('Schema validation error:', error);
      return false;
    }
  }

  /**
   * Validate response schema based on endpoint configuration
   */
  private async validateResponseSchema(response: APIResponse, url: string, method: string): Promise<void> {
    const schemaKey = `${method}:${url}`;
    const schema = this.config.get(`api.schemas.${schemaKey}`);
    
    if (schema) {
      const responseBody = await response.json();
      const isValid = await this.validateSchema(responseBody, schema);
      
      if (!isValid) {
        throw new Error(`Response schema validation failed for ${method} ${url}`);
      }
    }
  }

  /**
   * Contract testing validation (Pact-style)
   */
  private async validateContract(response: APIResponse, url: string, method: string, requestData?: any): Promise<void> {
    const contractKey = `${method}:${url}`;
    const contract = this.contracts.get(contractKey);
    
    if (contract) {
      const responseBody = await response.json();
      const validation: ContractValidation = {
        provider: contract.provider,
        consumer: contract.consumer,
        interaction: contract.interaction,
        expected: contract.response,
        actual: responseBody,
        isValid: this.compareObjects(contract.response, responseBody),
      };
      
      if (!validation.isValid) {
        this.logger.error('Contract validation failed:', validation);
        throw new Error(`Contract validation failed for ${method} ${url}`);
      }
      
      this.logger.info('Contract validation passed:', validation);
    }
  }

  /**
   * Capture API metrics for performance monitoring
   */
  private async captureMetrics(method: string, url: string, response: APIResponse, startTime: number): Promise<void> {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const metrics: APIMetrics = {
      responseTime,
      statusCode: response.status(),
      contentLength: parseInt(response.headers()['content-length'] || '0'),
      timestamp: new Date(),
      endpoint: url,
      method,
    };
    
    this.metrics.push(metrics);
    
    // Log performance metrics
    this.logger.info(`API Metrics - ${method} ${url}:`, {
      responseTime: `${responseTime}ms`,
      statusCode: metrics.statusCode,
      contentLength: `${metrics.contentLength} bytes`,
    });
    
    // Alert on slow responses
    const slowThreshold = this.config.get('api.performance.slowThreshold') || 2000;
    if (responseTime > slowThreshold) {
      this.logger.warn(`Slow API response detected: ${method} ${url} took ${responseTime}ms`);
    }
  }

  /**
   * Get default headers for API requests
   */
  private getDefaultHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Unified-Automation-Framework/1.0.0',
      'X-Test-Run-Id': process.env.TEST_RUN_ID || 'local',
      ...this.config.get('api.defaultHeaders', {}),
    };
  }

  /**
   * Load API contracts from configuration
   */
  private loadContracts(): void {
    const contracts = this.config.get('api.contracts', {});
    
    Object.entries(contracts).forEach(([key, contract]) => {
      this.contracts.set(key, contract);
    });
    
    this.logger.info(`Loaded ${this.contracts.size} API contracts`);
  }

  /**
   * Compare objects for contract validation
   */
  private compareObjects(expected: any, actual: any): boolean {
    try {
      // Use Joi for flexible object comparison
      const schema = Joi.object(expected).unknown(true);
      const { error } = schema.validate(actual);
      return !error;
    } catch (error) {
      this.logger.error('Object comparison error:', error);
      return false;
    }
  }

  /**
   * Get API performance metrics
   */
  getMetrics(): APIMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalRequests: number;
    averageResponseTime: number;
    slowestRequest: APIMetrics | null;
    fastestRequest: APIMetrics | null;
    errorRate: number;
  } {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowestRequest: null,
        fastestRequest: null,
        errorRate: 0,
      };
    }

    const totalRequests = this.metrics.length;
    const averageResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const slowestRequest = this.metrics.reduce((slowest, current) => 
      current.responseTime > slowest.responseTime ? current : slowest
    );
    const fastestRequest = this.metrics.reduce((fastest, current) => 
      current.responseTime < fastest.responseTime ? current : fastest
    );
    const errorCount = this.metrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      slowestRequest,
      fastestRequest,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  /**
   * Reset metrics collection
   */
  resetMetrics(): void {
    this.metrics = [];
  }

  /**
   * Export metrics to file
   */
  async exportMetrics(filePath: string): Promise<void> {
    const fs = await import('fs/promises');
    const summary = this.getPerformanceSummary();
    
    const exportData = {
      summary,
      metrics: this.metrics,
      exportedAt: new Date().toISOString(),
    };
    
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    this.logger.info(`API metrics exported to ${filePath}`);
  }
}