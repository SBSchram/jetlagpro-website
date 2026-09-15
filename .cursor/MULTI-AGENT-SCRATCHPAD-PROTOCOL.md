# Multi-Agent Scratchpad Protocol

**Last Updated:** 2025-11-25  
**Purpose:** Prevent conflicts when multiple Cursor agents work on different projects simultaneously

## Problem Statement

Multiple Cursor instances/agents may work on different projects:
- **JetLagPro Website** (jetlagpro-website repository)
- **HandyWorks Website** (handyworks-website repository)  
- **Other projects** (future)

All agents share the same `.cursor/scratchpad.md` file, which can lead to:
- One agent overwriting another's work
- Loss of context when scratchpad is restructured
- Confusion about which project is active

## Proposed Solution: Project-Sectioned Scratchpad

**Structure:** The scratchpad should be organized by PROJECT, with each project having its own section that agents can independently update.

### Recommended Scratchpad Structure:

```markdown
# Multi-Project Scratchpad

## 🔄 ACTIVE PROJECTS INDEX
- [JetLagPro Website](#jetlagpro-website) - Current status: Notification system complete
- [HandyWorks Website](#handyworks-website) - Current status: Billing system planning
- [Project 3](#project-3) - Current status: ...

---

## PROJECT: JetLagPro Website

### Current Task
[Agent working on JetLagPro updates this section]

### Status & Progress
[Agent working on JetLagPro updates this section]

### Project-Specific Notes
[Agent working on JetLagPro updates this section]

---

## PROJECT: HandyWorks Website

### Current Task
[Agent working on HandyWorks updates this section]

### Status & Progress
[Agent working on HandyWorks updates this section]

### Project-Specific Notes
[Agent working on HandyWorks updates this section]

---

## SHARED: Lessons Learned
[All agents can read, append-only updates]

## SHARED: Onboarding Guide
[All agents can read, append-only updates]
```

## Rules for Multi-Agent Access

### ✅ DO:
1. **Identify Your Project Section** - Only modify your project's section
2. **Append, Don't Replace** - Add new content rather than rewriting entire sections
3. **Read All Sections First** - Check if another agent is working before making changes
4. **Use Clear Headers** - Always use project name headers: `## PROJECT: [Project Name]`
5. **Timestamp Your Updates** - Add date stamps to major updates
6. **Preserve Other Projects** - Never delete or modify other project sections

### ❌ DON'T:
1. **Don't Restructure the Whole File** - Only modify your project's section
2. **Don't Delete Other Projects' Content** - Preserve all project sections
3. **Don't Overwrite History** - Append progress, don't replace entire status sections
4. **Don't Change Shared Sections Without Coordination** - Lessons/Onboarding are shared

## Implementation Strategy

### Phase 1: Restructure Current Scratchpad
1. Read current scratchpad
2. Identify all active projects
3. Create project-sectioned structure
4. Migrate existing content to appropriate project sections
5. Preserve all content (nothing deleted)

### Phase 2: Establish Protocol
1. Add this protocol document to `.cursor/` directory
2. Update scratchpad header with multi-project structure
3. Add clear project section headers
4. Document current active projects in index

### Phase 3: Verify No Conflicts
1. Check that all existing content is preserved
2. Verify project boundaries are clear
3. Ensure shared sections remain accessible

## Current Projects Identified

1. **JetLagPro Website** (jetlagpro-website)
   - Location: Current repository
   - Status: Notification system implementation complete
   - Agent Focus: Website features, Firebase integration

2. **HandyWorks Website** (handyworks-website)  
   - Location: Separate repository (`C:\Users\Steve\Documents\GitHub\handyworks-website`)
   - Status: Billing system modernization planning
   - Agent Focus: Billing system, user management

## Questions to Resolve

1. **Scratchpad Location:** Should each repository have its own scratchpad?
   - Option A: Single shared scratchpad with project sections (recommended)
   - Option B: Separate scratchpads per repository (`.cursor/scratchpad-jetlagpro.md`, `.cursor/scratchpad-handyworks.md`)

2. **Shared Content:** How should shared lessons/onboarding work?
   - Option A: Shared section in main scratchpad (recommended)
   - Option B: Separate shared file

3. **Archive Strategy:** Should completed projects be archived?
   - Option A: Move to archive when project complete
   - Option B: Keep active projects in main scratchpad, archive only very old content

## Recommended Approach

**Use Single Scratchpad with Project Sections** (Option A for all questions)

**Rationale:**
- All agents can see all projects (better coordination)
- Shared lessons benefit all agents
- Single source of truth
- Easy to see what's active across all projects
- Can archive completed sections without losing structure

**Next Steps:**
1. Restructure scratchpad with project sections
2. Preserve all existing content in appropriate sections
3. Add clear project boundaries
4. Document this protocol

---

**Status:** ⏳ **AWAITING USER APPROVAL BEFORE IMPLEMENTATION**

