# API Testing Scripts

This directory contains scripts to test the UniVibe API endpoints.

## Scripts

### 1. `test-api.js` - Basic API Test

Tests all endpoints with optional authentication.

```bash
# Test without authentication
node scripts/test-api.js

# Test with authentication token
TEST_TOKEN=your-jwt-token node scripts/test-api.js
```

### 2. `test-api-auth.js` - Comprehensive Authentication Test

Tests endpoints with different authentication scenarios.

```bash
# Run comprehensive tests
TEST_TOKEN=your-jwt-token node scripts/test-api-auth.js
```

## Environment Variables

- `TEST_TOKEN`: JWT token for authenticated requests
- `EXPO_PUBLIC_API_URL`: API base URL (defaults to production)

## Expected Results

### Public Endpoints

- ✅ Health check should work without authentication

### Protected Endpoints (require authentication)

- 🔒 Guides, Courses, Forum should return 401 without auth
- ✅ Should work with valid JWT token

## Authentication

Most endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer your-jwt-token
```

## API Base URL

Default: `https://univibesbackend.onrender.com/api/v1`

## Troubleshooting

1. **401 Unauthorized**: Endpoint requires authentication
2. **403 Forbidden**: Token is invalid or expired
3. **404 Not Found**: Endpoint doesn't exist
4. **Network Error**: Check internet connection and API URL
