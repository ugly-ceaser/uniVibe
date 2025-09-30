// Comprehensive API test script with authentication
const fetch = require('node-fetch');

const BASE_URL = 'https://univibesbackend.onrender.com/api/v1';

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Public Endpoints (No Auth)',
    endpoints: [
      { name: 'Health', url: BASE_URL.replace('/api/v1', '/health') },
    ],
    headers: { 'Content-Type': 'application/json' },
  },
  {
    name: 'Protected Endpoints (With Auth)',
    endpoints: [
      { name: 'Guides', url: `${BASE_URL}/guide` },
      { name: 'Courses', url: `${BASE_URL}/courses` },
      { name: 'Forum', url: `${BASE_URL}/forum/questions?page=1&pageSize=10` },
    ],
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TEST_TOKEN || 'your-test-token-here'}`,
    },
  },
  {
    name: 'Protected Endpoints (No Auth) - Should Fail',
    endpoints: [
      { name: 'Guides (No Auth)', url: `${BASE_URL}/guide` },
      { name: 'Courses (No Auth)', url: `${BASE_URL}/courses` },
    ],
    headers: { 'Content-Type': 'application/json' },
    expectFailure: true,
  },
];

async function testEndpoint(endpoint, headers, expectFailure = false) {
  try {
    console.log(`\n🔍 Testing ${endpoint.name}: ${endpoint.url}`);
    console.log(`🔐 Headers:`, Object.keys(headers));

    const response = await fetch(endpoint.url, {
      method: 'GET',
      headers,
    });

    const status = response.status;
    const statusText = response.statusText;

    if (expectFailure) {
      if (status === 401 || status === 403) {
        console.log(
          `✅ ${endpoint.name}: ${status} ${statusText} (Expected auth failure)`
        );
        return { success: true, status, expected: true };
      } else {
        console.log(
          `⚠️ ${endpoint.name}: ${status} ${statusText} (Unexpected success)`
        );
        return { success: false, status, expected: false };
      }
    } else {
      if (response.ok) {
        console.log(`✅ ${endpoint.name}: ${status} ${statusText}`);

        try {
          const data = await response.json();
          console.log(`📊 Data:`, {
            hasData: !!data?.data,
            dataLength: data?.data?.length,
            keys: Object.keys(data || {}),
          });
          return { success: true, status, data };
        } catch (parseError) {
          console.log(`⚠️ ${endpoint.name}: Response not JSON`);
          return { success: true, status, data: null };
        }
      } else {
        console.log(`❌ ${endpoint.name}: ${status} ${statusText}`);

        if (status === 401) {
          console.log('🔒 Authentication required');
        } else if (status === 403) {
          console.log('🚫 Access forbidden');
        } else if (status === 404) {
          console.log('🔍 Endpoint not found');
        }

        return { success: false, status, error: statusText };
      }
    }
  } catch (error) {
    console.error(`💥 ${endpoint.name} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testAPI() {
  console.log('🧪 Testing API endpoints with authentication...');
  console.log('Base URL:', BASE_URL);
  console.log(
    'Test Token:',
    process.env.TEST_TOKEN ? 'Provided' : 'Not provided'
  );

  const results = {};

  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📋 ${scenario.name}`);
    console.log('='.repeat(50));

    results[scenario.name] = {};

    for (const endpoint of scenario.endpoints) {
      const result = await testEndpoint(
        endpoint,
        scenario.headers,
        scenario.expectFailure
      );
      results[scenario.name][endpoint.name] = result;
    }
  }

  // Summary
  console.log('\n📊 Test Summary');
  console.log('='.repeat(50));

  for (const [scenarioName, scenarioResults] of Object.entries(results)) {
    console.log(`\n${scenarioName}:`);
    for (const [endpointName, result] of Object.entries(scenarioResults)) {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${endpointName}: ${result.status || 'Error'}`);
    }
  }

  return results;
}

testAPI().catch(console.error);
