"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const ui_utils_1 = require("../../src/utils/ui-utils");
const browser_utils_1 = require("../../src/utils/browser-utils");
const data_utils_1 = require("../../src/utils/data-utils");
const assertion_utils_1 = require("../../src/utils/assertion-utils");
test_1.test.describe('UI Automation Utilities Demo', () => {
    let uiUtils;
    let browserUtils;
    let assertionUtils;
    test_1.test.beforeEach(async ({ page, context, browser }) => {
        uiUtils = new ui_utils_1.EnhancedUIUtils(page, context);
        browserUtils = new browser_utils_1.BrowserUtils(page, context, browser);
        assertionUtils = new assertion_utils_1.AssertionUtils(page);
    });
    (0, test_1.test)('Demo: Screenshot Utilities', async ({ page }) => {
        await page.goto('https://demowebshop.tricentis.com/register');
        // Take full page screenshot
        await uiUtils.takeScreenshot('demo-full-page');
        // Take element screenshot
        const registerForm = page.locator('.page-body');
        await uiUtils.takeElementScreenshot(registerForm, 'demo-register-form');
        // Take comparison screenshots
        const { before, after } = await uiUtils.takeComparisonScreenshots('demo-comparison');
        console.log(`Comparison screenshots: ${before}, ${after}`);
    });
    (0, test_1.test)('Demo: Dropdown Utilities', async ({ page }) => {
        // Navigate to a page with dropdowns (using a demo site)
        await page.goto('https://the-internet.herokuapp.com/dropdown');
        const dropdown = page.locator('#dropdown');
        // Get all dropdown options
        const options = await uiUtils.getDropdownOptions(dropdown);
        console.log('Available options:', options);
        // Select by text
        await uiUtils.selectDropdownByText(dropdown, 'Option 1');
        // Verify selection
        const selectedOption = await uiUtils.getSelectedDropdownOption(dropdown);
        (0, test_1.expect)(selectedOption).toBe('Option 1');
        // Select by value
        await uiUtils.selectDropdownByValue(dropdown, '2');
        // Select by index
        await uiUtils.selectDropdownByIndex(dropdown, 0);
    });
    (0, test_1.test)('Demo: Checkbox and Radio Button Utilities', async ({ page }) => {
        await page.goto('https://demowebshop.tricentis.com/register');
        // Radio button operations
        const maleRadio = page.locator('#gender-male');
        const femaleRadio = page.locator('#gender-female');
        await uiUtils.selectRadioButton(maleRadio);
        await assertionUtils.assertCheckboxChecked(maleRadio, 'Male radio button should be selected');
        await uiUtils.selectRadioButton(femaleRadio);
        await assertionUtils.assertCheckboxChecked(femaleRadio, 'Female radio button should be selected');
        // Get selected radio button value
        const selectedGender = await uiUtils.getSelectedRadioButtonValue('Gender');
        console.log('Selected gender:', selectedGender);
    });
    (0, test_1.test)('Demo: Input Field Utilities', async ({ page }) => {
        await page.goto('https://demowebshop.tricentis.com/register');
        const firstNameInput = page.locator('#FirstName');
        const lastNameInput = page.locator('#LastName');
        const emailInput = page.locator('#Email');
        // Type text with different methods
        await uiUtils.typeText(firstNameInput, 'John');
        await uiUtils.typeTextSlowly(lastNameInput, 'Doe', 50);
        // Generate and use test data
        const testEmail = data_utils_1.DataUtils.generateRandomEmail('testdomain.com');
        await uiUtils.typeText(emailInput, testEmail);
        // Verify input values
        const firstName = await uiUtils.getInputValue(firstNameInput);
        const lastName = await uiUtils.getInputValue(lastNameInput);
        const email = await uiUtils.getInputValue(emailInput);
        await assertionUtils.assertInputValue(firstNameInput, 'John');
        await assertionUtils.assertInputValue(lastNameInput, 'Doe');
        await assertionUtils.assertInputValue(emailInput, testEmail);
        // Clear inputs
        await uiUtils.clearInput(firstNameInput);
        await assertionUtils.assertInputEmpty(firstNameInput);
    });
    (0, test_1.test)('Demo: Window Management Utilities', async ({ page, context }) => {
        await page.goto('https://the-internet.herokuapp.com/windows');
        // Handle new window opening
        const newWindowLink = page.locator('a[href="/windows/new"]');
        const newPage = await uiUtils.handleNewWindow(async () => {
            await newWindowLink.click();
        });
        // Verify new window
        await (0, test_1.expect)(newPage).toHaveTitle(/New Window/);
        // Get all window titles
        const windowTitles = await uiUtils.getAllWindowTitles();
        console.log('Open windows:', windowTitles);
        // Switch between windows
        await uiUtils.switchToWindowByTitle('The Internet');
        // Close additional windows
        await uiUtils.closeAllWindowsExceptMain();
    });
    (0, test_1.test)('Demo: Wait Utilities', async ({ page }) => {
        await page.goto('https://the-internet.herokuapp.com/dynamic_loading/1');
        const startButton = page.locator('#start button');
        const loadingIndicator = page.locator('#loading');
        const finishText = page.locator('#finish h4');
        // Click start button
        await startButton.click();
        // Wait for loading indicator to appear
        await uiUtils.waitForVisible(loadingIndicator);
        // Wait for loading to complete
        await uiUtils.waitForHidden(loadingIndicator, 10000);
        // Wait for finish text to appear
        await uiUtils.waitForText(finishText, 'Hello World!');
        // Verify final state
        await assertionUtils.assertElementVisible(finishText);
        await assertionUtils.assertElementText(finishText, 'Hello World!');
    });
    (0, test_1.test)('Demo: Scroll and Hover Utilities', async ({ page }) => {
        await page.goto('https://the-internet.herokuapp.com/hovers');
        // Scroll to bottom and back to top
        await uiUtils.scrollToBottom();
        await uiUtils.scrollToTop();
        // Hover over elements
        const firstAvatar = page.locator('.figure').first();
        await uiUtils.scrollToElement(firstAvatar);
        await uiUtils.hoverElement(firstAvatar);
        // Verify hover effect
        const userInfo = page.locator('.figcaption').first();
        await assertionUtils.assertElementVisible(userInfo);
        // Hover and click
        const viewProfileLink = userInfo.locator('a');
        await uiUtils.hoverAndClick(viewProfileLink);
    });
    (0, test_1.test)('Demo: Browser Utilities', async ({ page, context, browser }) => {
        // Set different viewport sizes
        await browserUtils.setViewport(1920, 1080);
        await page.goto('https://demowebshop.tricentis.com');
        // Emulate mobile device
        await browserUtils.emulateDevice('iPhone 12');
        await page.reload();
        // Set geolocation
        await browserUtils.setGeolocation(40.7128, -74.0060); // New York
        // Grant permissions
        await browserUtils.grantPermissions(['geolocation', 'notifications']);
        // Get browser information
        const browserInfo = await browserUtils.getBrowserInfo();
        console.log('Browser info:', browserInfo);
        // Check browser support
        const supportsLocalStorage = await browserUtils.checkBrowserSupport('localStorage');
        console.log('Supports localStorage:', supportsLocalStorage);
        // Enable console logging
        await browserUtils.enableConsoleLogging();
        // Set cookies
        await browserUtils.setCookies([
            {
                name: 'test-cookie',
                value: 'test-value',
                domain: '.demowebshop.tricentis.com'
            }
        ]);
        // Get cookies
        const cookies = await browserUtils.getCookies();
        console.log('Cookies:', cookies);
    });
    (0, test_1.test)('Demo: Data Utilities', async () => {
        // Generate test data
        const randomString = data_utils_1.DataUtils.generateRandomString(10);
        const randomNumber = data_utils_1.DataUtils.generateRandomNumber(1, 100);
        const randomEmail = data_utils_1.DataUtils.generateRandomEmail();
        const randomPhone = data_utils_1.DataUtils.generateRandomPhoneNumber();
        const randomDate = data_utils_1.DataUtils.generateRandomDate();
        const randomAddress = data_utils_1.DataUtils.generateRandomAddress();
        const randomPerson = data_utils_1.DataUtils.generateRandomPerson();
        console.log('Generated test data:', {
            randomString,
            randomNumber,
            randomEmail,
            randomPhone,
            randomDate,
            randomAddress,
            randomPerson
        });
        // Validate data
        const isValidEmail = data_utils_1.DataUtils.validateEmail(randomEmail);
        const isValidPhone = data_utils_1.DataUtils.validatePhoneNumber(randomPhone);
        const isValidDate = data_utils_1.DataUtils.validateDate(randomDate.toISOString());
        (0, test_1.expect)(isValidEmail).toBe(true);
        (0, test_1.expect)(isValidPhone).toBe(true);
        (0, test_1.expect)(isValidDate).toBe(true);
        // Data transformation
        const testData = [
            { name: 'John', age: 30, city: 'New York' },
            { name: 'Jane', age: 25, city: 'Los Angeles' }
        ];
        const csvData = data_utils_1.DataUtils.jsonToCSV(testData);
        const backToJson = data_utils_1.DataUtils.csvToJSON(csvData);
        console.log('CSV data:', csvData);
        console.log('Back to JSON:', backToJson);
        // Generate unique ID
        const uniqueId = data_utils_1.DataUtils.generateUniqueId('TEST');
        console.log('Unique ID:', uniqueId);
    });
    (0, test_1.test)('Demo: Advanced Assertions', async ({ page }) => {
        await page.goto('https://demowebshop.tricentis.com/register');
        const firstNameInput = page.locator('#FirstName');
        const registerButton = page.locator('#register-button');
        const pageTitle = 'Demo Web Shop. Register';
        // Basic assertions
        await assertionUtils.assertElementVisible(firstNameInput, 5000, 'First name input should be visible');
        await assertionUtils.assertElementEnabled(registerButton, 'Register button should be enabled');
        await assertionUtils.assertPageTitle(pageTitle, 'Page should have correct title');
        // Type text and verify
        await uiUtils.typeText(firstNameInput, 'John');
        await assertionUtils.assertInputValue(firstNameInput, 'John', 'First name should be John');
        // CSS and attribute assertions
        await assertionUtils.assertElementAttribute(firstNameInput, 'type', 'text');
        await assertionUtils.assertElementHasAttribute(firstNameInput, 'id');
        // Custom assertion
        await assertionUtils.assertCustomCondition(async () => {
            const value = await firstNameInput.inputValue();
            return value.length > 0;
        }, 'First name input should not be empty', 'First name input has content');
        // Soft assertions
        const softAssertionResults = await assertionUtils.executeSoftAssertions([
            {
                assertion: async () => await assertionUtils.assertElementVisible(firstNameInput),
                description: 'First name input visibility'
            },
            {
                assertion: async () => await assertionUtils.assertElementEnabled(registerButton),
                description: 'Register button enabled state'
            },
            {
                assertion: async () => await assertionUtils.assertPageTitle('Wrong Title'),
                description: 'Page title (this should fail)'
            }
        ]);
        console.log('Soft assertion results:', softAssertionResults);
        (0, test_1.expect)(softAssertionResults.passed).toBe(2);
        (0, test_1.expect)(softAssertionResults.failed).toBe(1);
    });
    (0, test_1.test)('Demo: Alert Handling', async ({ page }) => {
        await page.goto('https://the-internet.herokuapp.com/javascript_alerts');
        // Handle JavaScript alert
        const alertButton = page.locator('button[onclick="jsAlert()"]');
        const alertPromise = uiUtils.handleAlert(true);
        await alertButton.click();
        const alertMessage = await alertPromise;
        console.log('Alert message:', alertMessage);
        // Handle JavaScript confirm
        const confirmButton = page.locator('button[onclick="jsConfirm()"]');
        const confirmPromise = uiUtils.handleConfirm(true);
        await confirmButton.click();
        const confirmMessage = await confirmPromise;
        console.log('Confirm message:', confirmMessage);
        // Handle JavaScript prompt
        const promptButton = page.locator('button[onclick="jsPrompt()"]');
        const promptPromise = uiUtils.handlePrompt('Test Input');
        await promptButton.click();
        const promptMessage = await promptPromise;
        console.log('Prompt message:', promptMessage);
    });
    (0, test_1.test)('Demo: Table Operations', async ({ page }) => {
        await page.goto('https://the-internet.herokuapp.com/tables');
        const table = page.locator('#table1');
        // Get table data
        const tableData = await uiUtils.getTableData(table);
        console.log('Table data:', tableData);
        // Click specific table cell
        await uiUtils.clickTableCell(table, 1, 0); // Click first data row, first column
        // Verify table structure
        await assertionUtils.assertElementCount(table.locator('tr'), 5); // Header + 4 data rows
        await assertionUtils.assertElementCount(table.locator('th'), 6); // 6 columns
    });
    (0, test_1.test)('Demo: Keyboard Utilities', async ({ page }) => {
        await page.goto('https://demowebshop.tricentis.com/register');
        const firstNameInput = page.locator('#FirstName');
        // Focus on input and type using keyboard
        await firstNameInput.click();
        await uiUtils.typeWithKeyboard('John');
        // Use keyboard shortcuts
        await uiUtils.pressKeyCombination(['Control', 'a']); // Select all
        await uiUtils.pressKey('Delete'); // Delete selected text
        // Type new text
        await uiUtils.typeWithKeyboard('Jane');
        // Navigate using Tab
        await uiUtils.pressKey('Tab');
        // Verify focus moved to next field
        const lastNameInput = page.locator('#LastName');
        await assertionUtils.assertElementFocused(lastNameInput);
    });
    (0, test_1.test)('Demo: Performance Monitoring', async ({ page, context, browser }) => {
        const browserUtils = new browser_utils_1.BrowserUtils(page, context, browser);
        // Measure page load performance
        await page.goto('https://demowebshop.tricentis.com');
        const performanceMetrics = await browserUtils.measurePageLoadPerformance();
        console.log('Performance metrics:', performanceMetrics);
        // Monitor memory usage
        const memoryUsage = await browserUtils.getMemoryUsage();
        console.log('Memory usage:', memoryUsage);
        // Trace performance of an action
        const result = await browserUtils.tracePerformance('registration-form-fill', async () => {
            await page.goto('https://demowebshop.tricentis.com/register');
            await uiUtils.typeText(page.locator('#FirstName'), 'John');
            await uiUtils.typeText(page.locator('#LastName'), 'Doe');
            await uiUtils.typeText(page.locator('#Email'), 'john.doe@test.com');
            return 'Form filled successfully';
        });
        console.log('Trace result:', result);
    });
    (0, test_1.test)('Demo: Error Handling and Retry', async ({ page }) => {
        await page.goto('https://demowebshop.tricentis.com/register');
        // Demonstrate retry mechanism with assertions
        const firstNameInput = page.locator('#FirstName');
        await assertionUtils.assertWithRetry(async () => {
            await assertionUtils.assertElementVisible(firstNameInput);
        }, 3, // max retries
        1000 // retry delay
        );
        // Demonstrate data utility retry
        const result = await data_utils_1.DataUtils.retryWithBackoff(async () => {
            // Simulate an operation that might fail
            const randomSuccess = Math.random() > 0.3; // 70% success rate
            if (!randomSuccess) {
                throw new Error('Simulated failure');
            }
            return 'Operation successful';
        }, 3, // max retries
        500 // base delay
        );
        console.log('Retry result:', result);
    });
});
//# sourceMappingURL=ui-utilities-demo.spec.js.map