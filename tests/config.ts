/**
 * Test configuration
 */
export const config = {
  // API Configuration
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000/api',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Test Credentials
  // ⚠️ IMPORTANT: Use TEST credentials only, never production credentials!
  adminCredentials: {
    registration_number: process.env.TEST_ADMIN_REG || 'testadmin001',
    password: process.env.TEST_ADMIN_PASS || 'TestAdmin123!',
  },
  studentCredentials: {
    registration_number: process.env.TEST_STUDENT_REG || 'teststudent001',
    password: process.env.TEST_STUDENT_PASS || 'TestStudent123!',
  },
  
  // Test Data
  testTermId: parseInt(process.env.TEST_TERM_ID || '1'),
  testSystemType: process.env.TEST_SYSTEM_TYPE || '140',
  
  // Timeouts
  defaultTimeout: 30000,
  apiTimeout: 10000,
  
  // Rate Limiting
  rateLimitWindow: 60000, // 1 minute
  rateLimitMaxRequests: 100,
  
  // Performance
  concurrentUsers: 50,
  loadTestDuration: 300, // 5 minutes
};
