# Simple Editing Workflow

## The Problem We Solved
- **Before**: Every change required markdown → HTML conversion
- **After**: Edit HTML directly, see changes immediately

## How to Make Changes

### 1. Start the Development Server
```bash
cd jetlagpro-website
./dev-server.sh
```
This automatically kills any existing server and starts a new one.

### 2. Edit Files Directly
- **Research Paper**: Edit `research-paper.html`
- **Survey**: Edit `survey.html`, `survey.css`, `survey.js`
- **Main Site**: Edit `index.html`, `styles.css`

### 3. See Changes Immediately
- Save the file
- Refresh browser (http://localhost:8000)
- Changes appear instantly

### 4. Commit When Satisfied
```bash
git add .
git commit -m "Description of changes"
git push
```

## File Structure (Simplified)
```
jetlagpro-website/
├── index.html (main page)
├── research-paper.html (research paper - EDIT THIS)
├── survey.html (survey)
├── styles.css (shared styles)
├── dev-server.sh (start development server)
└── assets/ (images, videos)
```

## What We Removed
- ❌ Markdown-to-HTML conversion
- ❌ Multiple file synchronization
- ❌ Complex editing process
- ❌ Port conflicts

## What We Gained
- ✅ Edit in final format (HTML)
- ✅ Instant preview
- ✅ Simple workflow
- ✅ No conversion needed
- ✅ One source of truth

## For Future Changes
1. Edit the HTML file directly
2. Save and refresh browser
3. Commit when done

That's it! 