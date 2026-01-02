# Project Knowledge & Decision Log

# Workflow Guidelines
- **Implementation Plan**: Always provide an implementation plan and ask the user for permission to execute.
- **KISS Principle**: Work strictly according to the KISS principle: Keep it simple, stupid! Make sure your solution is the most straightforward method of solving the problem.

## Mandatory Workflows

### 1. Start of Task (Kickoff)
1. **Read Project Memory**
   - **MANDATORY**: Read this file (`project_memory.md`) completely.
   - Load strict logical constraints (Timezones, Ports, Monorepo structure) into your context.
2. **Initialize Task Artifacts**
   - Create or update `task.md` with the new objective broken down into checklist items.
   - Create `implementation_plan.md` to map out the technical approach.
3. **Plan & Confirm**
   - Verify the plan aligns with `project_memory.md` constraints.
   - If the plan contradicts project memory, STOP and ask the user for clarification.

### 2. End of Task (Pre-Commit Check)
1. **Read Project Memory**
   - Re-read this file to ensure no constraints were violated during implementation.
2. **Verify Backend Tests**
   - Run `npm test` in the root directory.
   - **Constraint**: All tests must pass.
3. **Verify Type Safety**
   - Run `tsc --noEmit` in `backend/` and `app/`.
4. **Verify Full Build**
   - Run `npm run build` in the root directory (ensures app and website build).
5. **Self-Correction**
   - If any step fails, fix the code and re-run. DO NOT notify user until passing.

### Pre Commit Command Summary
> Execute these commands to ensure the project is healthy before asking for review:
- **Build Project**: `npm run build` (Ensures whole project builds)
- **Run Backend Tests**: `npm test` (Runs backend tests via workspace alias)

# Architecture
- **Monorepo**:
  - `app`: Frontend (Vite + React), Port 5174.
  - `backend`: Backend (Netlify Functions + Drizzle/Postgres), Port 9999.
  - `website`: Marketing Site (Eleventy), Port 8080.
- **Proxy**: `app` proxies `/api` requests to `localhost:9999` (backend).
- **Timezone**: All analytics and metrics assume **Australia/Melbourne** timezone.

# Coding Standards
- **Language**: TypeScript.
- **Documentation**: Always put comments to explain each function.
- **Dependencies**: Do **NOT** add new dependencies unless given explicit permission.
- **Naming & Structure**:
  - **Interfaces**: Put in separate files. Start names with `I` (e.g., `IGameResults`).
  - **Props**: Define in the **same file** as the component. Always call the interface `IProps`.
  - **Variables and Properties**: MUST be `camelCase` (e.g., `displayName`, `userId`, `totalScore`), NOT `snake_case`.
    - **Database vs API**: Database columns are `snake_case` (e.g., `display_name`), but the API layer and Frontend MUST map these to `camelCase`.
    - **No Fallbacks**: Do NOT use fallback logic like `userData.displayName || userData.display_name`. Ensure the API returns the correct format.
  - **API Responses**: All JSON keys MUST be `camelCase`.

# Frontend

## Frontend Guidelines
- **Styling**:
  - Use **CSS Modules** for custom styles.
  - Use **Bootstrap** classes for layout and standard styling.
  - **Map Rendering**: D3-geo with Orthographic projection. Dynamic detail based on zoom (LOD swap for neighbors).
  - **Target Exclusion**: Filtered non-sovereign entities (glaciers, bases) from target list.
  - **Geometry Updates**: Manually patched high-res geometry for VAT, GIB, CPP using OpenStreetMap Relations (Land Only).
  - **Map Patching**: Used `patch_replace_geometry.js` strategy to swap geometries.
  - **Zoom Constraint**: Limit zoom to prevent clipping.
  - **Line Width**: Dynamic line width based on zoom level.
- **Components**:
  - Always use **ReactStrap** components when suitable.
  - Use modular design to structure components.
  - **Ordering**:
    1. State variables
    2. Hook methods
    3. Normal methods
- **Icons**: Use **react-feather** where possible.

## Critical Decisions (Frontend)
- **Known Issues**: Sint Maarten / Saint Martin high-res geometry is complex due to close borders; kept low-res for stability.

# Backend

## Database and Migrations
- **Tooling**: Drizzle ORM + Drizzle Kit.
- **Workflow**:
  1. **Generate**: Use `drizzle-kit generate` to create migration files.
  2. **Migrate Dev**: User runs `npm run db:migrate` to migrate dev server.
  3. **Migrate Prod**: User runs `npm run db:migrate:prod` to migrate prod server.
- **Policy**: All database changes *must* be performed using Drizzle.

## Testing Standards
- **Scope**: Always write comprehensive API tests for both positive and negative test cases.
- **Coverage**: Make sure to cover **ALL** positive test scenarios.
- **In-Memory Database**: All backend tests **must** use the PGLite in-memory database strategy (via `setupTestDb`). Tests must be independent and seed their own data.
- **CI/Gate**: All API tests *must* pass before committing.
- **Build**: Run `npm run build` to ensure the project builds without failure before committing.

## Critical Decisions (Backend)
- **Timestamps**: All timestamps (`createdAt`, `startedAt`, etc.) must be `timestamp with time zone` (`timestamptz`) to handle server/client drift correctly.
- **API Port**: Netlify Functions server runs on **9999** (separately from Vite).
- **Environment Variables**:
  - **Single Source**: Root `.env` is the source of truth for Dev.
  - `drizzle.config.ts` and `vitest.config.ts` in `backend/` are explicitly configured to load from `../.env`.
