# API Tests

This directory contains automated API tests for the Borderline backend.

## Running Tests

### Prerequisites

1. The tests require the Netlify dev server to be running
2. Make sure your database is set up and accessible

### Steps

1. Start the Netlify dev server in one terminal:
   ```bash
   npm run netlify:dev
   ```

2. In a separate terminal, run the tests:
   ```bash
   npm test
   ```

   Or run with UI:
   ```bash
   npm run test:ui
   ```

## Test Coverage

### Analytics API (`analytics.test.ts`)

Tests for the `/api/analytics` endpoint:

- ✅ Authentication validation (missing user_id)
- ✅ Authorization (invalid user_id)
- ✅ Successful data retrieval for valid admin user
- ✅ Data structure validation (daily, weekly, monthly stats)
- ✅ Data type validation
- ✅ Value range validation (non-negative counts)
- ✅ Percentage change calculations
- ✅ CORS handling
- ✅ HTTP method validation

## Adding More Tests

To add tests for other API endpoints:

1. Create a new test file in the `tests/` directory (e.g., `user.test.ts`)
2. Follow the same pattern as `analytics.test.ts`
3. Import vitest testing utilities: `describe`, `it`, `expect`
4. Make sure the Netlify dev server is running before executing tests

## Configuration

Test configuration is in `vitest.config.ts`:
- Test timeout: 30 seconds (to allow for network requests)
- Environment: Node
- Test file pattern: `tests/**/*.test.ts`
