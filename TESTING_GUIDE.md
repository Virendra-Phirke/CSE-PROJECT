# 🧪 MCQ Portal - Testing Guide

## Complete Testing Checklist

### 🔐 Authentication Testing

#### Sign Up Flow
- [ ] **Teacher Sign Up**
  1. Go to `/login`
  2. Select "Teacher" role
  3. Click "Sign Up"
  4. Fill in email and password
  5. Verify email if required
  6. Should redirect to teacher dashboard

- [ ] **Student Sign Up**
  1. Go to `/login`
  2. Select "Student" role
  3. Click "Sign Up"
  4. Fill in email and password
  5. Should redirect to student dashboard

#### Sign In Flow
- [ ] **Existing User Sign In**
  1. Use existing credentials
  2. Should redirect to appropriate dashboard
  3. Role should be preserved

#### Role Setup
- [ ] **First-time User**
  1. Sign up without selecting role
  2. Should redirect to role setup page
  3. Select role and continue
  4. Should redirect to appropriate dashboard

### 👨‍🏫 Teacher Features Testing

#### Test Creation
- [ ] **Create New Test**
  1. Go to teacher dashboard
  2. Click "Create Test"
  3. Fill in test details:
     - Title: "Sample Math Test"
     - Description: "Basic arithmetic test"
     - Duration: 30 minutes
     - Start/End dates
  4. Add questions:
     - Question 1: "What is 2 + 2?"
     - Options: ["3", "4", "5", "6"]
     - Correct answer: "4"
  5. Save test
  6. Should redirect to dashboard
  7. Test should appear in "My Tests"

#### Test Management
- [ ] **Edit Test**
  1. Click edit button on existing test
  2. Modify title or questions
  3. Save changes
  4. Verify changes are reflected

- [ ] **Toggle Test Status**
  1. Click eye icon to deactivate test
  2. Verify status changes to "Inactive"
  3. Click eye icon again to reactivate
  4. Verify status changes to "Active"

- [ ] **Delete Test**
  1. Click delete button
  2. Confirm deletion
  3. Test should be removed from list

- [ ] **Copy Test Link**
  1. Click share button
  2. Link should be copied to clipboard
  3. Toast notification should appear
  4. Link should be in format: `domain.com/test/[test-id]`

#### Analytics
- [ ] **View Statistics**
  1. Check dashboard statistics update
  2. Verify test count
  3. Check average scores
  4. View recent submissions

### 👨‍🎓 Student Features Testing

#### Test Taking
- [ ] **Access Test via Link**
  1. Use copied test link from teacher
  2. Should show test introduction page
  3. Click "Start Test"
  4. Timer should start counting down

- [ ] **Navigate Questions**
  1. Answer first question
  2. Click "Next" to go to next question
  3. Click "Previous" to go back
  4. Use question palette to jump to specific questions
  5. Flag questions for review

- [ ] **Submit Test**
  1. Answer all questions
  2. Click "Submit Test"
  3. Confirm submission
  4. Should see confetti animation
  5. Should redirect to results page

#### Results Viewing
- [ ] **View Results**
  1. Check score percentage
  2. View correct/incorrect answers
  3. See time taken
  4. Check ranking among other students

#### Dashboard
- [ ] **Student Dashboard**
  1. View available tests
  2. Check completed tests
  3. View statistics (tests completed, average score, best score)
  4. Access recent results

### 🔄 Cross-User Testing

#### Teacher-Student Workflow
- [ ] **Complete Workflow**
  1. **As Teacher:**
     - Create a test with 3-5 questions
     - Set it as active
     - Copy the test link
  
  2. **As Student:**
     - Access the test link
     - Complete the test
     - Submit answers
     - View results
  
  3. **As Teacher:**
     - Check dashboard for new submission
     - Verify statistics updated
     - View student results

### 🌐 Browser Testing

#### Cross-Browser Compatibility
- [ ] **Chrome** - Test all features
- [ ] **Firefox** - Test all features  
- [ ] **Safari** - Test all features
- [ ] **Edge** - Test all features

#### Mobile Testing
- [ ] **Mobile Chrome** - Test responsive design
- [ ] **Mobile Safari** - Test touch interactions
- [ ] **Tablet** - Test medium screen layouts

### 🔧 Error Handling Testing

#### Network Issues
- [ ] **Offline Testing**
  1. Disconnect internet during test
  2. Try to submit - should show error
  3. Reconnect - should allow retry

#### Invalid Data
- [ ] **Form Validation**
  1. Try to create test with empty title
  2. Try to submit test without answering questions
  3. Verify error messages appear

#### Authentication Errors
- [ ] **Session Expiry**
  1. Let session expire
  2. Try to perform actions
  3. Should redirect to login

### 📱 UI/UX Testing

#### Visual Testing
- [ ] **Dark/Light Theme**
  1. Toggle theme switcher
  2. Verify all components adapt
  3. Check readability

#### Accessibility
- [ ] **Keyboard Navigation**
  1. Tab through all interactive elements
  2. Use Enter/Space to activate buttons
  3. Use arrow keys in question navigation

- [ ] **Screen Reader**
  1. Test with screen reader
  2. Verify ARIA labels
  3. Check heading structure

### 🚀 Performance Testing

#### Load Testing
- [ ] **Multiple Users**
  1. Have multiple students take same test
  2. Verify no conflicts
  3. Check real-time updates

#### Speed Testing
- [ ] **Page Load Times**
  1. Measure dashboard load time
  2. Check test loading speed
  3. Verify image/asset loading

### 🔍 Database Testing

#### Data Persistence
- [ ] **Data Integrity**
  1. Create test, refresh page - should persist
  2. Submit answers, check database
  3. Verify relationships between tables

#### Real-time Updates
- [ ] **Live Updates**
  1. Teacher creates test
  2. Student should see it immediately
  3. Student submits - teacher should see update

### 🐛 Bug Testing Scenarios

#### Edge Cases
- [ ] **Simultaneous Actions**
  1. Multiple teachers creating tests
  2. Multiple students submitting at once
  3. Editing test while student is taking it

- [ ] **Boundary Testing**
  1. Very long test titles
  2. Tests with 1 question vs 50 questions
  3. Very short vs very long durations

#### Error Recovery
- [ ] **Recovery Testing**
  1. Force close browser during test
  2. Reopen - should resume or show appropriate state
  3. Network interruption during submission

### ✅ Final Verification

#### Production Readiness
- [ ] All authentication flows work
- [ ] All CRUD operations function
- [ ] Real-time updates working
- [ ] Error handling graceful
- [ ] Mobile responsive
- [ ] Performance acceptable
- [ ] Security measures in place

#### User Experience
- [ ] Intuitive navigation
- [ ] Clear feedback messages
- [ ] Consistent design
- [ ] Fast loading times
- [ ] Accessible to all users

## Test Data Suggestions

### Sample Test Content
```
Test Title: "JavaScript Fundamentals"
Description: "Test your knowledge of basic JavaScript concepts"
Duration: 45 minutes

Questions:
1. What is the correct way to declare a variable in JavaScript?
   a) var myVar;
   b) variable myVar;
   c) v myVar;
   d) declare myVar;
   Answer: a

2. Which method is used to add an element to the end of an array?
   a) push()
   b) pop()
   c) shift()
   d) unshift()
   Answer: a

3. What does '===' operator do in JavaScript?
   a) Assignment
   b) Loose equality
   c) Strict equality
   d) Not equal
   Answer: c
```

## Automated Testing

For future development, consider adding:
- Unit tests with Jest/Vitest
- Integration tests with Testing Library
- E2E tests with Playwright/Cypress
- Visual regression tests

## Reporting Issues

When reporting bugs, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Browser and device info
4. Screenshots/videos if applicable
5. Console errors
6. Network requests (if relevant)

Happy Testing! 🎉