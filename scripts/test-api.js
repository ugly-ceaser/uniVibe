// Simple API test script
const fetch = require('node-fetch');

const BASE_URL = 'https://univibesbackend.onrender.com/api/v1';

// Test with and without authentication
const TEST_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwYTQxNWI0Ni05ZWM1LTQ4MzctYmExYy03NTg5MDcxMjY1ODQiLCJyb2xlIjoiU1RVREVOVCIsImRlcGFydG1lbnQiOiJTb2Z0d2FyZSBFbmdpbmVlcmluZyIsImxldmVsIjoxMDAsImlhdCI6MTc1OTIwNjQxN30.byQSUs_iqDjIx8RUgGxgERWkET6NKWMTkpEuucWGmMI';

async function testAPI() {
  console.log('🧪 Testing API endpoints...');
  console.log('Base URL:', BASE_URL);
  console.log('Using test token:', TEST_TOKEN ? 'Yes' : 'No');

  const endpoints = [
    {
      name: 'Health',
      url: BASE_URL.replace('/api/v1', '/health'),
      requiresAuth: false,
    },
    {
      name: 'Guides',
      url: `${BASE_URL}/guide`,
      requiresAuth: true,
    },
    {
      name: 'Courses',
      url: `${BASE_URL}/courses`,
      requiresAuth: true,
    },
    {
      name: 'Forum',
      url: `${BASE_URL}/forum/questions?page=1&pageSize=10`,
      requiresAuth: true,
    },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing ${endpoint.name}: ${endpoint.url}`);
      console.log(`🔐 Requires Auth: ${endpoint.requiresAuth ? 'Yes' : 'No'}`);

      const headers = {
        'Content-Type': 'application/json',
      };

      // Add authentication header if required
      if (endpoint.requiresAuth && TEST_TOKEN) {
        headers['Authorization'] = `Bearer ${TEST_TOKEN}`;
        console.log('🔑 Using authentication token');
      }

      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers,
      });

      console.log(
        `✅ ${endpoint.name}: ${response.status} ${response.statusText}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Data:`, {
          hasData: !!data?.data,
          dataLength: data?.data?.length,
          keys: Object.keys(data || {}),
        });
      } else if (response.status === 401) {
        console.log(
          '🔒 Authentication required - this is expected for protected endpoints'
        );
      } else if (response.status === 403) {
        console.log('🚫 Access forbidden - check your token permissions');
      }
    } catch (error) {
      console.error(`❌ ${endpoint.name} failed:`, error.message);
    }
  }
}

testAPI().catch(console.error);
