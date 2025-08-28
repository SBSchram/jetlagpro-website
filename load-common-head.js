// Load common head elements for all JetLagPro pages
async function loadCommonHead() {
    try {
        const response = await fetch('./head-template.html');
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
