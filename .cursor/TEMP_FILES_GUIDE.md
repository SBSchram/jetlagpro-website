# Temporary Work Files - Best Practices

## Problem
Temporary work files (drafts, inquiries, personal notes) can accidentally be committed to GitHub, making them public.

## Solution Implemented

### 1. Updated `.gitignore`
Added patterns to automatically ignore common temporary file patterns:
- `*_inquiry*.md` - Editorial inquiries, research inquiries, etc.
- `*_draft*.md` - Draft documents
- `*_temp*.md`, `*_scratch*.md` - Temporary files
- `*_personal*.md`, `*_private*.md` - Personal notes
- `*_work*.md`, `*_notes*.md` - Work files
- `_temp/`, `_scratch/`, `_drafts/`, `_work/` - Temporary directories

### 2. Recommended Workflow

#### Option A: Use a Dedicated Temp Directory (Recommended)
Create temporary files in a gitignored directory:
```
_scratch/
  ├── editorial_inquiry_draft.md
  ├── research_notes_temp.md
  └── personal_thoughts.md
```

#### Option B: Use Descriptive Naming
Name temporary files with patterns that match `.gitignore`:
- `editorial_inquiry_draft.md` ✅ (ignored)
- `research_notes_temp.md` ✅ (ignored)
- `personal_thoughts.md` ✅ (ignored)

#### Option C: Use `.cursor/scratchpad.md`
For AI-assisted work, use the scratchpad which is already gitignored:
- `.cursor/scratchpad.md` - Already ignored, perfect for temporary notes

### 3. Before Committing

**Always check what you're committing:**
```bash
git status
git diff  # Review changes
```

**If you accidentally commit a temporary file:**
1. Remove it from git (but keep locally): `git rm --cached filename.md`
2. Commit the removal: `git commit -m "Remove temporary file"`
3. Push: `git push`

### 4. Quick Checklist

Before committing, ask:
- [ ] Is this file meant to be permanent?
- [ ] Does it contain personal/sensitive information?
- [ ] Is it a draft or work-in-progress?
- [ ] Would I want this public on GitHub?

If any answer is "no" or "maybe", don't commit it!

## Files Protected
The following patterns are now automatically ignored:
- Editorial board inquiry files (removed, never committed)
- MPA article creation scripts (`create_mpa_article.py`, etc.)
- Any files matching the temporary work patterns above

## Files Removed
The following editorial board files were removed (they were never committed):
- `scripts/editorial_board_inquiry.md`
- `scripts/editorial_board_inquiry_final.md`
- `scripts/editorial_board_inquiry_v2.md`
- `scripts/editorial_board_inquiry_refined.md`
