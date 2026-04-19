"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const registration_page_1 = require("../../src/pages/registration-page");
const registration_json_1 = __importDefault(require("../../test-data/registration.json"));
// Utility function to generate unique email with timestamp
function generateUniqueEmail(emailTemplate) {
    const timestamp = Date.now();
    return emailTemplate.replace('{{timestamp}}', timestamp.toString());
}
test_1.test.describe('User Registration Tests', () => {
    let registrationPage;
    test_1.test.beforeEach(async ({ page }) => {
        registrationPage = new registration_page_1.RegistrationPage(page);
        await registrationPage.navigateToRegistrationPage();
        await registrationPage.verifyPageLoaded();
    });
    test_1.test.describe('Valid Registration Tests', () => {
        registration_json_1.default.validUsers.forEach((userData) => {
            (0, test_1.test)(`${userData.testId}: ${userData.description}`, async () => {
                // Generate unique email for this test run
                const uniqueEmail = generateUniqueEmail(userData.email);
                const testData = {
                    ...userData,
                    email: uniqueEmail
                };
                // Perform registration
                await registrationPage.registerUser(testData);
                // Verify successful registration
                await registrationPage.verifySuccessfulRegistration();
                // Continue to complete the registration flow
                await registrationPage.clickContinueButton();
                // Verify redirect to home page or account page
                await (0, test_1.expect)(registrationPage.page).toHaveURL(/\/(|customer\/info)/);
            });
        });
    });
    test_1.test.describe('Invalid Registration Tests', () => {
        registration_json_1.default.invalidUsers.forEach((userData) => {
            (0, test_1.test)(`${userData.testId}: ${userData.description}`, async () => {
                let testData = { ...userData };
                // Generate unique email if template is provided
                if (userData.email.includes('{{timestamp}}')) {
                    testData.email = generateUniqueEmail(userData.email);
                }
                // Perform registration attempt
                await registrationPage.registerUser(testData);
                // Verify error message appears
                await registrationPage.verifyRegistrationError(userData.expectedError);
                // Verify user remains on registration page
                await (0, test_1.expect)(registrationPage.page).toHaveURL(/\/register/);
            });
        });
    });
    test_1.test.describe('Edge Case Tests', () => {
        registration_json_1.default.edgeCases.forEach((userData) => {
            (0, test_1.test)(`${userData.testId}: ${userData.description}`, async () => {
                let testData = { ...userData };
                // Generate unique email if template is provided
                if (userData.email.includes('{{timestamp}}')) {
                    testData.email = generateUniqueEmail(userData.email);
                }
                // Perform registration attempt
                await registrationPage.registerUser(testData);
                if (userData.expectedResult === 'success') {
                    // Verify successful registration for valid edge cases
                    await registrationPage.verifySuccessfulRegistration();
                }
                else {
                    // Verify error message for invalid edge cases
                    await registrationPage.verifyRegistrationError(userData.expectedError);
                }
            });
        });
    });
    test_1.test.describe('Form Validation Tests', () => {
        (0, test_1.test)('REG_FORM_001: Verify all form fields are present and enabled', async () => {
            await registrationPage.verifyFormFieldProperties();
        });
        (0, test_1.test)('REG_FORM_002: Verify required field indicators', async () => {
            await registrationPage.verifyRequiredFieldIndicators();
        });
        (0, test_1.test)('REG_FORM_003: Verify form field tab navigation', async () => {
            await registrationPage.navigateWithTab();
            // Verify focus moves through fields correctly
            await (0, test_1.expect)(registrationPage.registerButton).toBeFocused();
        });
        (0, test_1.test)('REG_FORM_004: Verify form submission with Enter key', async () => {
            const validUser = registration_json_1.default.validUsers[0];
            const uniqueEmail = generateUniqueEmail(validUser.email);
            await registrationPage.fillRegistrationForm({
                ...validUser,
                email: uniqueEmail
            });
            await registrationPage.submitFormWithEnter();
            await registrationPage.verifySuccessfulRegistration();
        });
        (0, test_1.test)('REG_FORM_005: Verify form field clearing functionality', async () => {
            const validUser = registration_json_1.default.validUsers[0];
            // Fill form with data
            await registrationPage.fillRegistrationForm(validUser);
            // Clear all fields
            await registrationPage.clearAllFields();
            // Verify all fields are empty
            const fieldValues = await registrationPage.getFieldValues();
            (0, test_1.expect)(fieldValues.firstName).toBe('');
            (0, test_1.expect)(fieldValues.lastName).toBe('');
            (0, test_1.expect)(fieldValues.email).toBe('');
            (0, test_1.expect)(fieldValues.password).toBe('');
            (0, test_1.expect)(fieldValues.confirmPassword).toBe('');
        });
    });
    test_1.test.describe('UI/UX Tests', () => {
        (0, test_1.test)('REG_UI_001: Verify page title and heading', async () => {
            await (0, test_1.expect)(registrationPage.page).toHaveTitle(/Register/);
            await (0, test_1.expect)(registrationPage.page.locator('h1')).toContainText('Register');
        });
        (0, test_1.test)('REG_UI_002: Verify gender radio button selection', async () => {
            // Test male selection
            await registrationPage.selectGender('Male');
            const fieldValues1 = await registrationPage.getFieldValues();
            (0, test_1.expect)(fieldValues1.genderMaleSelected).toBe(true);
            (0, test_1.expect)(fieldValues1.genderFemaleSelected).toBe(false);
            // Test female selection
            await registrationPage.selectGender('Female');
            const fieldValues2 = await registrationPage.getFieldValues();
            (0, test_1.expect)(fieldValues2.genderMaleSelected).toBe(false);
            (0, test_1.expect)(fieldValues2.genderFemaleSelected).toBe(true);
        });
        (0, test_1.test)('REG_UI_003: Verify password field masking', async () => {
            await registrationPage.fillPassword('TestPassword123');
            // Verify password field type is 'password'
            await (0, test_1.expect)(registrationPage.passwordInput).toHaveAttribute('type', 'password');
            await (0, test_1.expect)(registrationPage.confirmPasswordInput).toHaveAttribute('type', 'password');
        });
        (0, test_1.test)('REG_UI_004: Verify form responsiveness on different viewport sizes', async ({ page }) => {
            // Test mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await registrationPage.verifyFormFieldProperties();
            // Test tablet viewport
            await page.setViewportSize({ width: 768, height: 1024 });
            await registrationPage.verifyFormFieldProperties();
            // Test desktop viewport
            await page.setViewportSize({ width: 1920, height: 1080 });
            await registrationPage.verifyFormFieldProperties();
        });
    });
    test_1.test.describe('Security Tests', () => {
        (0, test_1.test)('REG_SEC_001: Verify XSS protection in form fields', async () => {
            const xssPayload = '<script>alert("XSS")</script>';
            await registrationPage.fillFirstName(xssPayload);
            await registrationPage.fillLastName(xssPayload);
            const fieldValues = await registrationPage.getFieldValues();
            // Verify XSS payload is either sanitized or rejected
            (0, test_1.expect)(fieldValues.firstName).not.toContain('<script>');
            (0, test_1.expect)(fieldValues.lastName).not.toContain('<script>');
        });
        (0, test_1.test)('REG_SEC_002: Verify SQL injection protection', async () => {
            const sqlPayload = "'; DROP TABLE users; --";
            const uniqueEmail = generateUniqueEmail('sql.test.{{timestamp}}@test.com');
            await registrationPage.registerUser({
                gender: 'Male',
                firstName: sqlPayload,
                lastName: 'Test',
                email: uniqueEmail,
                password: 'Test@123456',
                confirmPassword: 'Test@123456'
            });
            // Should either succeed with sanitized input or show validation error
            // The application should not crash or show database errors
            const errorMessages = await registrationPage.getAllErrorMessages();
            // If there are errors, they should be validation errors, not database errors
            for (const error of errorMessages) {
                (0, test_1.expect)(error.toLowerCase()).not.toContain('sql');
                (0, test_1.expect)(error.toLowerCase()).not.toContain('database');
                (0, test_1.expect)(error.toLowerCase()).not.toContain('table');
            }
        });
        (0, test_1.test)('REG_SEC_003: Verify CSRF protection', async ({ page }) => {
            // Check if CSRF token is present in the form
            const csrfToken = await page.locator('input[name="__RequestVerificationToken"]');
            if (await csrfToken.count() > 0) {
                await (0, test_1.expect)(csrfToken).toBeVisible();
                await (0, test_1.expect)(csrfToken).toHaveAttribute('value');
            }
        });
    });
    test_1.test.describe('Performance Tests', () => {
        (0, test_1.test)('REG_PERF_001: Verify page load performance', async ({ page }) => {
            const startTime = Date.now();
            await registrationPage.navigateToRegistrationPage();
            await registrationPage.verifyPageLoaded();
            const loadTime = Date.now() - startTime;
            // Page should load within 5 seconds
            (0, test_1.expect)(loadTime).toBeLessThan(5000);
        });
        (0, test_1.test)('REG_PERF_002: Verify form submission performance', async () => {
            const validUser = registration_json_1.default.validUsers[0];
            const uniqueEmail = generateUniqueEmail(validUser.email);
            await registrationPage.fillRegistrationForm({
                ...validUser,
                email: uniqueEmail
            });
            const startTime = Date.now();
            await registrationPage.clickRegisterButton();
            await registrationPage.verifySuccessfulRegistration();
            const submissionTime = Date.now() - startTime;
            // Form submission should complete within 10 seconds
            (0, test_1.expect)(submissionTime).toBeLessThan(10000);
        });
    });
    test_1.test.describe('Accessibility Tests', () => {
        (0, test_1.test)('REG_A11Y_001: Verify form labels and accessibility attributes', async ({ page }) => {
            // Check for proper labels
            await (0, test_1.expect)(page.locator('label[for="FirstName"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('label[for="LastName"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('label[for="Email"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('label[for="Password"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('label[for="ConfirmPassword"]')).toBeVisible();
        });
        (0, test_1.test)('REG_A11Y_002: Verify keyboard navigation', async ({ page }) => {
            // Test tab order
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(registrationPage.genderMaleRadio).toBeFocused();
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(registrationPage.genderFemaleRadio).toBeFocused();
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(registrationPage.firstNameInput).toBeFocused();
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(registrationPage.lastNameInput).toBeFocused();
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(registrationPage.emailInput).toBeFocused();
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(registrationPage.passwordInput).toBeFocused();
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(registrationPage.confirmPasswordInput).toBeFocused();
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(registrationPage.registerButton).toBeFocused();
        });
    });
    test_1.test.describe('Cross-Browser Compatibility Tests', () => {
        (0, test_1.test)('REG_CROSS_001: Verify registration works across different browsers', async () => {
            const validUser = registration_json_1.default.validUsers[0];
            const uniqueEmail = generateUniqueEmail(validUser.email);
            await registrationPage.registerUser({
                ...validUser,
                email: uniqueEmail
            });
            await registrationPage.verifySuccessfulRegistration();
        });
    });
});
//# sourceMappingURL=registration.spec.js.map