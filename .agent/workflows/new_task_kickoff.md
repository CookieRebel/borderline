---
description: Standard procedure for starting a new coding task
---

1. **Read Project Memory**
   - **MANDATORY**: Use `find_by_name` to locate `project_memory.md` in the artifacts or `.gemini` directory.
   - Use `view_file` to read the entire content.
   - Load strict logical constraints (Timezones, Ports, Monorepo structure) into your context.

2. **Initialize Task Artifacts**
   - Create or update `task.md` with the new objective broken down into checklist items.
   - Create `implementation_plan.md` to map out the technical approach.

3. **Plan & Confirm**
   - Verify the plan aligns with `project_memory.md` constraints (e.g., "Are we using the correct port?", "Are we using Drizzle for DB?").
   - If the plan contradicts project memory, STOP and ask the user for clarification.
