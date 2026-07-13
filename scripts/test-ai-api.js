/**
 * Test script for AI API endpoints
 * Run with: node scripts/test-ai-api.js
 */

const API_BASE_URL = 'https://univibesbackend.onrender.com/api/v1';

// Test data
const testToken = 'your-jwt-token-here'; // Replace with actual token

const testRequests = {
  courseChat: {
    message: 'Show me the course outline',
    courseId: 'CS101',
    context: {
      courseCode: 'CS101',
      courseName: 'Introduction to Programming',
      outline: [
        'Variables and Data Types',
        'Functions and Loops',
        'Object-Oriented Programming',
      ],
      assessment: [
        { type: 'Assignment', percentage: 30 },
        { type: 'Midterm Exam', percentage: 35 },
        { type: 'Final Exam', percentage: 35 },
      ],
      instructor: 'Dr. Smith',
      description: 'Foundational programming course',
    },
    conversationHistory: [],
    userMode: 'balanced',
  },

  generalChat: {
    message: 'How can I improve my study habits?',
    conversationHistory: [],
    userMode: 'balanced',
  },

  academicChat: {
    message: 'How is my academic performance this semester?',
    studentContext: {
      studentId: '12345',
      currentGPA: 3.2,
      enrolledCourses: ['CS101', 'MATH201', 'ENG102'],
      completedCourses: ['CS100', 'MATH101'],
      strugglingSubjects: ['Calculus', 'Data Structures'],
      studyHours: 15,
      activeForumPosts: 8,
    },
    conversationHistory: [],
    userMode: 'smart',
  },
};

async function makeRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_BASE_URL}${endpoint}`;

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${testToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`\n🚀 Testing ${method} ${endpoint}`);
    console.log('Request data:', data ? JSON.stringify(data, null, 2) : 'None');

    const response = await fetch(url, options);
    const result = await response.json();

    console.log(`✅ Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error(`❌ Error testing ${endpoint}:`, error.message);
    return null;
  }
}

async function testAllEndpoints() {
  console.log('🧪 Starting AI API Tests...');
  console.log('='.repeat(50));

  // Test Course Chat
  await makeRequest('/ai/chat/course', 'POST', testRequests.courseChat);

  // Test General Chat
  await makeRequest('/ai/chat/general', 'POST', testRequests.generalChat);

  // Test Academic Chat
  await makeRequest('/ai/chat/academic', 'POST', testRequests.academicChat);

  // Test Course Insights
  await makeRequest('/ai/insights/course/CS101', 'GET');

  // Test Personalized Recommendations
  await makeRequest('/ai/recommendations/course/CS101', 'POST', {
    studentData: {
      completedTopics: ['Variables', 'Functions', 'Basic Loops'],
      strugglingAreas: ['Nested Loops', 'Arrays', 'Object Methods'],
      studyHours: 15,
      lastAssignmentScore: 75,
      attendanceRate: 0.85,
      forumParticipation: 'moderate',
    },
  });

  // Test Chat Sessions
  await makeRequest('/ai/sessions', 'GET');

  console.log('\n🏁 AI API Tests Complete!');
}

// Helper function to test with different user modes
async function testUserModes() {
  console.log('\n🎯 Testing Different User Modes...');
  console.log('='.repeat(50));

  const modes = ['fast', 'balanced', 'smart'];

  for (const mode of modes) {
    const request = {
      ...testRequests.generalChat,
      userMode: mode,
      message: `Test message with ${mode} mode`,
    };

    await makeRequest('/ai/chat/general', 'POST', request);
  }
}

// Helper function to test error handling
async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...');
  console.log('='.repeat(50));

  // Test with invalid token
  const originalToken = testToken;
  global.testToken = 'invalid-token';

  await makeRequest('/ai/chat/general', 'POST', {
    message: 'This should fail with invalid token',
  });

  // Restore token
  global.testToken = originalToken;

  // Test with empty message
  await makeRequest('/ai/chat/general', 'POST', {
    message: '',
    userMode: 'balanced',
  });

  // Test with too long message
  await makeRequest('/ai/chat/general', 'POST', {
    message: 'x'.repeat(501), // Exceeds 500 character limit
    userMode: 'balanced',
  });
}

// Main execution
async function main() {
  if (testToken === 'your-jwt-token-here') {
    console.error('❌ Please set a valid JWT token in the testToken variable');
    process.exit(1);
  }

  await testAllEndpoints();
  await testUserModes();
  await testErrorHandling();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  makeRequest,
  testRequests,
  testAllEndpoints,
  testUserModes,
  testErrorHandling,
};
