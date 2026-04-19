# UI Automation Utilities

## Overview

Comprehensive collection of UI automation utilities for Playwright with TypeScript, providing reusable methods for common UI interactions, browser management, data handling, and advanced assertions.

## 📁 **Utility Classes**

| Class | Purpose | Key Features |
|-------|---------|--------------|
| **UIAutomationUtils** | Core UI interactions | Screenshots, dropdowns, checkboxes, inputs, windows, waits |
| **BrowserUtils** | Browser management | Viewport, device emulation, network control, performance |
| **DataUtils** | Data operations | Generation, validation, transformation, file operations |
| **AssertionUtils** | Enhanced assertions | Element states, text content, attributes, soft assertions |

## 🚀 **Quick Start**

### Installation
```typescript
import { UIAutomationUtils } from '../src/utils/ui-automation-utils';
import { BrowserUtils } from '../src/utils/browser-utils';
import { DataUtils } from '../src/utils/data-utils';
import { AssertionUtils } from '../src/utils/assertion-utils';
```

### Basic Usage
```typescript
test('Example usage', async ({ page, context, browser }) => {
  const uiUtils = new UIAutomationUtils(page, context);
  const browserUtils = new BrowserUtils(page, context, browser);
  const assertionUtils = new AssertionUtils(page);
  
  // Take screenshot
  await uiUtils.takeScreenshot('test-screenshot');
  
  // Select dropdown
  await uiUtils.selectDropdownByText(dropdown, 'Option 1');
  
  // Assert element visibility
  await assertionUtils.assertElementVisible(element);
});
```

## 📸 **UIAutomationUtils**

### Screenshot Utilities
```typescript
// Full page screenshot
await uiUtils.takeScreenshot('page-screenshot');

// Element screenshot
await uiUtils.takeElementScreenshot(locator, 'element-screenshot');

// Failure screenshot
await uiUtils.takeFailureScreenshot('test-name');

// Comparison screenshots
const { before, after } = await uiUtils.takeComparisonScreenshots('comparison');
```

### Dropdown Operations
```typescript
// Select by text
await uiUtils.selectDropdownByText(dropdown, 'Option Text');

// Select by value
await uiUtils.selectDropdownByValue(dropdown, 'option-value');

// Select by index
await uiUtils.selectDropdownByIndex(dropdown, 2);

// Get all options
const options = await uiUtils.getDropdownOptions(dropdown);

// Get selected option
const selected = await uiUtils.getSelectedDropdownOption(dropdown);

// Custom dropdown (non-select elements)
await uiUtils.selectCustomDropdown(trigger, option);
```

### Checkbox Operations
```typescript
// Check checkbox
await uiUtils.checkCheckbox(checkbox);

// Uncheck checkbox
await uiUtils.uncheckCheckbox(checkbox);

// Toggle checkbox
await uiUtils.toggleCheckbox(checkbox);

// Check state
const isChecked = await uiUtils.isCheckboxChecked(checkbox);

// Check multiple checkboxes
await uiUtils.checkMultipleCheckboxes([checkbox1, checkbox2, checkbox3]);
```

### Radio Button Operations
```typescript
// Select radio button
await uiUtils.selectRadioButton(radioButton);

// Select by value
await uiUtils.selectRadioButtonByValue('gender', 'male');

// Get selected value
const selected = await uiUtils.getSelectedRadioButtonValue('gender');

// Get all options
const options = await uiUtils.getRadioButtonOptions('gender');
```

### Input Field Operations
```typescript
// Type text
await uiUtils.typeText(input, 'Hello World');

// Type slowly with delay
await uiUtils.typeTextSlowly(input, 'Slow typing', 100);

// Clear input
await uiUtils.clearInput(input);

// Get input value
const value = await uiUtils.getInputValue(input);

// Upload file
await uiUtils.uploadFile(fileInput, '/path/to/file.pdf');

// Upload multiple files
await uiUtils.uploadMultipleFiles(fileInput, ['/file1.pdf', '/file2.jpg']);
```

### Window Management
```typescript
// Handle new window
const newPage = await uiUtils.handleNewWindow(async () => {
  await linkElement.click();
});

// Switch to window by title
const page = await uiUtils.switchToWindowByTitle('Window Title');

// Switch to window by URL
const page = await uiUtils.switchToWindowByURL('example.com');

// Close all windows except main
await uiUtils.closeAllWindowsExceptMain();

// Get all window titles
const titles = await uiUtils.getAllWindowTitles();
```

### Wait Operations
```typescript
// Wait for element to be visible
await uiUtils.waitForVisible(element, 30000);

// Wait for element to be hidden
await uiUtils.waitForHidden(element, 30000);

// Wait for specific text
await uiUtils.waitForText(element, 'Expected Text');

// Wait for page load
await uiUtils.waitForPageLoad();

// Wait for URL
await uiUtils.waitForURL('**/dashboard');
```

### Scroll Operations
```typescript
// Scroll to element
await uiUtils.scrollToElement(element);

// Scroll to top
await uiUtils.scrollToTop();

// Scroll to bottom
await uiUtils.scrollToBottom();

// Scroll by amount
await uiUtils.scrollBy(0, 500);
```

### Hover Operations
```typescript
// Hover over element
await uiUtils.hoverElement(element);

// Hover and click
await uiUtils.hoverAndClick(element);
```

### Drag and Drop
```typescript
// Drag and drop
await uiUtils.dragAndDrop(sourceElement, targetElement);
```

### Alert Handling
```typescript
// Handle alert
const message = await uiUtils.handleAlert(true); // accept

// Handle confirm
const message = await uiUtils.handleConfirm(false); // dismiss

// Handle prompt
const message = await uiUtils.handlePrompt('Input text');
```

### Table Operations
```typescript
// Get table data
const tableData = await uiUtils.getTableData(table);

// Click table cell
await uiUtils.clickTableCell(table, rowIndex, columnIndex);
```

### Keyboard Operations
```typescript
// Press single key
await uiUtils.pressKey('Enter');

// Press key combination
await uiUtils.pressKeyCombination(['Control', 'c']);

// Type with keyboard
await uiUtils.typeWithKeyboard('Hello World');
```

### Validation Operations
```typescript
// Verify element visible
await uiUtils.verifyElementVisible(element);

// Verify element text
await uiUtils.verifyElementText(element, 'Expected Text');

// Verify element attribute
await uiUtils.verifyElementAttribute(element, 'class', 'active');

// Verify page title
await uiUtils.verifyPageTitle('Expected Title');

// Verify page URL
await uiUtils.verifyPageURL('**/expected-path');
```

## 🌐 **BrowserUtils**

### Browser Control
```typescript
// Create new context
const newContext = await browserUtils.createNewContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Custom User Agent',
  locale: 'en-US'
});

// Set viewport
await browserUtils.setViewport(1920, 1080);

// Emulate device
await browserUtils.emulateDevice('iPhone 12');

// Set geolocation
await browserUtils.setGeolocation(40.7128, -74.0060);

// Grant permissions
await browserUtils.grantPermissions(['geolocation', 'camera']);
```

### Network Control
```typescript
// Block URLs
await browserUtils.blockURLs(['analytics.com', 'ads.com']);

// Mock API response
await browserUtils.mockAPIResponse('**/api/users', {
  status: 200,
  body: { users: [] }
});

// Simulate network conditions
await browserUtils.simulateNetworkConditions({
  offline: false,
  downloadThroughput: 1000000,
  uploadThroughput: 500000,
  latency: 100
});

// Enable network logging
await browserUtils.enableNetworkLogging();
```

### Performance Monitoring
```typescript
// Measure page load performance
const metrics = await browserUtils.measurePageLoadPerformance();

// Get memory usage
const memory = await browserUtils.getMemoryUsage();

// Trace performance
const result = await browserUtils.tracePerformance('action-name', async () => {
  // Perform actions to trace
  return 'result';
});
```

### Cookie Management
```typescript
// Set cookies
await browserUtils.setCookies([
  { name: 'session', value: 'abc123', domain: '.example.com' }
]);

// Get cookies
const cookies = await browserUtils.getCookies();

// Clear all cookies
await browserUtils.clearCookies();

// Clear specific cookies
await browserUtils.clearSpecificCookies(['session', 'preferences']);
```

### Storage Management
```typescript
// Local storage
await browserUtils.setLocalStorageItem('key', 'value');
const value = await browserUtils.getLocalStorageItem('key');
await browserUtils.clearLocalStorage();

// Session storage
await browserUtils.setSessionStorageItem('key', 'value');
const value = await browserUtils.getSessionStorageItem('key');
await browserUtils.clearSessionStorage();
```

### Browser Information
```typescript
// Get browser info
const info = await browserUtils.getBrowserInfo();

// Check browser support
const supportsWebGL = await browserUtils.checkBrowserSupport('webgl');
```

### Debugging
```typescript
// Enable console logging
await browserUtils.enableConsoleLogging();

// Execute JavaScript
const result = await browserUtils.executeScript('return document.title');

// Add custom CSS
await browserUtils.addCustomCSS('.highlight { background: yellow; }');

// Add custom script
await browserUtils.addCustomScript('console.log("Custom script loaded");');
```

## 📊 **DataUtils**

### File Operations
```typescript
// JSON operations
const data = DataUtils.readJSONFile<UserData>('data/users.json');
DataUtils.writeJSONFile('output/results.json', results);

// CSV operations
const csvData = DataUtils.readCSVFile('data/users.csv');
DataUtils.writeCSVFile('output/results.csv', csvData);

// Text operations
const content = DataUtils.readTextFile('data/template.txt');
DataUtils.writeTextFile('output/report.txt', content);
```

### Data Generation
```typescript
// Random data
const randomString = DataUtils.generateRandomString(10);
const randomNumber = DataUtils.generateRandomNumber(1, 100);
const randomEmail = DataUtils.generateRandomEmail('testdomain.com');
const randomPhone = DataUtils.generateRandomPhoneNumber('###-###-####');
const randomDate = DataUtils.generateRandomDate();

// Complex data
const address = DataUtils.generateRandomAddress();
const person = DataUtils.generateRandomPerson();
```

### Data Validation
```typescript
// Validation methods
const isValidEmail = DataUtils.validateEmail('test@example.com');
const isValidPhone = DataUtils.validatePhoneNumber('+1-555-123-4567');
const isValidDate = DataUtils.validateDate('2023-12-25');
const isValidURL = DataUtils.validateURL('https://example.com');
const isValidCard = DataUtils.validateCreditCard('4111111111111111');
```

### Data Transformation
```typescript
// Convert between formats
const jsonData = DataUtils.csvToJSON(csvData, headers);
const csvData = DataUtils.jsonToCSV(jsonData);

// Object operations
const flattened = DataUtils.flattenObject(nestedObject);
const cloned = DataUtils.deepClone(originalObject);
const merged = DataUtils.mergeObjects(target, source1, source2);

// Array operations
const filtered = DataUtils.filterByProperty(array, 'status', 'active');
const sorted = DataUtils.sortByProperty(array, 'name', true);
const grouped = DataUtils.groupByProperty(array, 'category');
```

### Encryption/Encoding
```typescript
// Encoding
const encoded = DataUtils.base64Encode('Hello World');
const decoded = DataUtils.base64Decode(encoded);

// Hashing
const hash = DataUtils.generateHash('password', 'sha256');
```

### Utility Functions
```typescript
// Unique ID generation
const id = DataUtils.generateUniqueId('TEST');

// Date formatting
const formatted = DataUtils.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');

// Wait utility
await DataUtils.wait(2000);

// Retry with backoff
const result = await DataUtils.retryWithBackoff(
  async () => performOperation(),
  3, // max retries
  1000 // base delay
);
```

## ✅ **AssertionUtils**

### Element Visibility
```typescript
// Visibility assertions
await assertionUtils.assertElementVisible(element, 10000, 'Element should be visible');
await assertionUtils.assertElementHidden(element, 10000, 'Element should be hidden');
await assertionUtils.assertElementExists(element, 'Element should exist');
await assertionUtils.assertElementNotExists(element, 'Element should not exist');
```

### Element State
```typescript
// State assertions
await assertionUtils.assertElementEnabled(button, 'Button should be enabled');
await assertionUtils.assertElementDisabled(button, 'Button should be disabled');
await assertionUtils.assertElementFocused(input, 'Input should be focused');
await assertionUtils.assertCheckboxChecked(checkbox, 'Checkbox should be checked');
await assertionUtils.assertCheckboxUnchecked(checkbox, 'Checkbox should be unchecked');
```

### Text Content
```typescript
// Text assertions
await assertionUtils.assertElementText(element, 'Expected Text', 'Text should match');
await assertionUtils.assertElementContainsText(element, 'Partial Text', 'Should contain text');
await assertionUtils.assertElementNotContainsText(element, 'Unwanted Text', 'Should not contain text');
await assertionUtils.assertElementTextMatches(element, /pattern/i, 'Text should match pattern');
```

### Attributes and CSS
```typescript
// Attribute assertions
await assertionUtils.assertElementAttribute(element, 'class', 'active', 'Should have active class');
await assertionUtils.assertElementHasAttribute(element, 'data-id', 'Should have data-id attribute');
await assertionUtils.assertElementNotHasAttribute(element, 'disabled', 'Should not be disabled');

// CSS assertions
await assertionUtils.assertElementCSS(element, 'color', 'rgb(255, 0, 0)', 'Should be red');
await assertionUtils.assertElementHasClass(element, 'highlight', 'Should have highlight class');
await assertionUtils.assertElementNotHasClass(element, 'hidden', 'Should not have hidden class');
```

### Input Values
```typescript
// Input assertions
await assertionUtils.assertInputValue(input, 'Expected Value', 'Input should have expected value');
await assertionUtils.assertInputEmpty(input, 'Input should be empty');
await assertionUtils.assertInputNotEmpty(input, 'Input should not be empty');
```

### Element Count
```typescript
// Count assertions
await assertionUtils.assertElementCount(elements, 5, 'Should have 5 elements');
await assertionUtils.assertMinElementCount(elements, 3, 'Should have at least 3 elements');
await assertionUtils.assertMaxElementCount(elements, 10, 'Should have at most 10 elements');
```

### Page Assertions
```typescript
// Page assertions
await assertionUtils.assertPageTitle('Expected Title', 'Page should have correct title');
await assertionUtils.assertPageURL(/\/dashboard/, 'Should be on dashboard page');
await assertionUtils.assertPageContainsText('Welcome', 'Page should contain welcome text');
```

### Dropdown Assertions
```typescript
// Dropdown assertions
await assertionUtils.assertDropdownSelection(dropdown, 'Selected Option', 'Should have correct selection');
await assertionUtils.assertDropdownOptions(dropdown, ['Option 1', 'Option 2'], 'Should have expected options');
```

### Custom and Soft Assertions
```typescript
// Custom assertion
await assertionUtils.assertCustomCondition(
  async () => {
    const count = await elements.count();
    return count > 0;
  },
  'Should have at least one element',
  'Elements found successfully'
);

// Assertion with retry
await assertionUtils.assertWithRetry(
  async () => await assertionUtils.assertElementVisible(element),
  3, // max retries
  1000 // retry delay
);

// Soft assertions
const results = await assertionUtils.executeSoftAssertions([
  {
    assertion: async () => await assertionUtils.assertElementVisible(element1),
    description: 'Element 1 visibility'
  },
  {
    assertion: async () => await assertionUtils.assertElementVisible(element2),
    description: 'Element 2 visibility'
  }
]);

console.log(`Passed: ${results.passed}, Failed: ${results.failed}`);
```

## 🎯 **Best Practices**

### Error Handling
```typescript
try {
  await uiUtils.takeScreenshot('test-screenshot');
  await assertionUtils.assertElementVisible(element);
} catch (error) {
  await uiUtils.takeFailureScreenshot('test-failure');
  throw error;
}
```

### Performance Optimization
```typescript
// Use efficient waits
await uiUtils.waitForVisible(element, 10000);

// Batch operations when possible
await uiUtils.checkMultipleCheckboxes([cb1, cb2, cb3]);

// Use soft assertions for non-critical checks
const results = await assertionUtils.executeSoftAssertions(assertions);
```

### Data Management
```typescript
// Generate test data dynamically
const testUser = DataUtils.generateRandomPerson();
await uiUtils.typeText(nameInput, testUser.fullName);
await uiUtils.typeText(emailInput, testUser.email);

// Validate data before use
if (DataUtils.validateEmail(email)) {
  await uiUtils.typeText(emailInput, email);
}
```

### Browser Management
```typescript
// Set up browser for testing
await browserUtils.setViewport(1920, 1080);
await browserUtils.enableConsoleLogging();
await browserUtils.grantPermissions(['notifications']);

// Clean up after tests
await browserUtils.clearCookies();
await browserUtils.clearLocalStorage();
```

## 📋 **Configuration**

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Package Dependencies
```json
{
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "@faker-js/faker": "^8.2.0"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "@types/node": "^20.8.0"
  }
}
```

## 🔧 **Troubleshooting**

### Common Issues

#### Element Not Found
```typescript
// Use explicit waits
await uiUtils.waitForVisible(element, 30000);

// Use retry mechanism
await assertionUtils.assertWithRetry(
  async () => await assertionUtils.assertElementVisible(element),
  3,
  2000
);
```

#### Timing Issues
```typescript
// Wait for page load
await uiUtils.waitForPageLoad();

// Wait for network idle
await page.waitForLoadState('networkidle');

// Use custom waits
await uiUtils.waitForText(element, 'Expected Text', 15000);
```

#### Browser Compatibility
```typescript
// Check browser support
const supportsFeature = await browserUtils.checkBrowserSupport('localStorage');
if (supportsFeature) {
  await browserUtils.setLocalStorageItem('key', 'value');
}
```

### Debug Mode
```typescript
// Enable detailed logging
await browserUtils.enableConsoleLogging();

// Take screenshots for debugging
await uiUtils.takeScreenshot('debug-screenshot');

// Use trace for performance analysis
await browserUtils.tracePerformance('debug-action', async () => {
  // Actions to debug
});
```

## 📚 **Examples**

See `tests/examples/ui-utilities-demo.spec.ts` for comprehensive examples of all utility functions in action.

## 🤝 **Contributing**

1. Add new utility methods following the existing patterns
2. Include comprehensive JSDoc comments
3. Add corresponding test examples
4. Update this documentation
5. Ensure TypeScript type safety

## 📄 **License**

This utility collection is part of the Enterprise Test Automation Framework and follows the same licensing terms.

---

**These utilities provide a comprehensive foundation for enterprise-grade UI automation testing with Playwright, offering reusable, maintainable, and scalable solutions for common testing scenarios.**