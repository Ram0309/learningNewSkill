# Manual Test Cases for User Registration

## Test Environment
- **Application**: Demo Web Shop (Tricentis)
- **URL**: https://demowebshop.tricentis.com/register
- **Browser**: Chrome, Firefox, Safari, Edge
- **Test Data**: registration.json

---

## Test Suite: REG_MANUAL - User Registration Manual Tests

### **Test Category: Positive Test Cases**

#### **Test Case ID**: REG_MAN_001
**Test Title**: Valid User Registration with All Required Fields  
**Priority**: High  
**Test Type**: Functional  

**Preconditions**:
- Navigate to registration page
- All form fields are visible and enabled

**Test Steps**:
1. Select gender: Male
2. Enter First Name: "John"
3. Enter Last Name: "Doe"
4. Enter Email: "john.doe.test@email.com"
5. Enter Password: "Test@123456"
6. Enter Confirm Password: "Test@123456"
7. Click "Register" button

**Expected Result**:
- Registration successful message displayed
- User redirected to success page
- "Your registration completed" message visible
- Continue button available

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  
**Comments**: [Any observations]

---

#### **Test Case ID**: REG_MAN_002
**Test Title**: Valid Female User Registration  
**Priority**: High  
**Test Type**: Functional  

**Preconditions**:
- Navigate to registration page

**Test Steps**:
1. Select gender: Female
2. Enter First Name: "Jane"
3. Enter Last Name: "Smith"
4. Enter Email: "jane.smith.test@email.com"
5. Enter Password: "SecurePass@789"
6. Enter Confirm Password: "SecurePass@789"
7. Click "Register" button

**Expected Result**:
- Registration successful
- Female gender selection preserved
- Success message displayed

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  
**Comments**: [Any observations]

---

#### **Test Case ID**: REG_MAN_003
**Test Title**: Registration with Minimum Length Names  
**Priority**: Medium  
**Test Type**: Boundary Value Analysis  

**Test Steps**:
1. Select gender: Male
2. Enter First Name: "A" (1 character)
3. Enter Last Name: "B" (1 character)
4. Enter Email: "a.b.test@email.com"
5. Enter Password: "Min@Pass1"
6. Enter Confirm Password: "Min@Pass1"
7. Click "Register" button

**Expected Result**:
- Registration successful with minimum length names
- No validation errors

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

#### **Test Case ID**: REG_MAN_004
**Test Title**: Registration with Special Characters in Names  
**Priority**: Medium  
**Test Type**: Functional  

**Test Steps**:
1. Select gender: Female
2. Enter First Name: "Jean-Pierre"
3. Enter Last Name: "O'Connor"
4. Enter Email: "jean.pierre.test@email.com"
5. Enter Password: "Special@Char123"
6. Enter Confirm Password: "Special@Char123"
7. Click "Register" button

**Expected Result**:
- Registration successful with special characters
- Names with hyphens and apostrophes accepted

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

### **Test Category: Negative Test Cases**

#### **Test Case ID**: REG_MAN_005
**Test Title**: Registration with Empty First Name  
**Priority**: High  
**Test Type**: Validation Testing  

**Test Steps**:
1. Select gender: Male
2. Leave First Name field empty
3. Enter Last Name: "Doe"
4. Enter Email: "empty.firstname@test.com"
5. Enter Password: "Test@123456"
6. Enter Confirm Password: "Test@123456"
7. Click "Register" button

**Expected Result**:
- Registration fails
- Error message: "First name is required"
- User remains on registration page
- First name field highlighted in red

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

#### **Test Case ID**: REG_MAN_006
**Test Title**: Registration with Empty Last Name  
**Priority**: High  
**Test Type**: Validation Testing  

**Test Steps**:
1. Select gender: Female
2. Enter First Name: "Jane"
3. Leave Last Name field empty
4. Enter Email: "empty.lastname@test.com"
5. Enter Password: "Test@123456"
6. Enter Confirm Password: "Test@123456"
7. Click "Register" button

**Expected Result**:
- Registration fails
- Error message: "Last name is required"
- Last name field highlighted

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

#### **Test Case ID**: REG_MAN_007
**Test Title**: Registration with Invalid Email Format  
**Priority**: High  
**Test Type**: Validation Testing  

**Test Steps**:
1. Select gender: Male
2. Enter First Name: "John"
3. Enter Last Name: "Doe"
4. Enter Email: "invalid.email.com" (missing @)
5. Enter Password: "Test@123456"
6. Enter Confirm Password: "Test@123456"
7. Click "Register" button

**Expected Result**:
- Registration fails
- Error message: "Wrong email"
- Email field highlighted

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

#### **Test Case ID**: REG_MAN_008
**Test Title**: Registration with Short Password  
**Priority**: High  
**Test Type**: Validation Testing  

**Test Steps**:
1. Select gender: Female
2. Enter First Name: "Jane"
3. Enter Last Name: "Smith"
4. Enter Email: "short.password@test.com"
5. Enter Password: "12345" (5 characters)
6. Enter Confirm Password: "12345"
7. Click "Register" button

**Expected Result**:
- Registration fails
- Error message: "The password should have at least 6 characters"
- Password field highlighted

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

#### **Test Case ID**: REG_MAN_009
**Test Title**: Registration with Password Mismatch  
**Priority**: High  
**Test Type**: Validation Testing  

**Test Steps**:
1. Select gender: Male
2. Enter First Name: "John"
3. Enter Last Name: "Doe"
4. Enter Email: "password.mismatch@test.com"
5. Enter Password: "Test@123456"
6. Enter Confirm Password: "Different@123456"
7. Click "Register" button

**Expected Result**:
- Registration fails
- Error message: "The password and confirmation password do not match"
- Confirm password field highlighted

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

### **Test Category: Edge Cases**

#### **Test Case ID**: REG_MAN_010
**Test Title**: Registration with SQL Injection Attempt  
**Priority**: High  
**Test Type**: Security Testing  

**Test Steps**:
1. Select gender: Male
2. Enter First Name: "'; DROP TABLE users; --"
3. Enter Last Name: "Hacker"
4. Enter Email: "sql.injection@test.com"
5. Enter Password: "Test@123456"
6. Enter Confirm Password: "Test@123456"
7. Click "Register" button

**Expected Result**:
- Registration either fails with validation error or succeeds with sanitized input
- No database errors displayed
- Application remains stable

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

#### **Test Case ID**: REG_MAN_011
**Test Title**: Registration with XSS Attempt  
**Priority**: High  
**Test Type**: Security Testing  

**Test Steps**:
1. Select gender: Female
2. Enter First Name: "Jane"
3. Enter Last Name: "<script>alert('XSS')</script>"
4. Enter Email: "xss.attempt@test.com"
5. Enter Password: "Test@123456"
6. Enter Confirm Password: "Test@123456"
7. Click "Register" button

**Expected Result**:
- Script tags are sanitized or rejected
- No JavaScript execution occurs
- Validation error or sanitized input accepted

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

#### **Test Case ID**: REG_MAN_012
**Test Title**: Registration with Unicode Characters  
**Priority**: Medium  
**Test Type**: Internationalization Testing  

**Test Steps**:
1. Select gender: Male
2. Enter First Name: "José"
3. Enter Last Name: "Müller"
4. Enter Email: "unicode.name@test.com"
5. Enter Password: "Test@123456"
6. Enter Confirm Password: "Test@123456"
7. Click "Register" button

**Expected Result**:
- Registration successful with Unicode characters
- Names displayed correctly
- No encoding issues

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

### **Test Category: UI/UX Testing**

#### **Test Case ID**: REG_MAN_013
**Test Title**: Form Field Tab Navigation  
**Priority**: Medium  
**Test Type**: Usability Testing  

**Test Steps**:
1. Navigate to registration page
2. Click in browser address bar and press Tab
3. Continue pressing Tab to navigate through form fields
4. Verify tab order: Gender (Male) → Gender (Female) → First Name → Last Name → Email → Password → Confirm Password → Register Button

**Expected Result**:
- Tab navigation follows logical order
- All fields are accessible via keyboard
- Focus indicators are visible

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

#### **Test Case ID**: REG_MAN_014
**Test Title**: Password Field Masking  
**Priority**: Medium  
**Test Type**: Security/UI Testing  

**Test Steps**:
1. Navigate to registration page
2. Click on Password field
3. Type "TestPassword123"
4. Observe password display
5. Click on Confirm Password field
6. Type "TestPassword123"
7. Observe confirm password display

**Expected Result**:
- Password characters are masked (shown as dots or asterisks)
- Confirm password characters are masked
- Actual password not visible on screen

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

#### **Test Case ID**: REG_MAN_015
**Test Title**: Required Field Indicators  
**Priority**: Medium  
**Test Type**: UI Testing  

**Test Steps**:
1. Navigate to registration page
2. Observe all form fields
3. Check for asterisk (*) or other required field indicators

**Expected Result**:
- Required fields marked with asterisk (*)
- First Name, Last Name, Email, Password, Confirm Password should have indicators
- Gender field may or may not be required

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

### **Test Category: Cross-Browser Testing**

#### **Test Case ID**: REG_MAN_016
**Test Title**: Registration in Chrome Browser  
**Priority**: High  
**Test Type**: Compatibility Testing  

**Test Steps**:
1. Open Chrome browser
2. Navigate to registration page
3. Perform valid registration with test data
4. Verify all functionality works correctly

**Expected Result**:
- All form elements display correctly
- Registration process works smoothly
- No browser-specific issues

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

#### **Test Case ID**: REG_MAN_017
**Test Title**: Registration in Firefox Browser  
**Priority**: High  
**Test Type**: Compatibility Testing  

**Test Steps**:
1. Open Firefox browser
2. Navigate to registration page
3. Perform valid registration with test data
4. Verify all functionality works correctly

**Expected Result**:
- Consistent behavior across browsers
- All features work as expected

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

### **Test Category: Mobile Responsiveness**

#### **Test Case ID**: REG_MAN_018
**Test Title**: Registration on Mobile Device (Portrait)  
**Priority**: Medium  
**Test Type**: Responsive Testing  

**Test Steps**:
1. Open mobile browser or use browser dev tools
2. Set viewport to mobile size (375x667)
3. Navigate to registration page
4. Verify form layout and usability
5. Perform registration

**Expected Result**:
- Form adapts to mobile screen size
- All fields are accessible and usable
- Buttons are appropriately sized for touch
- No horizontal scrolling required

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

#### **Test Case ID**: REG_MAN_019
**Test Title**: Registration on Tablet Device  
**Priority**: Medium  
**Test Type**: Responsive Testing  

**Test Steps**:
1. Set viewport to tablet size (768x1024)
2. Navigate to registration page
3. Verify form layout and functionality
4. Perform registration

**Expected Result**:
- Form displays appropriately for tablet
- Good use of available screen space
- Touch-friendly interface

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

### **Test Category: Performance Testing**

#### **Test Case ID**: REG_MAN_020
**Test Title**: Registration Page Load Performance  
**Priority**: Medium  
**Test Type**: Performance Testing  

**Test Steps**:
1. Clear browser cache
2. Navigate to registration page
3. Measure page load time using browser dev tools
4. Record performance metrics

**Expected Result**:
- Page loads within 5 seconds
- All resources load successfully
- No performance bottlenecks

**Actual Result**: [To be filled during execution]  
**Status**: [Pass/Fail]  

---

## Test Execution Summary

| **Test Category** | **Total Tests** | **Passed** | **Failed** | **Blocked** | **Not Executed** |
|-------------------|-----------------|------------|------------|-------------|------------------|
| Positive Tests    | 4               | -          | -          | -           | -                |
| Negative Tests    | 5               | -          | -          | -           | -                |
| Edge Cases        | 3               | -          | -          | -           | -                |
| UI/UX Tests       | 3               | -          | -          | -           | -                |
| Cross-Browser     | 2               | -          | -          | -           | -                |
| Mobile Tests      | 2               | -          | -          | -           | -                |
| Performance       | 1               | -          | -          | -           | -                |
| **TOTAL**         | **20**          | **-**      | **-**      | **-**       | **-**            |

---

## Test Environment Details

**Test Environment**: QA/Staging  
**Application Version**: Current  
**Test Data**: registration.json  
**Browsers Tested**: Chrome, Firefox, Safari, Edge  
**Operating Systems**: Windows, macOS, Linux  
**Mobile Devices**: iOS Safari, Android Chrome  

---

## Defect Summary

| **Defect ID** | **Test Case** | **Severity** | **Priority** | **Status** | **Description** |
|---------------|---------------|--------------|--------------|------------|-----------------|
| -             | -             | -            | -            | -          | -               |

---

## Test Execution Notes

**Tester Name**: [To be filled]  
**Test Execution Date**: [To be filled]  
**Test Environment**: [To be filled]  
**Build Version**: [To be filled]  

**General Comments**:
[Add any general observations, issues, or recommendations]

---

## Approval

**Test Lead**: _________________ **Date**: _________  
**QA Manager**: _________________ **Date**: _________  
**Project Manager**: _________________ **Date**: _________