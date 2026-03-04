// Load common head elements for all JetLagPro pages (including reviewers section)
async function loadCommonHead() {
    try {
        // Use absolute path so it works from both root and reviewers/ subdirectory
        // Add a version query parameter for simple cache busting on deploy
        const response = await fetch('/head-template.html?v=20260304');
        const headContent = await response.text();
        
        // Insert the common head elements into the document head
        document.head.insertAdjacentHTML('beforeend', headContent);
        
        console.log('✅ Common head elements loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load common head elements:', error);
    }
}

// Load common head elements when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCommonHead);
} else {
    loadCommonHead();
}
