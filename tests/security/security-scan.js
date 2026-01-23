#!/usr/bin/env node

/**
 * Security Scan Script
 * Checks for common security issues
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const config = {
  apiUrl: process.env.API_BASE_URL || 'http://localhost:5000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

const results = {
  passed: [],
  failed: [],
  warnings: [],
};

/**
 * Check security headers
 */
async function checkSecurityHeaders(url) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    client.get(url, (res) => {
      const headers = res.headers;
      const checks = [
        {
          name: 'Content-Security-Policy',
          header: 'content-security-policy',
          required: true,
        },
        {
          name: 'X-Content-Type-Options',
          header: 'x-content-type-options',
          required: true,
          expected: 'nosniff',
        },
        {
          name: 'X-Frame-Options',
          header: 'x-frame-options',
          required: true,
          expected: 'DENY',
        },
        {
          name: 'X-XSS-Protection',
          header: 'x-xss-protection',
          required: true,
        },
        {
          name: 'Strict-Transport-Security',
          header: 'strict-transport-security',
          required: parsedUrl.protocol === 'https:',
        },
      ];

      checks.forEach((check) => {
        const value = headers[check.header];
        if (check.required) {
          if (value) {
            if (check.expected && value.toLowerCase().includes(check.expected.toLowerCase())) {
              results.passed.push(`✓ ${check.name} header present and correct`);
            } else if (!check.expected) {
              results.passed.push(`✓ ${check.name} header present`);
            } else {
              results.failed.push(`✗ ${check.name} header incorrect: ${value}`);
            }
          } else {
            results.failed.push(`✗ ${check.name} header missing`);
          }
        } else if (value) {
          results.passed.push(`✓ ${check.name} header present (optional)`);
        }
      });

      resolve();
    }).on('error', (err) => {
      results.warnings.push(`⚠ Could not check headers: ${err.message}`);
      resolve();
    });
  });
}

/**
 * Check CORS configuration
 */
async function checkCORS(url) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://evil.com',
        'Access-Control-Request-Method': 'POST',
      },
    };

    const req = client.request(options, (res) => {
      const corsHeader = res.headers['access-control-allow-origin'];
      if (corsHeader === 'https://evil.com') {
        results.failed.push('✗ CORS allows unauthorized origin');
      } else if (!corsHeader || corsHeader === '*') {
        results.warnings.push('⚠ CORS configuration may be too permissive');
      } else {
        results.passed.push('✓ CORS properly configured');
      }
      resolve();
    });

    req.on('error', () => {
      results.warnings.push('⚠ Could not check CORS');
      resolve();
    });

    req.end();
  });
}

/**
 * Main scan function
 */
async function runSecurityScan() {
  console.log('🔒 Running Security Scan...\n');

  console.log('Checking Security Headers...');
  await checkSecurityHeaders(config.frontendUrl);
  await checkSecurityHeaders(config.apiUrl);

  console.log('Checking CORS Configuration...');
  await checkCORS(`${config.apiUrl}/api/terms`);

  // Print results
  console.log('\n📊 Security Scan Results:\n');

  if (results.passed.length > 0) {
    console.log('✅ Passed Checks:');
    results.passed.forEach((result) => console.log(`  ${result}`));
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    results.warnings.forEach((result) => console.log(`  ${result}`));
    console.log('');
  }

  if (results.failed.length > 0) {
    console.log('❌ Failed Checks:');
    results.failed.forEach((result) => console.log(`  ${result}`));
    console.log('');
    process.exit(1);
  } else {
    console.log('✅ All security checks passed!\n');
    process.exit(0);
  }
}

// Run scan
runSecurityScan().catch((err) => {
  console.error('Error running security scan:', err);
  process.exit(1);
});
