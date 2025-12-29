---
description: Ensure compliance with project standards before asking for user review
---

1. **Read Project Memory**
   - Use `find_by_name` to locate `project_memory.md` in the artifacts or `.gemini` directory.
   - Use `view_file` to read it and load critical constraints (Timezones, Ports, Testing Standards) into context.

2. **Verify Backend Tests**
   - Run `npm test` in `backend/` workspace.
   - **Constraint**: All tests must pass. If any fail, fix them before proceeding.

3. **Verify Type Safety**
   - Run `tsc --noEmit` in `backend/` and `app/` to ensure no TypeScript errors.

4. **Verify Full Build**
   - Run `npm run build` in the root directory.
   - This ensures both `app` and `website` build correctly with the latest changes.

5. **Self-Correction**
   - If any step fails, do not proceed to `notify_user`.
   - analyze the error, fix the code, and re-run this workflow from the failing step.

6. **Final Check**
   - Confirm you have adhered to the "Timezone" rule (Australia/Melbourne) for any date/time logic.
   - Confirm you are using the correct ports (9999 for API, 5174 for Frontend).
