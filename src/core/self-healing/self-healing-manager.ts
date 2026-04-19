import { Page, Locator } from '@playwright/test';
import { ConfigManager } from '../config/config-manager';
import { Logger } from '../utils/logger';
import * as cv from 'opencv4nodejs';
import Jimp from 'jimp';
import { OpenAI } from 'openai';

export interface SelfHealingConfig {
  enabled: boolean;
  strategies: string[];
  confidence: number;
  maxRetries: number;
  aiEnabled: boolean;
  visualRecognition: boolean;
}

export interface ElementHealingResult {
  success: boolean;
  originalSelector: string;
  healedSelector?: string;
  strategy: string;
  confidence: number;
  attempts: number;
}

export interface VisualMatch {
  element: any;
  confidence: number;
  coordinates: { x: number; y: number; width: number; height: number };
}

export class SelfHealingManager {
  private openai?: OpenAI;
  private healingHistory: Map<string, ElementHealingResult> = new Map();
  private selectorCache: Map<string, string> = new Map();

  constructor(
    private config: ConfigManager,
    private logger: Logger
  ) {
    this.initializeAI();
  }

  async initialize(): Promise<void> {
    const healingConfig = this.getHealingConfig();
    
    if (healingConfig.aiEnabled && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    
    this.logger.info('Self-healing manager initialized', {
      aiEnabled: !!this.openai,
      strategies: healingConfig.strategies,
    });
  }

  /**
   * Enhance a page with self-healing capabilities
   */
  async enhancePage(page: Page): Promise<void> {
    // Override the locator method to add self-healing
    const originalLocator = page.locator.bind(page);
    
    page.locator = (selector: string, options?: any) => {
      const locator = originalLocator(selector, options);
      return this.enhanceLocator(page, locator, selector);
    };

    // Add error recovery handlers
    page.on('pageerror', async (error) => {
      await this.handlePageError(page, error);
    });

    // Monitor for DOM changes that might affect selectors
    await page.addInitScript(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            // Store DOM change information for healing analysis
            (window as any).__domChanges = (window as any).__domChanges || [];
            (window as any).__domChanges.push({
              type: mutation.type,
              target: mutation.target,
              timestamp: Date.now(),
            });
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
      });
    });
  }

  /**
   * Enhance a locator with self-healing capabilities
   */
  private enhanceLocator(page: Page, locator: Locator, originalSelector: string): Locator {
    const healingConfig = this.getHealingConfig();
    
    if (!healingConfig.enabled) {
      return locator;
    }

    // Create a proxy to intercept locator methods
    return new Proxy(locator, {
      get: (target, prop) => {
        const originalMethod = target[prop as keyof Locator];
        
        if (typeof originalMethod === 'function' && this.isInteractiveMethod(prop as string)) {
          return async (...args: any[]) => {
            try {
              // Try the original selector first
              return await originalMethod.apply(target, args);
            } catch (error) {
              this.logger.warn(`Element interaction failed with selector: ${originalSelector}`, error);
              
              // Attempt self-healing
              const healingResult = await this.healElement(page, originalSelector);
              
              if (healingResult.success && healingResult.healedSelector) {
                this.logger.info(`Self-healing successful: ${originalSelector} -> ${healingResult.healedSelector}`);
                
                // Try with the healed selector
                const healedLocator = page.locator(healingResult.healedSelector);
                return await healedLocator[prop as keyof Locator](...args);
              } else {
                this.logger.error(`Self-healing failed for selector: ${originalSelector}`);
                throw error;
              }
            }
          };
        }
        
        return originalMethod;
      },
    });
  }

  /**
   * Attempt to heal a broken element selector
   */
  async healElement(page: Page, originalSelector: string): Promise<ElementHealingResult> {
    const healingConfig = this.getHealingConfig();
    const cacheKey = `${page.url()}_${originalSelector}`;
    
    // Check cache first
    if (this.selectorCache.has(cacheKey)) {
      const cachedSelector = this.selectorCache.get(cacheKey)!;
      const isValid = await this.validateSelector(page, cachedSelector);
      
      if (isValid) {
        return {
          success: true,
          originalSelector,
          healedSelector: cachedSelector,
          strategy: 'cache',
          confidence: 1.0,
          attempts: 1,
        };
      } else {
        this.selectorCache.delete(cacheKey);
      }
    }

    let attempts = 0;
    const maxRetries = healingConfig.maxRetries;

    for (const strategy of healingConfig.strategies) {
      if (attempts >= maxRetries) break;
      
      attempts++;
      
      try {
        const result = await this.applyHealingStrategy(page, originalSelector, strategy);
        
        if (result.success) {
          // Cache the successful selector
          if (result.healedSelector) {
            this.selectorCache.set(cacheKey, result.healedSelector);
          }
          
          // Store in healing history
          this.healingHistory.set(originalSelector, result);
          
          return result;
        }
      } catch (error) {
        this.logger.warn(`Healing strategy '${strategy}' failed:`, error);
      }
    }

    // If all strategies failed, try AI-powered healing
    if (healingConfig.aiEnabled && this.openai) {
      try {
        const aiResult = await this.aiPoweredHealing(page, originalSelector);
        if (aiResult.success) {
          return aiResult;
        }
      } catch (error) {
        this.logger.warn('AI-powered healing failed:', error);
      }
    }

    return {
      success: false,
      originalSelector,
      strategy: 'none',
      confidence: 0,
      attempts,
    };
  }

  /**
   * Apply a specific healing strategy
   */
  private async applyHealingStrategy(
    page: Page, 
    originalSelector: string, 
    strategy: string
  ): Promise<ElementHealingResult> {
    switch (strategy) {
      case 'fuzzy-text':
        return await this.fuzzyTextMatching(page, originalSelector);
      
      case 'attribute-fallback':
        return await this.attributeFallback(page, originalSelector);
      
      case 'xpath-alternatives':
        return await this.xpathAlternatives(page, originalSelector);
      
      case 'css-alternatives':
        return await this.cssAlternatives(page, originalSelector);
      
      case 'visual-recognition':
        return await this.visualRecognition(page, originalSelector);
      
      case 'dom-analysis':
        return await this.domAnalysis(page, originalSelector);
      
      case 'sibling-navigation':
        return await this.siblingNavigation(page, originalSelector);
      
      default:
        throw new Error(`Unknown healing strategy: ${strategy}`);
    }
  }

  /**
   * Fuzzy text matching strategy
   */
  private async fuzzyTextMatching(page: Page, originalSelector: string): Promise<ElementHealingResult> {
    // Extract text content from the original selector if it contains text
    const textMatch = originalSelector.match(/text\s*=\s*['"]([^'"]+)['"]/);
    if (!textMatch) {
      return { success: false, originalSelector, strategy: 'fuzzy-text', confidence: 0, attempts: 1 };
    }

    const originalText = textMatch[1];
    const elements = await page.$$('*');
    
    for (const element of elements) {
      const textContent = await element.textContent();
      if (textContent && this.fuzzyMatch(originalText, textContent)) {
        const selector = await this.generateSelectorForElement(page, element);
        if (selector) {
          return {
            success: true,
            originalSelector,
            healedSelector: selector,
            strategy: 'fuzzy-text',
            confidence: 0.8,
            attempts: 1,
          };
        }
      }
    }

    return { success: false, originalSelector, strategy: 'fuzzy-text', confidence: 0, attempts: 1 };
  }

  /**
   * Attribute fallback strategy
   */
  private async attributeFallback(page: Page, originalSelector: string): Promise<ElementHealingResult> {
    // Parse the original selector to extract attributes
    const attributes = this.extractAttributes(originalSelector);
    
    if (attributes.length === 0) {
      return { success: false, originalSelector, strategy: 'attribute-fallback', confidence: 0, attempts: 1 };
    }

    // Try different combinations of attributes
    for (let i = attributes.length - 1; i >= 0; i--) {
      const fallbackSelector = this.buildSelectorFromAttributes(attributes.slice(0, i + 1));
      
      if (await this.validateSelector(page, fallbackSelector)) {
        return {
          success: true,
          originalSelector,
          healedSelector: fallbackSelector,
          strategy: 'attribute-fallback',
          confidence: 0.7,
          attempts: 1,
        };
      }
    }

    return { success: false, originalSelector, strategy: 'attribute-fallback', confidence: 0, attempts: 1 };
  }

  /**
   * XPath alternatives strategy
   */
  private async xpathAlternatives(page: Page, originalSelector: string): Promise<ElementHealingResult> {
    if (!originalSelector.startsWith('//') && !originalSelector.startsWith('xpath=')) {
      return { success: false, originalSelector, strategy: 'xpath-alternatives', confidence: 0, attempts: 1 };
    }

    const alternatives = this.generateXPathAlternatives(originalSelector);
    
    for (const alternative of alternatives) {
      if (await this.validateSelector(page, alternative)) {
        return {
          success: true,
          originalSelector,
          healedSelector: alternative,
          strategy: 'xpath-alternatives',
          confidence: 0.6,
          attempts: 1,
        };
      }
    }

    return { success: false, originalSelector, strategy: 'xpath-alternatives', confidence: 0, attempts: 1 };
  }

  /**
   * CSS alternatives strategy
   */
  private async cssAlternatives(page: Page, originalSelector: string): Promise<ElementHealingResult> {
    const alternatives = this.generateCSSAlternatives(originalSelector);
    
    for (const alternative of alternatives) {
      if (await this.validateSelector(page, alternative)) {
        return {
          success: true,
          originalSelector,
          healedSelector: alternative,
          strategy: 'css-alternatives',
          confidence: 0.6,
          attempts: 1,
        };
      }
    }

    return { success: false, originalSelector, strategy: 'css-alternatives', confidence: 0, attempts: 1 };
  }

  /**
   * Visual recognition strategy using computer vision
   */
  private async visualRecognition(page: Page, originalSelector: string): Promise<ElementHealingResult> {
    try {
      // Take a screenshot of the current page
      const screenshot = await page.screenshot({ fullPage: true });
      
      // Load reference image if available
      const referenceImagePath = this.getReferenceImagePath(originalSelector);
      if (!referenceImagePath) {
        return { success: false, originalSelector, strategy: 'visual-recognition', confidence: 0, attempts: 1 };
      }

      // Perform template matching
      const matches = await this.findVisualMatches(screenshot, referenceImagePath);
      
      if (matches.length > 0) {
        const bestMatch = matches[0];
        
        // Find element at the matched coordinates
        const element = await page.elementHandle(`xpath=//*[contains(@style, 'position') or contains(@class, '') or contains(@id, '')]`);
        if (element) {
          const selector = await this.generateSelectorForElement(page, element);
          if (selector) {
            return {
              success: true,
              originalSelector,
              healedSelector: selector,
              strategy: 'visual-recognition',
              confidence: bestMatch.confidence,
              attempts: 1,
            };
          }
        }
      }
    } catch (error) {
      this.logger.warn('Visual recognition failed:', error);
    }

    return { success: false, originalSelector, strategy: 'visual-recognition', confidence: 0, attempts: 1 };
  }

  /**
   * DOM analysis strategy
   */
  private async domAnalysis(page: Page, originalSelector: string): Promise<ElementHealingResult> {
    // Analyze DOM changes that might have affected the selector
    const domChanges = await page.evaluate(() => (window as any).__domChanges || []);
    
    // Use DOM changes to predict new selector
    const predictedSelector = await this.predictSelectorFromDOMChanges(originalSelector, domChanges);
    
    if (predictedSelector && await this.validateSelector(page, predictedSelector)) {
      return {
        success: true,
        originalSelector,
        healedSelector: predictedSelector,
        strategy: 'dom-analysis',
        confidence: 0.7,
        attempts: 1,
      };
    }

    return { success: false, originalSelector, strategy: 'dom-analysis', confidence: 0, attempts: 1 };
  }

  /**
   * Sibling navigation strategy
   */
  private async siblingNavigation(page: Page, originalSelector: string): Promise<ElementHealingResult> {
    // Try to find the element by navigating from siblings
    const siblingSelectors = this.generateSiblingSelectors(originalSelector);
    
    for (const siblingSelector of siblingSelectors) {
      if (await this.validateSelector(page, siblingSelector)) {
        return {
          success: true,
          originalSelector,
          healedSelector: siblingSelector,
          strategy: 'sibling-navigation',
          confidence: 0.5,
          attempts: 1,
        };
      }
    }

    return { success: false, originalSelector, strategy: 'sibling-navigation', confidence: 0, attempts: 1 };
  }

  /**
   * AI-powered healing using OpenAI
   */
  private async aiPoweredHealing(page: Page, originalSelector: string): Promise<ElementHealingResult> {
    if (!this.openai) {
      return { success: false, originalSelector, strategy: 'ai-powered', confidence: 0, attempts: 1 };
    }

    try {
      // Get page HTML for context
      const html = await page.content();
      
      const prompt = `
        I have a broken CSS/XPath selector: "${originalSelector}"
        
        Here's the current HTML structure:
        ${html.substring(0, 5000)}...
        
        Please suggest 3 alternative selectors that might work for the same element.
        Consider:
        1. The element might have changed attributes
        2. The DOM structure might have changed
        3. New elements might have been added
        
        Return only the selectors, one per line.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3,
      });

      const suggestions = response.choices[0]?.message?.content?.split('\n').filter(s => s.trim()) || [];
      
      for (const suggestion of suggestions) {
        const cleanSelector = suggestion.trim().replace(/^[0-9]+\.\s*/, '');
        
        if (await this.validateSelector(page, cleanSelector)) {
          return {
            success: true,
            originalSelector,
            healedSelector: cleanSelector,
            strategy: 'ai-powered',
            confidence: 0.8,
            attempts: 1,
          };
        }
      }
    } catch (error) {
      this.logger.error('AI-powered healing error:', error);
    }

    return { success: false, originalSelector, strategy: 'ai-powered', confidence: 0, attempts: 1 };
  }

  /**
   * Handle page errors and attempt recovery
   */
  async handlePageError(page: Page, error: Error): Promise<void> {
    this.logger.warn('Page error detected, attempting recovery:', error.message);
    
    // Common recovery strategies
    try {
      // Wait for network to be idle
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      
      // Refresh the page if it's a critical error
      if (error.message.includes('Navigation') || error.message.includes('timeout')) {
        await page.reload({ waitUntil: 'networkidle' });
      }
    } catch (recoveryError) {
      this.logger.error('Page error recovery failed:', recoveryError);
    }
  }

  // Helper methods
  private initializeAI(): void {
    // Initialize AI components if needed
  }

  private getHealingConfig(): SelfHealingConfig {
    return this.config.get('selfHealing', {
      enabled: true,
      strategies: ['fuzzy-text', 'attribute-fallback', 'css-alternatives', 'xpath-alternatives'],
      confidence: 0.7,
      maxRetries: 3,
      aiEnabled: false,
      visualRecognition: false,
    });
  }

  private isInteractiveMethod(method: string): boolean {
    const interactiveMethods = ['click', 'fill', 'type', 'press', 'check', 'uncheck', 'selectOption', 'hover'];
    return interactiveMethods.includes(method);
  }

  private async validateSelector(page: Page, selector: string): Promise<boolean> {
    try {
      const element = await page.locator(selector).first();
      return await element.isVisible({ timeout: 1000 });
    } catch {
      return false;
    }
  }

  private fuzzyMatch(text1: string, text2: string, threshold: number = 0.8): boolean {
    const similarity = this.calculateSimilarity(text1.toLowerCase(), text2.toLowerCase());
    return similarity >= threshold;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private extractAttributes(selector: string): Array<{ name: string; value: string }> {
    // Implementation to extract attributes from selector
    return [];
  }

  private buildSelectorFromAttributes(attributes: Array<{ name: string; value: string }>): string {
    // Implementation to build selector from attributes
    return '';
  }

  private generateXPathAlternatives(xpath: string): string[] {
    // Implementation to generate XPath alternatives
    return [];
  }

  private generateCSSAlternatives(css: string): string[] {
    // Implementation to generate CSS alternatives
    return [];
  }

  private generateSiblingSelectors(selector: string): string[] {
    // Implementation to generate sibling selectors
    return [];
  }

  private async generateSelectorForElement(page: Page, element: any): Promise<string | null> {
    // Implementation to generate selector for element
    return null;
  }

  private getReferenceImagePath(selector: string): string | null {
    // Implementation to get reference image path
    return null;
  }

  private async findVisualMatches(screenshot: Buffer, referencePath: string): Promise<VisualMatch[]> {
    // Implementation for visual matching using OpenCV
    return [];
  }

  private async predictSelectorFromDOMChanges(selector: string, changes: any[]): Promise<string | null> {
    // Implementation to predict selector from DOM changes
    return null;
  }

  /**
   * Get healing statistics
   */
  getHealingStats(): {
    totalAttempts: number;
    successfulHeals: number;
    successRate: number;
    strategiesUsed: Record<string, number>;
  } {
    const results = Array.from(this.healingHistory.values());
    const totalAttempts = results.length;
    const successfulHeals = results.filter(r => r.success).length;
    const successRate = totalAttempts > 0 ? (successfulHeals / totalAttempts) * 100 : 0;
    
    const strategiesUsed: Record<string, number> = {};
    results.forEach(result => {
      strategiesUsed[result.strategy] = (strategiesUsed[result.strategy] || 0) + 1;
    });

    return {
      totalAttempts,
      successfulHeals,
      successRate: Math.round(successRate * 100) / 100,
      strategiesUsed,
    };
  }
}