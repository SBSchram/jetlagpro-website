// Load common navigation for all reviewer pages
// Auto-detects active page based on current URL
function loadReviewerNav() {
    try {
        // Get current page filename to determine active state
        const pathname = window.location.pathname;
        const currentPage = pathname.split('/').pop() || 'analysis.html';
        
        // Navigation items configuration
        const navItems = [
            { href: 'analysis.html', text: 'Data Analysis', id: 'analysis' },
            { href: 'audit-log.html', text: 'Audit Log', id: 'audit-log' },
            { href: 'verify.html', text: 'Verify', id: 'verify' },
            { href: '../research-paper.html', text: 'Research', id: 'research' }
        ];
        
        // Determine which page is active by matching filename
        let activeId = null;
        for (const item of navItems) {
            const itemFilename = item.href.split('/').pop();
            if (itemFilename === currentPage || 
                (item.id === 'analysis' && currentPage === '')) {
                activeId = item.id;
                break;
            }
        }
        
        // Build navigation HTML
        let navHTML = '<nav class="reviewer-nav">';
        
        navItems.forEach((item, index) => {
            const isActive = item.id === activeId;
            navHTML += `<a href="${item.href}"${isActive ? ' class="active"' : ''}>${item.text}</a>`;
            
            // Add separator between items (not after last item)
            if (index < navItems.length - 1) {
                navHTML += '<span>|</span>';
            }
        });
        
        navHTML += '</nav>';
        
        // Find the container (should be first .container div in body)
        const container = document.querySelector('.container');
        if (container) {
            // Insert navigation at the beginning of container
            container.insertAdjacentHTML('afterbegin', navHTML);
            console.log('✅ Reviewer navigation loaded successfully');
        } else {
            console.warn('⚠️ Container not found, navigation not inserted');
        }
    } catch (error) {
        console.error('❌ Failed to load reviewer navigation:', error);
    }
}

// Load navigation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadReviewerNav);
} else {
    loadReviewerNav();
}

