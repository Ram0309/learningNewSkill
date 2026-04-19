import { Page, Locator, expect } from '@playwright/test';
import { envManager } from '../utils/environment-manager';

export class RegistrationPage {
  readonly page: Page;
  
  // Page elements
  readonly genderMaleRadio: Locator;
  readonly genderFemaleRadio: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly continueButton: Locator;
  
  // Error message locators
  readonly firstNameError: Locator;
  readonly lastNameError: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly confirmPasswordError: Locator;
  readonly generalError: Locator;
  
  // Success message locators
  readonly successMessage: Locator;
  readonly registrationCompletedMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Initialize locators
    this.genderMaleRadio = page.locator('#gender-male');
    this.genderFemaleRadio = page.locator('#gender-female');
    this.firstNameInput = page.locator('#FirstName');
    this.lastNameInput = page.locator('#LastName');
    this.emailInput = page.locator('#Email');
    this.passwordInput = page.locator('#Password');
    this.confirmPasswordInput = page.locator('#ConfirmPassword');
    this.registerButton = page.locator('#register-button');
    this.continueButton = page.locator('.button-1.register-continue-button');
    
    // Error message locators
    this.firstNameError = page.locator('span[data-valmsg-for="FirstName"]');
    this.lastNameError = page.locator('span[data-valmsg-for="LastName"]');
    this.emailError = page.locator('span[data-valmsg-for="Email"]');
    this.passwordError = page.locator('span[data-valmsg-for="Password"]');
    this.confirmPasswordError = page.locator('span[data-valmsg-for="ConfirmPassword"]');
    this.generalError = page.locator('.message-error');
    
    // Success message locators
    this.successMessage = page.locator('.result');
    this.registrationCompletedMessage = page.locator('text=Your registration completed');
  }

  /**
   * Navigate to the registration page using environment-specific URL
   */
  async navigateToRegistrationPage(): Promise<void> {
    const registrationFeature = envManager.getFeatureConfig('registration');
    
    if (!registrationFeature.enabled) {
      throw new Error(`Registration feature is disabled in ${envManager.getCurrentEnvironment()} environment`);
    }

    const registrationUrl = envManager.getFeatureUrl('registration');
    console.log(`🌍 Navigating to registration page: ${registrationUrl} (${envManager.getCurrentEnvironment()})`);
    
    await this.page.goto(registrationUrl);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select gender option
   * @param gender - 'Male' or 'Female'
   */
  async selectGender(gender: string): Promise<void> {
    if (gender.toLowerCase() === 'male') {
      await this.genderMaleRadio.check();
    } else if (gender.toLowerCase() === 'female') {
      await this.genderFemaleRadio.check();
    } else {
      throw new Error(`Invalid gender option: ${gender}. Use 'Male' or 'Female'`);
    }
  }

  /**
   * Fill the first name field
   * @param firstName - First name to enter
   */
  async fillFirstName(firstName: string): Promise<void> {
    await this.firstNameInput.clear();
    await this.firstNameInput.fill(firstName);
  }

  /**
   * Fill the last name field
   * @param lastName - Last name to enter
   */
  async fillLastName(lastName: string): Promise<void> {
    await this.lastNameInput.clear();
    await this.lastNameInput.fill(lastName);
  }

  /**
   * Fill the email field
   * @param email - Email address to enter
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.clear();
    await this.emailInput.fill(email);
  }

  /**
   * Fill the password field
   * @param password - Password to enter
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);
  }

  /**
   * Fill the confirm password field
   * @param confirmPassword - Confirm password to enter
   */
  async fillConfirmPassword(confirmPassword: string): Promise<void> {
    await this.confirmPasswordInput.clear();
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  /**
   * Click the register button
   */
  async clickRegisterButton(): Promise<void> {
    await this.registerButton.click();
  }

  /**
   * Click the continue button after successful registration
   */
  async clickContinueButton(): Promise<void> {
    await this.continueButton.click();
  }

  /**
   * Fill all registration form fields
   * @param userData - User data object containing all registration fields
   */
  async fillRegistrationForm(userData: {
    gender?: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<void> {
    if (userData.gender) {
      await this.selectGender(userData.gender);
    }
    
    await this.fillFirstName(userData.firstName);
    await this.fillLastName(userData.lastName);
    await this.fillEmail(userData.email);
    await this.fillPassword(userData.password);
    await this.fillConfirmPassword(userData.confirmPassword);
  }

  /**
   * Complete the entire registration process
   * @param userData - User data object containing all registration fields
   */
  async registerUser(userData: {
    gender?: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<void> {
    await this.fillRegistrationForm(userData);
    await this.clickRegisterButton();
  }

  /**
   * Verify successful registration
   */
  async verifySuccessfulRegistration(): Promise<void> {
    await expect(this.registrationCompletedMessage).toBeVisible();
    await expect(this.successMessage).toContainText('Your registration completed');
    
    // Take success screenshot for validation
    await this.page.screenshot({ 
      path: `screenshots/success-registration-${Date.now()}.png`,
      fullPage: true 
    });
    console.log('✅ Success screenshot captured for registration validation');
  }

  /**
   * Verify registration error message
   * @param expectedError - Expected error message
   */
  async verifyRegistrationError(expectedError: string): Promise<void> {
    // Check for specific field errors first
    const errorLocators = [
      this.firstNameError,
      this.lastNameError,
      this.emailError,
      this.passwordError,
      this.confirmPasswordError,
      this.generalError
    ];

    let errorFound = false;
    for (const errorLocator of errorLocators) {
      try {
        await expect(errorLocator).toBeVisible({ timeout: 2000 });
        await expect(errorLocator).toContainText(expectedError);
        errorFound = true;
        break;
      } catch (error) {
        // Continue to next error locator
      }
    }

    if (!errorFound) {
      throw new Error(`Expected error message "${expectedError}" not found`);
    }
  }

  /**
   * Get all visible error messages
   */
  async getAllErrorMessages(): Promise<string[]> {
    const errorMessages: string[] = [];
    const errorLocators = [
      this.firstNameError,
      this.lastNameError,
      this.emailError,
      this.passwordError,
      this.confirmPasswordError,
      this.generalError
    ];

    for (const errorLocator of errorLocators) {
      try {
        if (await errorLocator.isVisible()) {
          const errorText = await errorLocator.textContent();
          if (errorText && errorText.trim()) {
            errorMessages.push(errorText.trim());
          }
        }
      } catch (error) {
        // Continue to next error locator
      }
    }

    return errorMessages;
  }

  /**
   * Clear all form fields
   */
  async clearAllFields(): Promise<void> {
    await this.firstNameInput.clear();
    await this.lastNameInput.clear();
    await this.emailInput.clear();
    await this.passwordInput.clear();
    await this.confirmPasswordInput.clear();
  }

  /**
   * Verify page is loaded correctly
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Register/);
    await expect(this.firstNameInput).toBeVisible();
    await expect(this.lastNameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.confirmPasswordInput).toBeVisible();
    await expect(this.registerButton).toBeVisible();
  }

  /**
   * Get field values for verification
   */
  async getFieldValues(): Promise<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    genderMaleSelected: boolean;
    genderFemaleSelected: boolean;
  }> {
    return {
      firstName: await this.firstNameInput.inputValue(),
      lastName: await this.lastNameInput.inputValue(),
      email: await this.emailInput.inputValue(),
      password: await this.passwordInput.inputValue(),
      confirmPassword: await this.confirmPasswordInput.inputValue(),
      genderMaleSelected: await this.genderMaleRadio.isChecked(),
      genderFemaleSelected: await this.genderFemaleRadio.isChecked()
    };
  }

  /**
   * Verify form field properties (enabled, visible, etc.)
   */
  async verifyFormFieldProperties(): Promise<void> {
    // Verify all fields are visible and enabled
    await expect(this.genderMaleRadio).toBeVisible();
    await expect(this.genderFemaleRadio).toBeVisible();
    await expect(this.firstNameInput).toBeVisible();
    await expect(this.firstNameInput).toBeEnabled();
    await expect(this.lastNameInput).toBeVisible();
    await expect(this.lastNameInput).toBeEnabled();
    await expect(this.emailInput).toBeVisible();
    await expect(this.emailInput).toBeEnabled();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.passwordInput).toBeEnabled();
    await expect(this.confirmPasswordInput).toBeVisible();
    await expect(this.confirmPasswordInput).toBeEnabled();
    await expect(this.registerButton).toBeVisible();
    await expect(this.registerButton).toBeEnabled();
  }

  /**
   * Verify required field indicators (asterisks)
   */
  async verifyRequiredFieldIndicators(): Promise<void> {
    // Check for asterisk (*) indicators next to required fields
    await expect(this.page.locator('text=First name: *')).toBeVisible();
    await expect(this.page.locator('text=Last name: *')).toBeVisible();
    await expect(this.page.locator('text=Email: *')).toBeVisible();
    await expect(this.page.locator('text=Password: *')).toBeVisible();
    await expect(this.page.locator('text=Confirm password: *')).toBeVisible();
  }

  /**
   * Simulate tab navigation through form fields
   */
  async navigateWithTab(): Promise<void> {
    await this.genderMaleRadio.focus();
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
  }

  /**
   * Test form submission with Enter key
   */
  async submitFormWithEnter(): Promise<void> {
    await this.confirmPasswordInput.focus();
    await this.page.keyboard.press('Enter');
  }

  /**
   * Get environment-specific test user data
   */
  getTestUserData(): {
    gender?: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  } {
    const userData = envManager.getTestData('users', 'validUser') as {
      firstName?: string;
      lastName?: string;
      email: string;
      password: string;
    };
    return {
      gender: 'Male',
      firstName: userData.firstName || 'Test',
      lastName: userData.lastName || 'User',
      email: userData.email,
      password: userData.password,
      confirmPassword: userData.password
    };
  }

  /**
   * Register user with environment-specific test data
   */
  async registerWithTestData(): Promise<void> {
    const testUser = this.getTestUserData();
    await this.navigateToRegistrationPage();
    await this.fillRegistrationForm(testUser);
    await this.clickRegisterButton();
  }

  /**
   * Check if registration feature is enabled in current environment
   */
  isRegistrationEnabled(): boolean {
    return envManager.isFeatureEnabled('registration');
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentInfo(): {
    environment: string;
    baseUrl: string;
    registrationEnabled: boolean;
    timeout: number;
  } {
    return {
      environment: envManager.getCurrentEnvironment(),
      baseUrl: envManager.getBaseUrl(),
      registrationEnabled: envManager.isFeatureEnabled('registration'),
      timeout: envManager.getTimeout()
    };
  }
}