import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { ConfigManager } from '../config/config-manager';

// Plugin interfaces for each layer
export interface IPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  layer: PluginLayer;
  dependencies: string[];
  initialize(context: PluginContext): Promise<void>;
  destroy(): Promise<void>;
}

export enum PluginLayer {
  TEST = 'test',
  BUSINESS = 'business', 
  SERVICE = 'service',
  CORE_UTILITIES = 'core-utilities'
}

export interface PluginContext {
  tenantId: string;
  projectId?: string;
  config: ConfigManager;
  logger: Logger;
  eventBus: EventEmitter;
}

// Test Layer Plugin Interface
export interface ITestPlugin extends IPlugin {
  layer: PluginLayer.TEST;
  beforeTest?(context: TestContext): Promise<void>;
  afterTest?(context: TestContext, result: TestResult): Promise<void>;
  onTestFailure?(context: TestContext, error: Error): Promise<void>;
  onTestSkip?(context: TestContext, reason: string): Promise<void>;
  beforeSuite?(context: SuiteContext): Promise<void>;
  afterSuite?(context: SuiteContext, results: TestResult[]): Promise<void>;
}

// Business Layer Plugin Interface
export interface IBusinessPlugin extends IPlugin {
  layer: PluginLayer.BUSINESS;
  beforeAction?(action: BusinessAction): Promise<void>;
  afterAction?(action: BusinessAction, result: any): Promise<void>;
  validateResult?(result: any): Promise<ValidationResult>;
  transformData?(data: any): Promise<any>;
  beforeWorkflow?(workflow: Workflow): Promise<void>;
  afterWorkflow?(workflow: Workflow, result: WorkflowResult): Promise<void>;
}

// Service Layer Plugin Interface
export interface IServicePlugin extends IPlugin {
  layer: PluginLayer.SERVICE;
  beforeExecution?(request: ExecutionRequest): Promise<void>;
  afterExecution?(request: ExecutionRequest, result: ExecutionResult): Promise<void>;
  onServiceStart?(serviceName: string): Promise<void>;
  onServiceStop?(serviceName: string): Promise<void>;
  handleServiceError?(serviceName: string, error: Error): Promise<void>;
  transformRequest?(request: any): Promise<any>;
  transformResponse?(response: any): Promise<any>;
}

// Core Utilities Layer Plugin Interface
export interface ICoreUtilitiesPlugin extends IPlugin {
  layer: PluginLayer.CORE_UTILITIES;
  beforeOperation?(operation: string, params: any): Promise<void>;
  afterOperation?(operation: string, params: any, result: any): Promise<void>;
  onConfigChange?(key: string, oldValue: any, newValue: any): Promise<void>;
  onLogEvent?(event: LogEvent): Promise<void>;
  beforeStorageOperation?(operation: StorageOperation): Promise<void>;
  afterStorageOperation?(operation: StorageOperation, result: any): Promise<void>;
}

// Plugin Registry
export interface PluginRegistry {
  testPlugins: Map<string, ITestPlugin>;
  businessPlugins: Map<string, IBusinessPlugin>;
  servicePlugins: Map<string, IServicePlugin>;
  coreUtilitiesPlugins: Map<string, ICoreUtilitiesPlugin>;
}

// Plugin Metadata
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  layer: PluginLayer;
  dependencies: string[];
  permissions: PluginPermission[];
  configuration?: PluginConfiguration;
  installDate?: Date;
  lastUpdated?: Date;
  isEnabled: boolean;
  tenantId: string;
}

export interface PluginPermission {
  resource: string;
  actions: string[];
}

export interface PluginConfiguration {
  schema: any;
  defaultValues: Record<string, any>;
  required: string[];
}

// Plugin Manager Implementation
export class PluginManager extends EventEmitter {
  private registry: PluginRegistry;
  private metadata: Map<string, PluginMetadata>;
  private loadedPlugins: Map<string, IPlugin>;
  private dependencyGraph: Map<string, string[]>;

  constructor(
    private config: ConfigManager,
    private logger: Logger
  ) {
    super();
    this.registry = {
      testPlugins: new Map(),
      businessPlugins: new Map(),
      servicePlugins: new Map(),
      coreUtilitiesPlugins: new Map()
    };
    this.metadata = new Map();
    this.loadedPlugins = new Map();
    this.dependencyGraph = new Map();
  }

  /**
   * Initialize the plugin manager
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Plugin Manager');
    
    // Load plugin metadata from storage
    await this.loadPluginMetadata();
    
    // Load and initialize enabled plugins
    await this.loadEnabledPlugins();
    
    // Validate plugin dependencies
    await this.validateDependencies();
    
    this.logger.info(`Plugin Manager initialized with ${this.loadedPlugins.size} plugins`);
  }

  /**
   * Install a new plugin
   */
  async installPlugin(
    pluginPath: string, 
    tenantId: string,
    configuration?: Record<string, any>
  ): Promise<void> {
    this.logger.info(`Installing plugin from: ${pluginPath} for tenant: ${tenantId}`);
    
    try {
      // Load plugin module
      const PluginClass = await this.loadPluginModule(pluginPath);
      const plugin = new PluginClass();
      
      // Validate plugin interface
      this.validatePluginInterface(plugin);
      
      // Check dependencies
      await this.checkDependencies(plugin.dependencies, tenantId);
      
      // Create plugin context
      const context: PluginContext = {
        tenantId,
        config: this.config,
        logger: this.logger.child({ plugin: plugin.id }),
        eventBus: this
      };
      
      // Initialize plugin
      await plugin.initialize(context);
      
      // Register plugin
      await this.registerPlugin(plugin, tenantId, configuration);
      
      // Update dependency graph
      this.updateDependencyGraph(plugin);
      
      this.emit('pluginInstalled', { pluginId: plugin.id, tenantId });
      this.logger.info(`Plugin installed successfully: ${plugin.id}`);
      
    } catch (error) {
      this.logger.error(`Failed to install plugin: ${error.message}`);
      throw error;
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string, tenantId: string): Promise<void> {
    this.logger.info(`Uninstalling plugin: ${pluginId} for tenant: ${tenantId}`);
    
    try {
      const plugin = this.loadedPlugins.get(`${tenantId}:${pluginId}`);
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginId}`);
      }
      
      // Check if other plugins depend on this one
      const dependents = this.findDependentPlugins(pluginId, tenantId);
      if (dependents.length > 0) {
        throw new Error(`Cannot uninstall plugin ${pluginId}. Dependent plugins: ${dependents.join(', ')}`);
      }
      
      // Destroy plugin
      await plugin.destroy();
      
      // Unregister plugin
      await this.unregisterPlugin(pluginId, tenantId);
      
      // Update dependency graph
      this.removeDependencyNode(pluginId, tenantId);
      
      this.emit('pluginUninstalled', { pluginId, tenantId });
      this.logger.info(`Plugin uninstalled successfully: ${pluginId}`);
      
    } catch (error) {
      this.logger.error(`Failed to uninstall plugin: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string, tenantId: string): Promise<void> {
    const metadata = this.metadata.get(`${tenantId}:${pluginId}`);
    if (!metadata) {
      throw new Error(`Plugin metadata not found: ${pluginId}`);
    }
    
    metadata.isEnabled = true;
    await this.savePluginMetadata(metadata);
    
    // Load and initialize the plugin
    await this.loadPlugin(metadata);
    
    this.emit('pluginEnabled', { pluginId, tenantId });
    this.logger.info(`Plugin enabled: ${pluginId}`);
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string, tenantId: string): Promise<void> {
    const pluginKey = `${tenantId}:${pluginId}`;
    const plugin = this.loadedPlugins.get(pluginKey);
    
    if (plugin) {
      await plugin.destroy();
      this.loadedPlugins.delete(pluginKey);
      this.unregisterFromLayer(plugin);
    }
    
    const metadata = this.metadata.get(pluginKey);
    if (metadata) {
      metadata.isEnabled = false;
      await this.savePluginMetadata(metadata);
    }
    
    this.emit('pluginDisabled', { pluginId, tenantId });
    this.logger.info(`Plugin disabled: ${pluginId}`);
  }

  /**
   * Get plugins by layer
   */
  getPluginsByLayer<T extends IPlugin>(layer: PluginLayer, tenantId: string): T[] {
    const plugins: T[] = [];
    
    switch (layer) {
      case PluginLayer.TEST:
        this.registry.testPlugins.forEach((plugin, key) => {
          if (key.startsWith(`${tenantId}:`)) {
            plugins.push(plugin as T);
          }
        });
        break;
      case PluginLayer.BUSINESS:
        this.registry.businessPlugins.forEach((plugin, key) => {
          if (key.startsWith(`${tenantId}:`)) {
            plugins.push(plugin as T);
          }
        });
        break;
      case PluginLayer.SERVICE:
        this.registry.servicePlugins.forEach((plugin, key) => {
          if (key.startsWith(`${tenantId}:`)) {
            plugins.push(plugin as T);
          }
        });
        break;
      case PluginLayer.CORE_UTILITIES:
        this.registry.coreUtilitiesPlugins.forEach((plugin, key) => {
          if (key.startsWith(`${tenantId}:`)) {
            plugins.push(plugin as T);
          }
        });
        break;
    }
    
    return plugins;
  }

  /**
   * Execute plugin hooks for test layer
   */
  async executeTestHooks(
    hookName: keyof ITestPlugin,
    tenantId: string,
    ...args: any[]
  ): Promise<void> {
    const plugins = this.getPluginsByLayer<ITestPlugin>(PluginLayer.TEST, tenantId);
    
    for (const plugin of plugins) {
      try {
        const hook = plugin[hookName] as Function;
        if (hook && typeof hook === 'function') {
          await hook.apply(plugin, args);
        }
      } catch (error) {
        this.logger.error(`Plugin hook execution failed: ${plugin.id}.${hookName}`, error);
        // Continue with other plugins
      }
    }
  }

  /**
   * Execute plugin hooks for business layer
   */
  async executeBusinessHooks(
    hookName: keyof IBusinessPlugin,
    tenantId: string,
    ...args: any[]
  ): Promise<any> {
    const plugins = this.getPluginsByLayer<IBusinessPlugin>(PluginLayer.BUSINESS, tenantId);
    let result = args[args.length - 1]; // Last argument is usually the result to transform
    
    for (const plugin of plugins) {
      try {
        const hook = plugin[hookName] as Function;
        if (hook && typeof hook === 'function') {
          const hookResult = await hook.apply(plugin, args);
          if (hookResult !== undefined) {
            result = hookResult;
            args[args.length - 1] = result; // Update for next plugin
          }
        }
      } catch (error) {
        this.logger.error(`Plugin hook execution failed: ${plugin.id}.${hookName}`, error);
      }
    }
    
    return result;
  }

  /**
   * Execute plugin hooks for service layer
   */
  async executeServiceHooks(
    hookName: keyof IServicePlugin,
    tenantId: string,
    ...args: any[]
  ): Promise<any> {
    const plugins = this.getPluginsByLayer<IServicePlugin>(PluginLayer.SERVICE, tenantId);
    let result = args[args.length - 1];
    
    for (const plugin of plugins) {
      try {
        const hook = plugin[hookName] as Function;
        if (hook && typeof hook === 'function') {
          const hookResult = await hook.apply(plugin, args);
          if (hookResult !== undefined) {
            result = hookResult;
            args[args.length - 1] = result;
          }
        }
      } catch (error) {
        this.logger.error(`Plugin hook execution failed: ${plugin.id}.${hookName}`, error);
      }
    }
    
    return result;
  }

  /**
   * Execute plugin hooks for core utilities layer
   */
  async executeCoreUtilitiesHooks(
    hookName: keyof ICoreUtilitiesPlugin,
    tenantId: string,
    ...args: any[]
  ): Promise<void> {
    const plugins = this.getPluginsByLayer<ICoreUtilitiesPlugin>(PluginLayer.CORE_UTILITIES, tenantId);
    
    for (const plugin of plugins) {
      try {
        const hook = plugin[hookName] as Function;
        if (hook && typeof hook === 'function') {
          await hook.apply(plugin, args);
        }
      } catch (error) {
        this.logger.error(`Plugin hook execution failed: ${plugin.id}.${hookName}`, error);
      }
    }
  }

  /**
   * Get plugin information
   */
  getPluginInfo(pluginId: string, tenantId: string): PluginMetadata | null {
    return this.metadata.get(`${tenantId}:${pluginId}`) || null;
  }

  /**
   * List all plugins for a tenant
   */
  listPlugins(tenantId: string): PluginMetadata[] {
    const plugins: PluginMetadata[] = [];
    
    this.metadata.forEach((metadata, key) => {
      if (key.startsWith(`${tenantId}:`)) {
        plugins.push(metadata);
      }
    });
    
    return plugins;
  }

  // Private methods
  private async loadPluginMetadata(): Promise<void> {
    // Implementation to load plugin metadata from storage
    // This would typically read from a database or file system
  }

  private async loadEnabledPlugins(): Promise<void> {
    for (const [key, metadata] of this.metadata.entries()) {
      if (metadata.isEnabled) {
        await this.loadPlugin(metadata);
      }
    }
  }

  private async loadPlugin(metadata: PluginMetadata): Promise<void> {
    // Implementation to load and initialize a plugin
    // This would dynamically import the plugin module and initialize it
  }

  private async loadPluginModule(pluginPath: string): Promise<any> {
    // Dynamic import of plugin module
    const module = await import(pluginPath);
    return module.default || module;
  }

  private validatePluginInterface(plugin: IPlugin): void {
    const requiredMethods = ['initialize', 'destroy'];
    const requiredProperties = ['id', 'name', 'version', 'layer'];
    
    for (const method of requiredMethods) {
      if (typeof plugin[method] !== 'function') {
        throw new Error(`Plugin must implement ${method} method`);
      }
    }
    
    for (const property of requiredProperties) {
      if (!plugin[property]) {
        throw new Error(`Plugin must have ${property} property`);
      }
    }
  }

  private async checkDependencies(dependencies: string[], tenantId: string): Promise<void> {
    for (const dep of dependencies) {
      const depKey = `${tenantId}:${dep}`;
      if (!this.loadedPlugins.has(depKey)) {
        throw new Error(`Missing dependency: ${dep}`);
      }
    }
  }

  private async registerPlugin(
    plugin: IPlugin, 
    tenantId: string, 
    configuration?: Record<string, any>
  ): Promise<void> {
    const pluginKey = `${tenantId}:${plugin.id}`;
    
    // Store plugin instance
    this.loadedPlugins.set(pluginKey, plugin);
    
    // Register in appropriate layer registry
    this.registerInLayer(plugin, pluginKey);
    
    // Create and store metadata
    const metadata: PluginMetadata = {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      layer: plugin.layer,
      dependencies: plugin.dependencies,
      permissions: [], // Would be populated based on plugin requirements
      installDate: new Date(),
      lastUpdated: new Date(),
      isEnabled: true,
      tenantId
    };
    
    this.metadata.set(pluginKey, metadata);
    await this.savePluginMetadata(metadata);
  }

  private registerInLayer(plugin: IPlugin, pluginKey: string): void {
    switch (plugin.layer) {
      case PluginLayer.TEST:
        this.registry.testPlugins.set(pluginKey, plugin as ITestPlugin);
        break;
      case PluginLayer.BUSINESS:
        this.registry.businessPlugins.set(pluginKey, plugin as IBusinessPlugin);
        break;
      case PluginLayer.SERVICE:
        this.registry.servicePlugins.set(pluginKey, plugin as IServicePlugin);
        break;
      case PluginLayer.CORE_UTILITIES:
        this.registry.coreUtilitiesPlugins.set(pluginKey, plugin as ICoreUtilitiesPlugin);
        break;
    }
  }

  private unregisterFromLayer(plugin: IPlugin): void {
    // Remove from appropriate layer registry
    const registries = [
      this.registry.testPlugins,
      this.registry.businessPlugins,
      this.registry.servicePlugins,
      this.registry.coreUtilitiesPlugins
    ];
    
    registries.forEach(registry => {
      registry.forEach((p, key) => {
        if (p.id === plugin.id) {
          registry.delete(key);
        }
      });
    });
  }

  private async unregisterPlugin(pluginId: string, tenantId: string): Promise<void> {
    const pluginKey = `${tenantId}:${pluginId}`;
    
    this.loadedPlugins.delete(pluginKey);
    this.metadata.delete(pluginKey);
    
    // Remove from storage
    await this.deletePluginMetadata(pluginKey);
  }

  private updateDependencyGraph(plugin: IPlugin): void {
    this.dependencyGraph.set(plugin.id, plugin.dependencies);
  }

  private removeDependencyNode(pluginId: string, tenantId: string): void {
    this.dependencyGraph.delete(pluginId);
  }

  private findDependentPlugins(pluginId: string, tenantId: string): string[] {
    const dependents: string[] = [];
    
    this.dependencyGraph.forEach((deps, id) => {
      if (deps.includes(pluginId)) {
        dependents.push(id);
      }
    });
    
    return dependents;
  }

  private async validateDependencies(): Promise<void> {
    // Topological sort to validate dependency order
    // Implementation would check for circular dependencies
  }

  private async savePluginMetadata(metadata: PluginMetadata): Promise<void> {
    // Implementation to save plugin metadata to storage
  }

  private async deletePluginMetadata(pluginKey: string): Promise<void> {
    // Implementation to delete plugin metadata from storage
  }
}

// Type definitions for plugin contexts
export interface TestContext {
  testId: string;
  testName: string;
  tenantId: string;
  projectId: string;
  metadata: Record<string, any>;
}

export interface TestResult {
  testId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: Error;
  screenshots?: string[];
  logs?: string[];
}

export interface SuiteContext {
  suiteId: string;
  suiteName: string;
  tenantId: string;
  projectId: string;
  testCount: number;
}

export interface BusinessAction {
  actionId: string;
  actionType: string;
  parameters: Record<string, any>;
  tenantId: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Workflow {
  workflowId: string;
  steps: BusinessAction[];
  tenantId: string;
}

export interface WorkflowResult {
  workflowId: string;
  stepResults: any[];
  status: 'completed' | 'failed' | 'partial';
}

export interface ExecutionRequest {
  requestId: string;
  tenantId: string;
  projectId: string;
  tests: string[];
  configuration: Record<string, any>;
}

export interface ExecutionResult {
  requestId: string;
  results: TestResult[];
  metrics: ExecutionMetrics;
  status: 'completed' | 'failed' | 'cancelled';
}

export interface ExecutionMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  storage: number;
}

export interface LogEvent {
  level: string;
  message: string;
  timestamp: Date;
  tenantId: string;
  metadata: Record<string, any>;
}

export interface StorageOperation {
  operation: 'read' | 'write' | 'delete';
  path: string;
  tenantId: string;
  data?: any;
}