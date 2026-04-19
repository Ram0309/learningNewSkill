"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_test_1 = require("../../src/core/base-test");
base_test_1.test.describe('Security Testing Suite', () => {
    (0, base_test_1.securityTest)('should prevent SQL injection attacks @security @injection', async ({ api, security, logger }) => {
        logger.info('Testing SQL injection prevention');
        await security.startSecurityScan('sql_injection');
        const sqlInjectionPayloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "' UNION SELECT * FROM users --",
            "'; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --",
            "' OR 1=1 --",
            "admin'--",
            "admin' /*",
            "' OR 'x'='x",
            "'; EXEC xp_cmdshell('dir'); --",
            "' AND (SELECT COUNT(*) FROM users) > 0 --"
        ];
        // Test SQL injection on login endpoint
        for (const payload of sqlInjectionPayloads) {
            logger.info(`Testing SQL injection payload: ${payload.substring(0, 20)}...`);
            const response = await api.post('/api/auth/login', {
                username: payload,
                password: 'password'
            });
            // Should not return successful login or expose database errors
            (0, base_test_1.expect)(response.status()).not.toBe(200);
            const responseBody = await response.text();
            // Check for database error exposure
            const dbErrorPatterns = [
                /SQL syntax/i,
                /mysql_fetch/i,
                /ORA-\d+/i,
                /Microsoft.*ODBC/i,
                /PostgreSQL/i,
                /sqlite3/i,
                /Unclosed quotation mark/i
            ];
            for (const pattern of dbErrorPatterns) {
                (0, base_test_1.expect)(responseBody).not.toMatch(pattern);
            }
        }
        await security.stopSecurityScan('sql_injection');
        logger.info('SQL injection testing completed');
    });
    (0, base_test_1.securityTest)('should prevent XSS attacks @security @xss', async ({ page, security, logger }) => {
        logger.info('Testing XSS prevention');
        await security.startSecurityScan('xss_prevention');
        const xssPayloads = [
            '<script>alert("XSS")</script>',
            '<img src="x" onerror="alert(\'XSS\')">',
            '<svg onload="alert(\'XSS\')">',
            'javascript:alert("XSS")',
            '<iframe src="javascript:alert(\'XSS\')"></iframe>',
            '<body onload="alert(\'XSS\')">',
            '<input type="text" value="" onfocus="alert(\'XSS\')" autofocus>',
            '<marquee onstart="alert(\'XSS\')">',
            '<video><source onerror="alert(\'XSS\')">',
            '<audio src="x" onerror="alert(\'XSS\')">'
        ];
        // Navigate to a form page
        await page.goto('/contact');
        // Test XSS in form inputs
        for (const payload of xssPayloads) {
            logger.info(`Testing XSS payload: ${payload.substring(0, 30)}...`);
            // Fill form with XSS payload
            await page.fill('[data-testid="name-input"]', payload);
            await page.fill('[data-testid="message-input"]', payload);
            // Submit form
            await page.click('[data-testid="submit-button"]');
            // Wait for response
            await page.waitForTimeout(1000);
            // Check if XSS payload was executed (should not be)
            const alertDialogs = [];
            page.on('dialog', dialog => {
                alertDialogs.push(dialog.message());
                dialog.dismiss();
            });
            // Verify no alert dialogs were triggered
            (0, base_test_1.expect)(alertDialogs.length).toBe(0);
            // Check if payload is properly escaped in the DOM
            const pageContent = await page.content();
            (0, base_test_1.expect)(pageContent).not.toContain('<script>alert("XSS")</script>');
            // Clear form for next test
            await page.fill('[data-testid="name-input"]', '');
            await page.fill('[data-testid="message-input"]', '');
        }
        await security.stopSecurityScan('xss_prevention');
        logger.info('XSS prevention testing completed');
    });
    (0, base_test_1.securityTest)('should enforce proper authentication @security @auth', async ({ api, security, logger }) => {
        logger.info('Testing authentication and authorization');
        await security.startSecurityScan('auth_authorization');
        // Test unauthenticated access to protected endpoints
        const protectedEndpoints = [
            '/api/admin/users',
            '/api/user/profile',
            '/api/orders',
            '/api/admin/settings',
            '/api/user/dashboard'
        ];
        for (const endpoint of protectedEndpoints) {
            logger.info(`Testing unauthenticated access to: ${endpoint}`);
            const response = await api.get(endpoint);
            // Should return 401 Unauthorized
            (0, base_test_1.expect)(response.status()).toBe(401);
        }
        await security.stopSecurityScan('auth_authorization');
        logger.info('Authentication testing completed');
    });
});
//# sourceMappingURL=security-tests.security.spec.js.map