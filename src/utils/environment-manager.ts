import * as fs from 'fs';
import * as path from 'path';

export interface EnvironmentConfig {
  environment: string;
  baseUrl: string;
  apiBaseUrl: string;
  timeout: number;
  retries: number;
  headless: boolean;
  slowMo: number;
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    connectionString: string;
  };
  features: {
    [key: string]: {
      enabled: boolean;
      url: string;
      apiEndpoint: string;
      note?: string;
    };
  };
  testData: {
    users: {
      [key: string]: {
        firstName?: string;
        lastName?: string;
        email: string;
        password: string;
      };
    };
    products: {
      [key: string]: {
        id: string;
        name: string;
        price: number;
      };
    };
  };
  integrations: {
    jira: {
      enabled: boolean;
      projectKey: string;
    };
    slack: {
      enabled: boolean;
      channel: string;
    };
    browserstack: {
      enabled: boolean;
    };
    aws: {
      enabled: boolean;
      s3Bucket: string;
    };
  };
  performance: {
    loadUsers: number;
    duration: number;
    thresholds: {
      responseTime: number;
      errorRate: number;
    };
    note?: string;
  };
  security: {
    enableSecurityTests: boolean;
    skipSslVerification: boolean;
    note?: string;
  };
  restrictions?: {
    smokeTestsOnly?: boolean;
    noDataModification?: boolean;
    readOnlyOperations?: boolean;
  };
}

export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private currentEnvironment: string;
  private config: EnvironmentConfig;
  private configCache: Map<string, EnvironmentConfig> = new Map();

  private constructor() {
    this.currentEnvironment = process.env.TEST_ENV || process.env.NODE_ENV || 'dev';
    this.config = this.loadEnvironmentConfig(this.currentEnvironment);
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  /**
   * Load environment configuration from JSON file
   */
  private loadEnvironmentConfig(environment: string): EnvironmentConfig {
    // Check cache first
    if (this.configCache.has(environment)) {
      return this.configCache.get(environment)!;
    }

    const configPath = path.join(process.cwd(), 'config', 'environments', `${environment}.json`);
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Environment configuration file not found: ${configPath}`);
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent) as EnvironmentConfig;
      
      // Replace environment variables in the config
      const processedConfig = this.processEnvironmentVariables(config);
      
      // Cache the processed config
      this.configCache.set(environment, processedConfig);
      
      console.log(`✅ Loaded environment configuration: ${environment}`);
      return processedConfig;
    } catch (error) {
      throw new Error(`Failed to load environment configuration for ${environment}: ${error}`);
    }
  }

  /**
   * Process environment variables in configuration
   */
  private processEnvironmentVariables(config: any): any {
    const processedConfig = JSON.parse(JSON.stringify(config));
    
    const processValue = (value: any): any => {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const envVar = value.slice(2, -1);
        const envValue = process.env[envVar];
        if (envValue === undefined) {
          console.warn(`⚠️ Environment variable ${envVar} is not set, using placeholder`);
          return value;
        }
        return envValue;
      } else if (typeof value === 'object' && value !== null) {
        const processed: any = Array.isArray(value) ? [] : {};
        for (const key in value) {
          processed[key] = processValue(value[key]);
        }
        return processed;
      }
      return value;
    };

    return processValue(processedConfig);
  }

  /**
   * Switch to a different environment
   */
  public switchEnvironment(environment: string): void {
    console.log(`🔄 Switching from ${this.currentEnvironment} to ${environment}`);
    this.currentEnvironment = environment;
    this.config = this.loadEnvironmentConfig(environment);
    process.env.TEST_ENV = environment;
  }

  /**
   * Get current environment name
   */
  public getCurrentEnvironment(): string {
    return this.currentEnvironment;
  }

  /**
   * Get full configuration
   */
  public getConfig(): EnvironmentConfig {
    return this.config;
  }

  /**
   * Get base URL for the current environment
   */
  public getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Get API base URL for the current environment
   */
  public getApiBaseUrl(): string {
    return this.config.apiBaseUrl;
  }

  /**
   * Get database configuration
   */
  public getDatabaseConfig() {
    return this.config.database;
  }

  /**
   * Get feature configuration
   */
  public getFeatureConfig(featureName: string) {
    return this.config.features[featureName];
  }

  /**
   * Check if a feature is enabled
   */
  public isFeatureEnabled(featureName: string): boolean {
    const feature = this.config.features[featureName];
    return feature ? feature.enabled : false;
  }

  /**
   * Get test data for a specific type
   */
  public getTestData(dataType: 'users' | 'products', key: string) {
    return this.config.testData[dataType][key];
  }

  /**
   * Get all users test data
   */
  public getUsersTestData() {
    return this.config.testData.users;
  }

  /**
   * Get all products test data
   */
  public getProductsTestData() {
    return this.config.testData.products;
  }

  /**
   * Get integration configuration
   */
  public getIntegrationConfig(integration: 'jira' | 'slack' | 'browserstack' | 'aws') {
    return this.config.integrations[integration];
  }

  /**
   * Check if an integration is enabled
   */
  public isIntegrationEnabled(integration: 'jira' | 'slack' | 'browserstack' | 'aws'): boolean {
    return this.config.integrations[integration].enabled;
  }

  /**
   * Get performance testing configuration
   */
  public getPerformanceConfig() {
    return this.config.performance;
  }

  /**
   * Get security testing configuration
   */
  public getSecurityConfig() {
    return this.config.security;
  }

  /**
   * Get timeout configuration
   */
  public getTimeout(): number {
    return this.config.timeout;
  }

  /**
   * Get retry configuration
   */
  public getRetries(): number {
    return this.config.retries;
  }

  /**
   * Check if environment has restrictions
   */
  public hasRestrictions(): boolean {
    return !!this.config.restrictions;
  }

  /**
   * Get environment restrictions
   */
  public getRestrictions() {
    return this.config.restrictions || {};
  }

  /**
   * Check if smoke tests only mode is enabled
   */
  public isSmokeTestsOnly(): boolean {
    return this.config.restrictions?.smokeTestsOnly || false;
  }

  /**
   * Check if data modification is allowed
   */
  public isDataModificationAllowed(): boolean {
    return !this.config.restrictions?.noDataModification;
  }

  /**
   * Get full URL for a feature
   */
  public getFeatureUrl(featureName: string): string {
    const feature = this.config.features[featureName];
    if (!feature) {
      throw new Error(`Feature ${featureName} not found in configuration`);
    }
    return `${this.config.baseUrl}${feature.url}`;
  }

  /**
   * Get full API URL for a feature
   */
  public getFeatureApiUrl(featureName: string): string {
    const feature = this.config.features[featureName];
    if (!feature) {
      throw new Error(`Feature ${featureName} not found in configuration`);
    }
    return `${this.config.apiBaseUrl}${feature.apiEndpoint}`;
  }

  /**
   * List all available environments
   */
  public static getAvailableEnvironments(): string[] {
    const configDir = path.join(process.cwd(), 'config', 'environments');
    if (!fs.existsSync(configDir)) {
      return [];
    }
    
    return fs.readdirSync(configDir)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  }

  /**
   * Validate environment configuration
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!this.config.baseUrl) {
      errors.push('baseUrl is required');
    }
    if (!this.config.apiBaseUrl) {
      errors.push('apiBaseUrl is required');
    }
    if (!this.config.database) {
      errors.push('database configuration is required');
    }

    // Validate URLs
    try {
      new URL(this.config.baseUrl);
    } catch {
      errors.push('baseUrl is not a valid URL');
    }

    try {
      new URL(this.config.apiBaseUrl);
    } catch {
      errors.push('apiBaseUrl is not a valid URL');
    }

    // Check if features are properly configured
    for (const [featureName, feature] of Object.entries(this.config.features)) {
      if (!feature.url || !feature.apiEndpoint) {
        errors.push(`Feature ${featureName} is missing url or apiEndpoint`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Print current configuration summary
   */
  public printConfigSummary(): void {
    console.log(`
🌍 Environment Configuration Summary
=====================================
Environment: ${this.currentEnvironment}
Base URL: ${this.config.baseUrl}
API URL: ${this.config.apiBaseUrl}
Timeout: ${this.config.timeout}ms
Retries: ${this.config.retries}
Headless: ${this.config.headless}

Features:
${Object.entries(this.config.features)
  .map(([name, feature]) => `  - ${name}: ${feature.enabled ? '✅' : '❌'} ${feature.url}`)
  .join('\n')}

Integrations:
${Object.entries(this.config.integrations)
  .map(([name, integration]) => `  - ${name}: ${integration.enabled ? '✅' : '❌'}`)
  .join('\n')}

${this.config.restrictions ? `
Restrictions:
${Object.entries(this.config.restrictions)
  .map(([key, value]) => `  - ${key}: ${value}`)
  .join('\n')}
` : ''}
=====================================
    `);
  }
}

// Export singleton instance
export const envManager = EnvironmentManager.getInstance();