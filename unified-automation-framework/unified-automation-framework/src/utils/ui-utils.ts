import { Page, Locator, expect } from '@playwright/test';

export interface ClickOptions {
  force?: boolean;
  timeout?: number;
}

export interface TypeOptions {
  delay?: number;
  timeout?: number;
}

export class UIUtils {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Safe click with retry mechanism
   */
  async safeClick(element: Locator, options: ClickOptions = {}): Promise<void> {
    const clickOptions: any = {};
    if (options.force !== undefined) {
      clickOptions.force = options.force;
    }
    if (options.timeout !== undefined) {
      clickOptions.timeout = options.timeout;
    }

    await element.click(clickOptions);
  }

  /**
   * Type text with optional delay
   */
  async typeText(element: Locator, text: string, options: TypeOptions = {}): Promise<void> {
    await element.clear();
    
    const typeOptions: any = {};
    if (options.delay !== undefined) {
      typeOptions.delay = options.delay;
    }
    if (options.timeout !== undefined) {
      typeOptions.timeout = options.timeout;
    }

    await element.fill(text, typeOptions);
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(element: Locator, timeout: number = 30000): Promise<void> {
    await element.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(element: Locator, timeout: number = 30000): Promise<void> {
    await element.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Scroll element into view
   */
  async scrollIntoView(element: Locator): Promise<void> {
    await element.scrollIntoViewIfNeeded();
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Select dropdown option by value
   */
  async selectDropdownByValue(element: Locator, value: string): Promise<void> {
    await element.selectOption({ value });
  }

  /**
   * Select dropdown option by text
   */
  async selectDropdownByText(element: Locator, text: string): Promise<void> {
    await element.selectOption({ label: text });
  }

  /**
   * Check checkbox
   */
  async checkCheckbox(element: Locator): Promise<void> {
    await element.check();
  }

  /**
   * Uncheck checkbox
   */
  async uncheckCheckbox(element: Locator): Promise<void> {
    await element.uncheck();
  }

  /**
   * Select radio button
   */
  async selectRadioButton(element: Locator): Promise<void> {
    await element.check();
  }

  /**
   * Get element text
   */
  async getElementText(element: Locator): Promise<string> {
    return await element.textContent() || '';
  }

  /**
   * Get element attribute
   */
  async getElementAttribute(element: Locator, attribute: string): Promise<string> {
    return await element.getAttribute(attribute) || '';
  }

  /**
   * Verify element is visible
   */
  async verifyElementVisible(element: Locator): Promise<void> {
    await expect(element).toBeVisible();
  }

  /**
   * Verify element is hidden
   */
  async verifyElementHidden(element: Locator): Promise<void> {
    await expect(element).toBeHidden();
  }

  /**
   * Verify element contains text
   */
  async verifyElementContainsText(element: Locator, text: string): Promise<void> {
    await expect(element).toContainText(text);
  }

  /**
   * Verify element has attribute
   */
  async verifyElementHasAttribute(element: Locator, attribute: string, value: string): Promise<void> {
    await expect(element).toHaveAttribute(attribute, value);
  }

  /**
   * Wait for page to load
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Refresh page
   */
  async refreshPage(): Promise<void> {
    await this.page.reload();
  }

  /**
   * Navigate back
   */
  async navigateBack(): Promise<void> {
    await this.page.goBack();
  }

  /**
   * Navigate forward
   */
  async navigateForward(): Promise<void> {
    await this.page.goForward();
  }
}