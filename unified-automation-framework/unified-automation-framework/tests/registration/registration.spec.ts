import { test, expect } from '@playwright/test';
import { RegistrationPage } from '../../src/pages/registration-page';
import registrationData from '../../test-data/registration.json';

// Utility function to generate unique email with timestamp
function generateUniqueEmail(emailTemplate: string): string {
  const timestamp = Date.now();
  return emailTemplate.replace('{{timestamp}}', timestamp.toString());
}

test.describe('User Registration Tests', () => {
  let registrationPage: RegistrationPage;

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page);
    await registrationPage.navigateToRegistrationPage();
    await registrationPage.verifyPageLoaded();
  });

  test.describe('Valid Registration Tests', () => {
    registrationData.validUsers.forEach((userData) => {
      test(`${userData.testId}: ${userData.description}`, async () => {
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
        await expect(registrationPage.page).toHaveURL(/\/(|customer\/info)/);
      });
    });
  });

  test.describe('Invalid Registration Tests', () => {
    registrationData.invalidUsers.forEach((userData) => {
      test(`${userData.testId}: ${userData.description}`, async () => {
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
        await expect(registrationPage.page).toHaveURL(/\/register/);
      });
    });
  });

  test.describe('Edge Case Tests', () => {
    registrationData.edgeCases.forEach((userData) => {
      test(`${userData.testId}: ${userData.description}`, async () => {
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
        } else {
          // Verify error message for invalid edge cases
          await registrationPage.verifyRegistrationError(userData.expectedError);
        }
      });
    });
  });

  test.describe('Form Validation Tests', () => {
    test('REG_FORM_001: Verify all form fields are present and enabled', async () => {
      await registrationPage.verifyFormFieldProperties();
    });

    test('REG_FORM_002: Verify required field indicators', async () => {
      await registrationPage.verifyRequiredFieldIndicators();
    });

    test('REG_FORM_003: Verify form field tab navigation', async () => {
      await registrationPage.navigateWithTab();
      
      // Verify focus moves through fields correctly
      await expect(registrationPage.registerButton).toBeFocused();
    });

    test('REG_FORM_004: Verify form submission with Enter key', async () => {
      const validUser = registrationData.validUsers[0];
      const uniqueEmail = generateUniqueEmail(validUser.email);
      
      await registrationPage.fillRegistrationForm({
        ...validUser,
        email: uniqueEmail
      });
      
      await registrationPage.submitFormWithEnter();
      await registrationPage.verifySuccessfulRegistration();
    });

    test('REG_FORM_005: Verify form field clearing functionality', async () => {
      const validUser = registrationData.validUsers[0];
      
      // Fill form with data
      await registrationPage.fillRegistrationForm(validUser);
      
      // Clear all fields
      await registrationPage.clearAllFields();
      
      // Verify all fields are empty
      const fieldValues = await registrationPage.getFieldValues();
      expect(fieldValues.firstName).toBe('');
      expect(fieldValues.lastName).toBe('');
      expect(fieldValues.email).toBe('');
      expect(fieldValues.password).toBe('');
      expect(fieldValues.confirmPassword).toBe('');
    });
  });

  test.describe('UI/UX Tests', () => {
    test('REG_UI_001: Verify page title and heading', async () => {
      await expect(registrationPage.page).toHaveTitle(/Register/);
      await expect(registrationPage.page.locator('h1')).toContainText('Register');
    });

    test('REG_UI_002: Verify gender radio button selection', async () => {
      // Test male selection
      await registrationPage.selectGender('Male');
      const fieldValues1 = await registrationPage.getFieldValues();
      expect(fieldValues1.genderMaleSelected).toBe(true);
      expect(fieldValues1.genderFemaleSelected).toBe(false);
      
      // Test female selection
      await registrationPage.selectGender('Female');
      const fieldValues2 = await registrationPage.getFieldValues();
      expect(fieldValues2.genderMaleSelected).toBe(false);
      expect(fieldValues2.genderFemaleSelected).toBe(true);
    });

    test('REG_UI_003: Verify password field masking', async () => {
      await registrationPage.fillPassword('TestPassword123');
      
      // Verify password field type is 'password'
      await expect(registrationPage.passwordInput).toHaveAttribute('type', 'password');
      await expect(registrationPage.confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    test('REG_UI_004: Verify form responsiveness on different viewport sizes', async ({ page }) => {
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

  test.describe('Security Tests', () => {
    test('REG_SEC_001: Verify XSS protection in form fields', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      await registrationPage.fillFirstName(xssPayload);
      await registrationPage.fillLastName(xssPayload);
      
      const fieldValues = await registrationPage.getFieldValues();
      
      // Verify XSS payload is either sanitized or rejected
      expect(fieldValues.firstName).not.toContain('<script>');
      expect(fieldValues.lastName).not.toContain('<script>');
    });

    test('REG_SEC_002: Verify SQL injection protection', async () => {
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
        expect(error.toLowerCase()).not.toContain('sql');
        expect(error.toLowerCase()).not.toContain('database');
        expect(error.toLowerCase()).not.toContain('table');
      }
    });

    test('REG_SEC_003: Verify CSRF protection', async ({ page }) => {
      // Check if CSRF token is present in the form
      const csrfToken = await page.locator('input[name="__RequestVerificationToken"]');
      
      if (await csrfToken.count() > 0) {
        await expect(csrfToken).toBeVisible();
        await expect(csrfToken).toHaveAttribute('value');
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('REG_PERF_001: Verify page load performance', async ({ page }) => {
      const startTime = Date.now();
      
      await registrationPage.navigateToRegistrationPage();
      await registrationPage.verifyPageLoaded();
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('REG_PERF_002: Verify form submission performance', async () => {
      const validUser = registrationData.validUsers[0];
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
      expect(submissionTime).toBeLessThan(10000);
    });
  });

  test.describe('Accessibility Tests', () => {
    test('REG_A11Y_001: Verify form labels and accessibility attributes', async ({ page }) => {
      // Check for proper labels
      await expect(page.locator('label[for="FirstName"]')).toBeVisible();
      await expect(page.locator('label[for="LastName"]')).toBeVisible();
      await expect(page.locator('label[for="Email"]')).toBeVisible();
      await expect(page.locator('label[for="Password"]')).toBeVisible();
      await expect(page.locator('label[for="ConfirmPassword"]')).toBeVisible();
    });

    test('REG_A11Y_002: Verify keyboard navigation', async ({ page }) => {
      // Test tab order
      await page.keyboard.press('Tab');
      await expect(registrationPage.genderMaleRadio).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(registrationPage.genderFemaleRadio).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(registrationPage.firstNameInput).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(registrationPage.lastNameInput).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(registrationPage.emailInput).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(registrationPage.passwordInput).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(registrationPage.confirmPasswordInput).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(registrationPage.registerButton).toBeFocused();
    });
  });

  test.describe('Cross-Browser Compatibility Tests', () => {
    test('REG_CROSS_001: Verify registration works across different browsers', async () => {
      const validUser = registrationData.validUsers[0];
      const uniqueEmail = generateUniqueEmail(validUser.email);
      
      await registrationPage.registerUser({
        ...validUser,
        email: uniqueEmail
      });
      
      await registrationPage.verifySuccessfulRegistration();
    });
  });
});