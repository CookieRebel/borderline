# Backend Testing

This directory contains automated tests for the Borderline backend using **Vitest** and **PGLite** (In-Memory PostgreSQL).

## 🚀 Running Tests

### Fast & Isolated
All tests run against an in-memory database. You do **NOT** need to run the Netlify dev server or have a local Postgres instance running.

```bash
# Run all tests
npm test

# Run specific test file
npx vitest tests/users.test.ts
```

## 🛠️ Testing Strategy (PGLite)

We use `@electric-sql/pglite` to create a lightweight, in-memory PostgreSQL instance for **every single test case**. This ensures complete isolation.

### Key Utilities (`tests/test_utils.ts`)

- **`setupTestDb()`**: Creates a fresh PGLite instance, applies Drizzle migrations, and returns the client.
- **`dbHolder`**: A global holder used by the mocked `src/db` module to route queries to the current test's in-memory DB.

### Writing a New Test

1. **Import Setup**:
   ```typescript
   import { setupTestDb } from './test_utils';
   ```

2. **Setup in `beforeEach`**:
   ```typescript
   let client: any;
   beforeEach(async () => {
       const setup = await setupTestDb();
       client = setup.client;
       // Seed data here using regular db.insert() ...
   });
   
   afterEach(async () => {
       await client.close();
   });
   ```

3. **Write Tests**: 
   - Use `db` imported from `../src/db` (it is mocked automatically).
   - Use handlers imported from `../netlify/functions/...`.
   - **Do NOT use `fetch()`** to localhost. Call handlers directly.

## Test Coverage

| Test Suite | Focus |
| :--- | :--- |
| **`game_ranking.test.ts`** | Ranking logic (Best player, Top X%) |
| **`users.test.ts`** | User creation, admin flags |
| **`leaderboard.test.ts`** | End-to-end flow of stats and rendering |
| **`pick_target.test.ts`** | Target selection algorithms |
| **`streaks.test.ts`** | Timezone-aware streak logic |
| **`analytics.test.ts`** | Admin analytics endpoints |

## Configuration

- **`vitest.config.ts`**: Configures global setup file.
- **`tests/setup_vitest.ts`**: Handles the global `vi.mock` for the database module.
