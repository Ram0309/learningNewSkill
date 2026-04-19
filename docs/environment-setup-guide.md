# Environment Setup Guide

## Overview

The Enterprise Test Automation Framework supports multiple environments (dev, sit, preprod, prod) with environment-specific configurations. This guide explains how to set up and use different environments.

## 🌍 **Available Environments**

| Environment | Purpose | URL Pattern | Features |
|-------------|---------|-------------|----------|
| **dev** | Development testing | `https://dev-*.com` | All features enabled, relaxed security |
| **sit** | System Integration Testing | `https://sit-*.com` | Full testing with integrations |
| **preprod** | Pre-production testing | `https://preprod-*.com` | Production-like environment |
| **prod** | Production monitoring | `https://*.com` | Limited testing, read-only operations |

## 📁 **Configuration Structure**

```
config/
└── environments/
    ├── dev.json      # Development environment
    ├── sit.json      # SIT environment  
    ├── preprod.json  # Pre-production environment
    └── prod.json     # Production environment
```

## ⚙️ **Environment Configuration**

Each environment configuration includes:

### Basic Settings
- `baseUrl`: Application base URL
- `apiBaseUrl`: API base URL
- `timeout`: Default timeout for operations
- `retries`: Number of retry attempts
- `headless`: Browser headless mode

### Features Configuration
```json
"features": {
  "registration": {
    "enabled": true,
    "url": "/register",
    "apiEndpoint": "/api/users/register"
  },
  "login": {
    "enabled": true,
    "url": "/login", 
    "apiEndpoint": "/api/auth/login"
  }
}
```

### Test Data
```json
"testData": {
  "users": {
    "validUser": {
      "firstName": "John",
      "lastName": "Doe", 
      "email": "john.doe.dev@test.com",
      "password": "DevPass123!"
    }
  }
}
```

### Integrations
```json
"integrations": {
  "jira": { "enabled": true, "projectKey": "TAF-DEV" },
  "slack": { "enabled": true, "channel": "#test-automation-dev" },
  "browserstack": { "enabled": false },
  "aws": { "enabled": false }
}
```

## 🚀 **Usage Examples**

### 1. Running Tests in Different Environments

```bash
# Development environment (default)
npm test

# Specific environments
npm run test:dev
npm run test:sit  
npm run test:preprod
npm run test:prod

# Or using environment variable
TEST_ENV=sit npm test
TEST_ENV=preprod npm test
```

### 2. Using Environment Manager in Tests

```typescript
import { envManager } from '../src/utils/environment-manager';

test('environment-aware test', async ({ page }) => {
  // Get current environment
  const env = envManager.getCurrentEnvironment();
  console.log(`Running in: ${env}`);

  // Get environment-specific URL
  const baseUrl = envManager.getBaseUrl();
  const registrationUrl = envManager.getFeatureUrl('registration');

  // Check if feature is enabled
  if (!envManager.isFeatureEnabled('registration')) {
    test.skip('Registration disabled in this environment');
  }

  // Use environment-specific test data
  const testUser = envManager.getTestData('users', 'validUser');
  
  // Navigate and test
  await page.goto(registrationUrl);
  // ... rest of test
});
```

### 3. Environment-Specific Page Objects

```typescript
import { envManager } from '../utils/environment-manager';

export class RegistrationPage {
  constructor(private page: Page) {}

  async navigate() {
    // Check if feature is enabled
    if (!envManager.isFeatureEnabled('registration')) {
      throw new Error(`Registration disabled in ${envManager.getCurrentEnvironment()}`);
    }

    // Use environment-specific URL
    const url = envManager.getFeatureUrl('registration');
    await this.page.goto(url);
  }

  getTestData() {
    return envManager.getTestData('users', 'validUser');
  }
}
```

## 🔧 **Environment Management Commands**

### List Available Environments
```bash
npm run env:list
```

### Validate Configuration
```bash
npm run env:validate
```

### Show Environment Summary
```bash
npm run env:summary
```

### Switch Environment
```bash
# Set environment variable
export TEST_ENV=sit

# Or use npm scripts
npm run env:sit
npm run test
```

## 🛡️ **Environment-Specific Restrictions**

### Development Environment
- All features enabled
- Full test data modification allowed
- All integrations available for testing
- Relaxed security settings

### SIT Environment  
- All features enabled
- Full testing capabilities
- All integrations enabled
- Production-like security

### Pre-Production Environment
- All features enabled
- Limited performance testing
- All integrations enabled
- Production security settings

### Production Environment
- **Limited features** (registration/checkout disabled)
- **Read-only operations** only
- **Smoke tests only**
- **No data modification**
- Minimal performance testing

```typescript
// Check restrictions in tests
if (envManager.isSmokeTestsOnly()) {
  // Run only basic navigation tests
}

if (!envManager.isDataModificationAllowed()) {
  // Skip tests that modify data
}
```

## 🔐 **Environment Variables**

Set environment-specific variables in `.env` files:

```bash
# .env.development
TEST_ENV=dev
DEV_BASE_URL=https://dev-demowebshop.tricentis.com
DEV_DB_PASSWORD=dev_password

# .env.staging  
TEST_ENV=sit
SIT_BASE_URL=https://sit-demowebshop.tricentis.com
SIT_DB_PASSWORD=sit_password

# .env.production
TEST_ENV=prod
PROD_BASE_URL=https://demowebshop.tricentis.com
PROD_DB_PASSWORD=prod_readonly_password
```

## 📊 **Environment Comparison**

| Feature | Dev | SIT | PreProd | Prod |
|---------|-----|-----|---------|------|
| Registration | ✅ | ✅ | ✅ | ❌ |
| Data Modification | ✅ | ✅ | ✅ | ❌ |
| Performance Testing | ✅ | ✅ | ✅ | Limited |
| Security Testing | ✅ | ✅ | ✅ | ❌ |
| Load Testing | 10 users | 50 users | 100 users | 5 users |
| Jira Integration | ❌ | ✅ | ✅ | ✅ |
| BrowserStack | ❌ | ✅ | ✅ | ✅ |
| AWS Integration | ❌ | ✅ | ✅ | ✅ |

## 🎯 **Best Practices**

### 1. Environment-Aware Tests
```typescript
test.describe('Registration Tests', () => {
  test.beforeEach(async () => {
    // Skip if feature disabled
    if (!envManager.isFeatureEnabled('registration')) {
      test.skip('Registration disabled in this environment');
    }
  });

  test('should register user', async ({ page }) => {
    // Use environment-specific data
    const testUser = envManager.getTestData('users', 'validUser');
    // ... test implementation
  });
});
```

### 2. Conditional Test Execution
```typescript
test('data modification test', async ({ page }) => {
  // Skip if data modification not allowed
  if (!envManager.isDataModificationAllowed()) {
    test.skip('Data modification not allowed in this environment');
  }
  
  // ... test that modifies data
});
```

### 3. Environment-Specific Timeouts
```typescript
test('slow operation test', async ({ page }) => {
  // Use environment-specific timeout
  const timeout = envManager.getTimeout();
  page.setDefaultTimeout(timeout);
  
  // ... test implementation
});
```

### 4. Integration-Aware Testing
```typescript
test('cross-browser test', async ({ page }) => {
  // Only run if BrowserStack is enabled
  if (!envManager.isIntegrationEnabled('browserstack')) {
    test.skip('BrowserStack integration disabled');
  }
  
  // ... cross-browser test
});
```

## 🚨 **Troubleshooting**

### Common Issues

#### 1. Environment Not Found
```
Error: Environment configuration file not found: config/environments/staging.json
```
**Solution**: Create the missing environment configuration file.

#### 2. Feature Disabled
```
Error: Registration feature is disabled in prod environment
```
**Solution**: Check environment configuration or switch to appropriate environment.

#### 3. Invalid Configuration
```
Error: baseUrl is not a valid URL
```
**Solution**: Validate environment configuration using `npm run env:validate`.

#### 4. Environment Variable Not Set
```
Warning: Environment variable DEV_DB_PASSWORD is not set
```
**Solution**: Set required environment variables in `.env` file.

### Debugging Commands

```bash
# Check current environment
echo $TEST_ENV

# Validate configuration
npm run env:validate

# Show configuration summary
npm run env:summary

# List available environments
npm run env:list
```

## 📝 **Adding New Environments**

1. Create new configuration file:
```bash
cp config/environments/dev.json config/environments/uat.json
```

2. Update configuration values:
```json
{
  "environment": "uat",
  "baseUrl": "https://uat-demowebshop.tricentis.com",
  "apiBaseUrl": "https://uat-api.tricentis.com/v1",
  // ... other settings
}
```

3. Add npm script:
```json
{
  "scripts": {
    "test:uat": "TEST_ENV=uat playwright test"
  }
}
```

4. Create environment variables:
```bash
# .env.uat
TEST_ENV=uat
UAT_BASE_URL=https://uat-demowebshop.tricentis.com
UAT_DB_PASSWORD=uat_password
```

## 🔄 **CI/CD Integration**

### GitHub Actions
```yaml
strategy:
  matrix:
    environment: [dev, sit, preprod]
    
steps:
  - name: Run tests
    run: npm run test:${{ matrix.environment }}
    env:
      TEST_ENV: ${{ matrix.environment }}
```

### Jenkins Pipeline
```groovy
pipeline {
  parameters {
    choice(
      name: 'ENVIRONMENT',
      choices: ['dev', 'sit', 'preprod', 'prod'],
      description: 'Target environment'
    )
  }
  
  stages {
    stage('Test') {
      steps {
        sh "TEST_ENV=${params.ENVIRONMENT} npm test"
      }
    }
  }
}
```

This environment management system provides flexibility, safety, and consistency across different testing environments while maintaining the same test codebase.