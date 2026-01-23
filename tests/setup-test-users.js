#!/usr/bin/env node

/**
 * Setup Test Users Script
 * Creates test users for automated testing
 */

const axios = require('axios');

const API_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

const testUsers = [
  {
    registration_number: 'testadmin001',
    password: 'TestAdmin123!',
    full_name: 'Test Admin User',
    role: 'admin',
  },
  {
    registration_number: 'teststudent001',
    password: 'TestStudent123!',
    full_name: 'Test Student User',
    role: 'student',
  },
];

async function createTestUser(user) {
  try {
    console.log(`Creating ${user.role} user: ${user.registration_number}...`);
    
    const response = await axios.post(`${API_URL}/auth/register`, {
      registration_number: user.registration_number,
      password: user.password,
      full_name: user.full_name,
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`✅ ${user.role} user created successfully`);
      return true;
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
      console.log(`⚠️  ${user.role} user already exists (skipping)`);
      return true;
    } else {
      console.error(`❌ Error creating ${user.role} user:`, error.response?.data?.message || error.message);
      return false;
    }
  }
}

async function verifyTestUser(user) {
  try {
    console.log(`Verifying ${user.role} user: ${user.registration_number}...`);
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      registration_number: user.registration_number,
      password: user.password,
    });

    if (response.status === 200) {
      console.log(`✅ ${user.role} user verified (can login)`);
      return true;
    }
  } catch (error) {
    console.error(`❌ ${user.role} user verification failed:`, error.response?.data?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Setting up test users...\n');
  console.log(`API URL: ${API_URL}\n`);

  // Check if backend is running
  try {
    await axios.get(`${API_URL.replace('/api', '')}/health`);
    console.log('✅ Backend server is running\n');
  } catch (error) {
    console.error('❌ Backend server is not running!');
    console.error('Please start the backend server first: cd backend && npm start\n');
    process.exit(1);
  }

  let allCreated = true;
  let allVerified = true;

  // Create users
  for (const user of testUsers) {
    const created = await createTestUser(user);
    if (!created) allCreated = false;
  }

  console.log('');

  // Verify users
  for (const user of testUsers) {
    const verified = await verifyTestUser(user);
    if (!verified) allVerified = false;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (allCreated && allVerified) {
    console.log('✅ All test users set up successfully!\n');
    console.log('You can now run tests:');
    console.log('  cd tests && npm test\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some test users may need manual setup\n');
    console.log('See SETUP_TEST_USERS.md for manual setup instructions\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
