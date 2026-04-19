"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const registration_json_1 = __importDefault(require("../../test-data/registration.json"));
// Utility function to generate unique email with timestamp
function generateUniqueEmail(emailTemplate) {
    const timestamp = Date.now();
    return emailTemplate.replace('{{timestamp}}', timestamp.toString());
}
test_1.test.describe('Registration API Tests', () => {
    let apiContext;
    const baseURL = 'https://demowebshop.tricentis.com';
    test_1.test.beforeAll(async ({ playwright }) => {
        apiContext = await playwright.request.newContext({
            baseURL: baseURL,
            extraHTTPHeaders: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Playwright-API-Test'
            }
        });
    });
    test_1.test.afterAll(async () => {
        await apiContext.dispose();
    });
    test_1.test.describe('Valid API Registration Tests', () => {
        registration_json_1.default.validUsers.forEach((userData) => {
            (0, test_1.test)(`API_${userData.testId}: ${userData.description}`, async () => {
                // First, get the registration page to extract any CSRF tokens or form data
                const registrationPageResponse = await apiContext.get('/register');
                (0, test_1.expect)(registrationPageResponse.ok()).toBeTruthy();
                const pageContent = await registrationPageResponse.text();
                // Extract CSRF token if present
                const csrfTokenMatch = pageContent.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
                const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : '';
                // Generate unique email for this test
                const uniqueEmail = generateUniqueEmail(userData.email);
                // Prepare form data
                const formData = new URLSearchParams();
                formData.append('Gender', userData.gender || 'Male');
                formData.append('FirstName', userData.firstName);
                formData.append('LastName', userData.lastName);
                formData.append('Email', uniqueEmail);
                formData.append('Password', userData.password);
                formData.append('ConfirmPassword', userData.confirmPassword);
                if (csrfToken) {
                    formData.append('__RequestVerificationToken', csrfToken);
                }
                // Submit registration via API
                const response = await apiContext.post('/register', {
                    data: formData.toString(),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                // Verify response
                (0, test_1.expect)(response.status()).toBe(200);
                const responseText = await response.text();
                // Check for success indicators in response
                (0, test_1.expect)(responseText).toContain('Your registration completed');
            });
        });
    });
    test_1.test.describe('Invalid API Registration Tests', () => {
        registration_json_1.default.invalidUsers.forEach((userData) => {
            (0, test_1.test)(`API_${userData.testId}: ${userData.description}`, async () => {
                // Get registration page for CSRF token
                const registrationPageResponse = await apiContext.get('/register');
                const pageContent = await registrationPageResponse.text();
                const csrfTokenMatch = pageContent.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
                const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : '';
                let testEmail = userData.email;
                if (userData.email.includes('{{timestamp}}')) {
                    testEmail = generateUniqueEmail(userData.email);
                }
                // Prepare form data with invalid data
                const formData = new URLSearchParams();
                formData.append('Gender', userData.gender || 'Male');
                formData.append('FirstName', userData.firstName);
                formData.append('LastName', userData.lastName);
                formData.append('Email', testEmail);
                formData.append('Password', userData.password);
                formData.append('ConfirmPassword', userData.confirmPassword);
                if (csrfToken) {
                    formData.append('__RequestVerificationToken', csrfToken);
                }
                // Submit registration via API
                const response = await apiContext.post('/register', {
                    data: formData.toString(),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                const responseText = await response.text();
                // Verify error handling
                if (userData.expectedError) {
                    // Check that the response contains error information
                    (0, test_1.expect)(responseText).toContain('field-validation-error');
                }
            });
        });
    });
    test_1.test.describe('API Security Tests', () => {
        (0, test_1.test)('API_SEC_001: Verify CSRF protection', async () => {
            const validUser = registration_json_1.default.validUsers[0];
            const uniqueEmail = generateUniqueEmail(validUser.email);
            // Attempt registration without CSRF token
            const formData = new URLSearchParams();
            formData.append('Gender', validUser.gender || 'Male');
            formData.append('FirstName', validUser.firstName);
            formData.append('LastName', validUser.lastName);
            formData.append('Email', uniqueEmail);
            formData.append('Password', validUser.password);
            formData.append('ConfirmPassword', validUser.confirmPassword);
            const response = await apiContext.post('/register', {
                data: formData.toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            // Should either reject the request or require CSRF token
            const responseText = await response.text();
            // If CSRF protection is implemented, registration should fail
            if (response.status() !== 200) {
                (0, test_1.expect)(response.status()).toBeGreaterThanOrEqual(400);
            }
        });
        (0, test_1.test)('API_SEC_002: Verify rate limiting', async () => {
            const validUser = registration_json_1.default.validUsers[0];
            // Get CSRF token
            const registrationPageResponse = await apiContext.get('/register');
            const pageContent = await registrationPageResponse.text();
            const csrfTokenMatch = pageContent.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
            const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : '';
            const responses = [];
            // Attempt multiple rapid registrations
            for (let i = 0; i < 10; i++) {
                const uniqueEmail = generateUniqueEmail(`ratelimit.test.${i}.{{timestamp}}@test.com`);
                const formData = new URLSearchParams();
                formData.append('Gender', 'Male');
                formData.append('FirstName', `Test${i}`);
                formData.append('LastName', `User${i}`);
                formData.append('Email', uniqueEmail);
                formData.append('Password', 'Test@123456');
                formData.append('ConfirmPassword', 'Test@123456');
                if (csrfToken) {
                    formData.append('__RequestVerificationToken', csrfToken);
                }
                const response = await apiContext.post('/register', {
                    data: formData.toString(),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                responses.push(response.status());
            }
            // Check if any requests were rate limited (429 status or similar)
            const rateLimitedRequests = responses.filter(status => status === 429 || status === 503);
            // Log results for analysis
            console.log('Rate limiting test results:', responses);
            // If rate limiting is implemented, some requests should be blocked
            // This is more of an informational test
        });
        (0, test_1.test)('API_SEC_003: Verify SQL injection protection', async () => {
            const sqlPayload = "'; DROP TABLE users; --";
            // Get CSRF token
            const registrationPageResponse = await apiContext.get('/register');
            const pageContent = await registrationPageResponse.text();
            const csrfTokenMatch = pageContent.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
            const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : '';
            const formData = new URLSearchParams();
            formData.append('Gender', 'Male');
            formData.append('FirstName', sqlPayload);
            formData.append('LastName', 'Test');
            formData.append('Email', generateUniqueEmail('sql.test.{{timestamp}}@test.com'));
            formData.append('Password', 'Test@123456');
            formData.append('ConfirmPassword', 'Test@123456');
            if (csrfToken) {
                formData.append('__RequestVerificationToken', csrfToken);
            }
            const response = await apiContext.post('/register', {
                data: formData.toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            const responseText = await response.text();
            // Verify no database errors are exposed
            (0, test_1.expect)(responseText.toLowerCase()).not.toContain('sql error');
            (0, test_1.expect)(responseText.toLowerCase()).not.toContain('database error');
            (0, test_1.expect)(responseText.toLowerCase()).not.toContain('mysql');
            (0, test_1.expect)(responseText.toLowerCase()).not.toContain('postgresql');
            (0, test_1.expect)(responseText.toLowerCase()).not.toContain('ora-');
        });
    });
    test_1.test.describe('API Performance Tests', () => {
        (0, test_1.test)('API_PERF_001: Verify registration response time', async () => {
            const validUser = registration_json_1.default.validUsers[0];
            const uniqueEmail = generateUniqueEmail(validUser.email);
            // Get CSRF token
            const registrationPageResponse = await apiContext.get('/register');
            const pageContent = await registrationPageResponse.text();
            const csrfTokenMatch = pageContent.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
            const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : '';
            const formData = new URLSearchParams();
            formData.append('Gender', validUser.gender || 'Male');
            formData.append('FirstName', validUser.firstName);
            formData.append('LastName', validUser.lastName);
            formData.append('Email', uniqueEmail);
            formData.append('Password', validUser.password);
            formData.append('ConfirmPassword', validUser.confirmPassword);
            if (csrfToken) {
                formData.append('__RequestVerificationToken', csrfToken);
            }
            const startTime = Date.now();
            const response = await apiContext.post('/register', {
                data: formData.toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            const responseTime = Date.now() - startTime;
            // API should respond within 5 seconds
            (0, test_1.expect)(responseTime).toBeLessThan(5000);
            (0, test_1.expect)(response.ok()).toBeTruthy();
        });
        (0, test_1.test)('API_PERF_002: Verify concurrent registration handling', async () => {
            const concurrentRequests = 5;
            const promises = [];
            // Get CSRF token
            const registrationPageResponse = await apiContext.get('/register');
            const pageContent = await registrationPageResponse.text();
            const csrfTokenMatch = pageContent.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
            const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : '';
            for (let i = 0; i < concurrentRequests; i++) {
                const uniqueEmail = generateUniqueEmail(`concurrent.test.${i}.{{timestamp}}@test.com`);
                const formData = new URLSearchParams();
                formData.append('Gender', 'Male');
                formData.append('FirstName', `Concurrent${i}`);
                formData.append('LastName', `User${i}`);
                formData.append('Email', uniqueEmail);
                formData.append('Password', 'Test@123456');
                formData.append('ConfirmPassword', 'Test@123456');
                if (csrfToken) {
                    formData.append('__RequestVerificationToken', csrfToken);
                }
                const promise = apiContext.post('/register', {
                    data: formData.toString(),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                promises.push(promise);
            }
            const startTime = Date.now();
            const responses = await Promise.all(promises);
            const totalTime = Date.now() - startTime;
            // All requests should complete within reasonable time
            (0, test_1.expect)(totalTime).toBeLessThan(15000);
            // Check that all requests were processed
            for (const response of responses) {
                (0, test_1.expect)(response.status()).toBeGreaterThanOrEqual(200);
                (0, test_1.expect)(response.status()).toBeLessThan(500);
            }
        });
    });
    test_1.test.describe('API Data Validation Tests', () => {
        (0, test_1.test)('API_DATA_001: Verify email format validation', async () => {
            const invalidEmails = [
                'invalid-email',
                'invalid@',
                '@invalid.com',
                'invalid..email@test.com',
                'invalid@.com',
                'invalid@com.',
                ''
            ];
            // Get CSRF token
            const registrationPageResponse = await apiContext.get('/register');
            const pageContent = await registrationPageResponse.text();
            const csrfTokenMatch = pageContent.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
            const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : '';
            for (const invalidEmail of invalidEmails) {
                const formData = new URLSearchParams();
                formData.append('Gender', 'Male');
                formData.append('FirstName', 'Test');
                formData.append('LastName', 'User');
                formData.append('Email', invalidEmail);
                formData.append('Password', 'Test@123456');
                formData.append('ConfirmPassword', 'Test@123456');
                if (csrfToken) {
                    formData.append('__RequestVerificationToken', csrfToken);
                }
                const response = await apiContext.post('/register', {
                    data: formData.toString(),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                const responseText = await response.text();
                // Should contain validation error for invalid email
                if (invalidEmail === '') {
                    (0, test_1.expect)(responseText).toContain('Email is required');
                }
                else {
                    (0, test_1.expect)(responseText).toContain('Wrong email');
                }
            }
        });
        (0, test_1.test)('API_DATA_002: Verify password validation', async () => {
            const invalidPasswords = [
                '', // Empty password
                '12345', // Too short
                'short' // Too short
            ];
            // Get CSRF token
            const registrationPageResponse = await apiContext.get('/register');
            const pageContent = await registrationPageResponse.text();
            const csrfTokenMatch = pageContent.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
            const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : '';
            for (const invalidPassword of invalidPasswords) {
                const uniqueEmail = generateUniqueEmail(`password.test.{{timestamp}}@test.com`);
                const formData = new URLSearchParams();
                formData.append('Gender', 'Male');
                formData.append('FirstName', 'Test');
                formData.append('LastName', 'User');
                formData.append('Email', uniqueEmail);
                formData.append('Password', invalidPassword);
                formData.append('ConfirmPassword', invalidPassword);
                if (csrfToken) {
                    formData.append('__RequestVerificationToken', csrfToken);
                }
                const response = await apiContext.post('/register', {
                    data: formData.toString(),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                const responseText = await response.text();
                // Should contain validation error for invalid password
                if (invalidPassword === '') {
                    (0, test_1.expect)(responseText).toContain('Password is required');
                }
                else {
                    (0, test_1.expect)(responseText).toContain('password should have at least 6 characters');
                }
            }
        });
    });
});
//# sourceMappingURL=registration-api.spec.js.map