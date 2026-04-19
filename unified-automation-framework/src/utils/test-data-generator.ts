import { faker } from '@faker-js/faker';

export interface UserData {
  testId?: string;
  description?: string;
  gender: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  expectedResult?: string;
  expectedError?: string;
}

export class TestDataGenerator {
  /**
   * Generate a unique email with timestamp
   */
  static generateUniqueEmail(baseEmail?: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    if (baseEmail && baseEmail.includes('{{timestamp}}')) {
      return baseEmail.replace('{{timestamp}}', `${timestamp}.${randomId}`);
    }
    
    return `test.user.${timestamp}.${randomId}@testmail.com`;
  }

  /**
   * Generate random valid user data
   */
  static generateValidUser(): UserData {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = this.generateUniqueEmail();
    const password = this.generateValidPassword();

    return {
      gender: faker.helpers.arrayElement(['Male', 'Female']),
      firstName,
      lastName,
      email,
      password,
      confirmPassword: password,
      expectedResult: 'success'
    };
  }

  /**
   * Generate multiple valid users
   */
  static generateValidUsers(count: number): UserData[] {
    const users: UserData[] = [];
    for (let i = 0; i < count; i++) {
      users.push(this.generateValidUser());
    }
    return users;
  }

  /**
   * Generate valid password with complexity requirements
   */
  static generateValidPassword(): string {
    const length = faker.number.int({ min: 8, max: 16 });
    const uppercase = faker.string.alpha({ length: 2, casing: 'upper' });
    const lowercase = faker.string.alpha({ length: 2, casing: 'lower' });
    const numbers = faker.string.numeric(2);
    const symbols = faker.helpers.arrayElements(['!', '@', '#', '$', '%', '^', '&', '*'], 2).join('');
    
    const passwordChars = (uppercase + lowercase + numbers + symbols).split('');
    const remainingLength = length - passwordChars.length;
    
    if (remainingLength > 0) {
      const additionalChars = faker.string.alphanumeric(remainingLength);
      passwordChars.push(...additionalChars.split(''));
    }
    
    // Shuffle the characters
    return faker.helpers.shuffle(passwordChars).join('');
  }

  /**
   * Generate user with invalid email formats
   */
  static generateInvalidEmailUser(): UserData {
    const invalidEmails = [
      'invalid-email',
      'invalid@',
      '@invalid.com',
      'invalid..email@test.com',
      'invalid@.com',
      'invalid@com.',
      'test@',
      '@test.com',
      'test@@test.com',
      'test@test..com'
    ];

    const baseUser = this.generateValidUser();
    return {
      ...baseUser,
      email: faker.helpers.arrayElement(invalidEmails),
      expectedResult: 'error',
      expectedError: 'Wrong email'
    };
  }

  /**
   * Generate user with invalid password
   */
  static generateInvalidPasswordUser(): UserData {
    const invalidPasswords = [
      '', // Empty
      '123', // Too short
      '12345', // Still too short
      'short' // Too short
    ];

    const baseUser = this.generateValidUser();
    const invalidPassword = faker.helpers.arrayElement(invalidPasswords);
    
    return {
      ...baseUser,
      password: invalidPassword,
      confirmPassword: invalidPassword,
      expectedResult: 'error',
      expectedError: invalidPassword === '' ? 'Password is required' : 'The password should have at least 6 characters'
    };
  }

  /**
   * Generate user with password mismatch
   */
  static generatePasswordMismatchUser(): UserData {
    const baseUser = this.generateValidUser();
    return {
      ...baseUser,
      confirmPassword: this.generateValidPassword(), // Different password
      expectedResult: 'error',
      expectedError: 'The password and confirmation password do not match'
    };
  }

  /**
   * Generate user with empty required fields
   */
  static generateEmptyFieldUser(emptyField: 'firstName' | 'lastName' | 'email' | 'password'): UserData {
    const baseUser = this.generateValidUser();
    const errorMessages = {
      firstName: 'First name is required',
      lastName: 'Last name is required',
      email: 'Email is required',
      password: 'Password is required'
    };

    const userData = { ...baseUser };
    userData[emptyField] = '';
    
    if (emptyField === 'password') {
      userData.confirmPassword = '';
    }

    return {
      ...userData,
      expectedResult: 'error',
      expectedError: errorMessages[emptyField]
    };
  }

  /**
   * Generate user with XSS payload
   */
  static generateXSSUser(): UserData {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '"><script>alert("XSS")</script>'
    ];

    const baseUser = this.generateValidUser();
    return {
      ...baseUser,
      firstName: faker.helpers.arrayElement(xssPayloads),
      lastName: 'TestUser',
      expectedResult: 'error',
      expectedError: 'Invalid characters in name'
    };
  }

  /**
   * Generate user with SQL injection payload
   */
  static generateSQLInjectionUser(): UserData {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; DELETE FROM users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1 --"
    ];

    const baseUser = this.generateValidUser();
    return {
      ...baseUser,
      firstName: faker.helpers.arrayElement(sqlPayloads),
      lastName: 'TestUser',
      expectedResult: 'error',
      expectedError: 'Invalid characters in name'
    };
  }

  /**
   * Generate user with boundary value names
   */
  static generateBoundaryValueUser(type: 'minimum' | 'maximum'): UserData {
    const baseUser = this.generateValidUser();
    
    if (type === 'minimum') {
      return {
        ...baseUser,
        firstName: 'A',
        lastName: 'B',
        expectedResult: 'success'
      };
    } else {
      // Maximum length names (assuming 50 character limit)
      return {
        ...baseUser,
        firstName: 'A'.repeat(50),
        lastName: 'B'.repeat(50),
        expectedResult: 'success'
      };
    }
  }

  /**
   * Generate user with special characters in names
   */
  static generateSpecialCharacterUser(): UserData {
    const specialNames = [
      { first: 'Jean-Pierre', last: 'Dubois' },
      { first: "O'Connor", last: 'Smith' },
      { first: 'José', last: 'García' },
      { first: 'François', last: 'Müller' },
      { first: 'Åse', last: 'Øberg' },
      { first: 'Владимир', last: 'Петров' },
      { first: '田中', last: '太郎' }
    ];

    const baseUser = this.generateValidUser();
    const specialName = faker.helpers.arrayElement(specialNames);
    
    return {
      ...baseUser,
      firstName: specialName.first,
      lastName: specialName.last,
      expectedResult: 'success'
    };
  }

  /**
   * Generate user with leading/trailing spaces
   */
  static generateSpacePaddedUser(): UserData {
    const baseUser = this.generateValidUser();
    return {
      ...baseUser,
      firstName: `  ${baseUser.firstName}  `,
      lastName: `  ${baseUser.lastName}  `,
      email: `  ${baseUser.email}  `,
      password: `  ${baseUser.password}  `,
      confirmPassword: `  ${baseUser.password}  `,
      expectedResult: 'success'
    };
  }

  /**
   * Generate performance test data
   */
  static generatePerformanceTestUsers(count: number): UserData[] {
    const users: UserData[] = [];
    
    for (let i = 0; i < count; i++) {
      const user = this.generateValidUser();
      user.testId = `PERF_USER_${i.toString().padStart(3, '0')}`;
      user.description = `Performance test user ${i + 1}`;
      users.push(user);
    }
    
    return users;
  }

  /**
   * Generate test data for concurrent testing
   */
  static generateConcurrentTestUsers(count: number): UserData[] {
    const users: UserData[] = [];
    
    for (let i = 0; i < count; i++) {
      const user = this.generateValidUser();
      user.testId = `CONCURRENT_USER_${i.toString().padStart(2, '0')}`;
      user.description = `Concurrent test user ${i + 1}`;
      user.email = `concurrent.user.${i}.${Date.now()}@testmail.com`;
      users.push(user);
    }
    
    return users;
  }

  /**
   * Generate duplicate email test data
   */
  static generateDuplicateEmailUser(existingEmail: string): UserData {
    const baseUser = this.generateValidUser();
    return {
      ...baseUser,
      email: existingEmail,
      expectedResult: 'error',
      expectedError: 'The specified email already exists'
    };
  }

  /**
   * Generate test data with various password patterns
   */
  static generatePasswordPatternUsers(): UserData[] {
    const passwordPatterns = [
      { password: '123456789', description: 'Numeric only password' },
      { password: 'abcdefghi', description: 'Lowercase only password' },
      { password: 'ABCDEFGHI', description: 'Uppercase only password' },
      { password: '!@#$%^&*()', description: 'Special characters only password' },
      { password: 'Password123', description: 'Mixed case with numbers' },
      { password: 'Pass@123!', description: 'Complex password with all character types' }
    ];

    return passwordPatterns.map((pattern, index) => {
      const baseUser = this.generateValidUser();
      return {
        ...baseUser,
        testId: `PWD_PATTERN_${index + 1}`,
        description: pattern.description,
        password: pattern.password,
        confirmPassword: pattern.password,
        expectedResult: 'success'
      };
    });
  }
}