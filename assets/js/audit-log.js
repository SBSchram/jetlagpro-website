/**
 * AUDIT LOG VIEWER
 * Displays complete tamper-detection trail for research data integrity
 */

let auditLogData = [];
let filteredData = [];

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🔍 Initializing Audit Log Viewer...');
    await loadAuditLog();
});

/**
 * Load audit log from Firestore
 */
async function loadAuditLog() {
    try {
        // Wait for Firebase to initialize
        if (typeof window.firebaseDB === 'undefined') {
            console.log('⏳ Waiting for Firebase initialization...');
            setTimeout(loadAuditLog, 500);
            return;
        }

        console.log('📥 Fetching audit log from Firestore...');
        
        const auditCollection = window.firebaseCollection(window.firebaseDB, 'auditLog');
        const q = window.firebaseQuery(
            auditCollection,
            window.firebaseOrderBy('timestamp', 'desc'),
            window.firebaseLimit(1000) // Last 1000 entries
        );
        
        const snapshot = await window.firebaseGetDocs(q);
        
        auditLogData = [];
        snapshot.forEach((doc) => {
            auditLogData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`✅ Loaded ${auditLogData.length} audit entries`);
        
        // Apply initial filters (show all)
        filteredData = [...auditLogData];
        renderAuditLog();
        updateStats();
        
    } catch (error) {
        console.error('❌ Error loading audit log:', error);
        document.getElementById('auditLog').innerHTML = `
            <div class="empty-state">
                <h3>⚠️ Error Loading Audit Log</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Apply filters to audit log
 */
function applyFilters() {
    const operationFilter = document.getElementById('operationFilter').value;
    const severityFilter = document.getElementById('severityFilter').value;
    const tripIdSearch = document.getElementById('tripIdSearch').value.trim().toLowerCase();
    const dateRange = document.getElementById('dateRange').value;
    
    filteredData = auditLogData.filter(entry => {
        // Operation filter
        if (operationFilter !== 'all' && entry.operation !== operationFilter) {
            return false;
        }
        
        // Severity filter
        if (severityFilter !== 'all' && entry.severity !== severityFilter) {
            return false;
        }
        
        // Trip ID search
        if (tripIdSearch && !entry.tripId?.toLowerCase().includes(tripIdSearch)) {
            return false;
        }
        
        // Date range filter
        if (dateRange !== 'all') {
            const entryDate = entry.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
            const now = new Date();
            const daysDiff = (now - entryDate) / (1000 * 60 * 60 * 24);
            
            if (dateRange === 'today' && daysDiff > 1) return false;
            if (dateRange === 'week' && daysDiff > 7) return false;
            if (dateRange === 'month' && daysDiff > 30) return false;
        }
        
        return true;
    });
    
    console.log(`🔍 Filters applied: ${filteredData.length} of ${auditLogData.length} entries shown`);
    renderAuditLog();
    updateStats();
}

/**
 * Reset all filters
 */
function resetFilters() {
    document.getElementById('operationFilter').value = 'all';
    document.getElementById('severityFilter').value = 'all';
    document.getElementById('tripIdSearch').value = '';
    document.getElementById('dateRange').value = 'all';
    
    filteredData = [...auditLogData];
    renderAuditLog();
    updateStats();
}

/**
 * Render audit log timeline
 */
function renderAuditLog() {
    const container = document.getElementById('auditLog');
    
    if (filteredData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>📭 No Audit Entries Found</h3>
                <p>Try adjusting your filters or check back later.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredData.map(entry => renderAuditEntry(entry)).join('');
}

/**
 * Render individual audit entry
 */
function renderAuditEntry(entry) {
    const timestamp = entry.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
    const formattedTime = timestamp.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    });
    
    const operationClass = entry.operation || 'VALIDATION';
    const severityClass = entry.severity || 'INFO';
    
    // Build metadata display
    const metadata = [];
    if (entry.tripId) metadata.push(`<div class="audit-field"><strong>Trip ID:</strong> ${entry.tripId}</div>`);
    if (entry.operation) metadata.push(`<div class="audit-field"><strong>Operation:</strong> ${entry.operation}</div>`);
    if (entry.source) metadata.push(`<div class="audit-field"><strong>Source:</strong> ${entry.source}</div>`);
    if (entry.actor) metadata.push(`<div class="audit-field"><strong>Actor:</strong> ${entry.actor}</div>`);
    
    // Build changes display (for UPDATE operations)
    let changesHtml = '';
    if (entry.operation === 'UPDATE' && entry.changedFields && entry.changedFields.length > 0) {
        changesHtml = `
            <div class="audit-changes">
                <h4>📝 Changed Fields (${entry.changedFields.length}):</h4>
                <div class="change-list">
                    ${entry.changedFields.map(change => `
                        <div class="change-item">
                            <span class="field-name">${escapeHtml(change)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Build validation issues display (for VALIDATION operations)
    if (entry.operation === 'VALIDATION' && entry.issues && entry.issues.length > 0) {
        changesHtml = `
            <div class="audit-changes">
                <h4>⚠️ Validation Issues (${entry.issues.length}):</h4>
                <div class="change-list">
                    ${entry.issues.map(issue => `
                        <div class="change-item">
                            <span class="field-name">${escapeHtml(issue)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Build reason display (for HMAC validation)
    if (entry.reason) {
        changesHtml += `
            <div class="audit-changes">
                <h4>🔐 Validation Reason:</h4>
                <div class="change-list">
                    <div class="change-item">
                        <span class="field-name">${escapeHtml(entry.reason)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="audit-entry ${operationClass} ${severityClass}">
            <div class="audit-header">
                <div class="audit-title">
                    ${getOperationIcon(entry.operation)} ${entry.operation || 'VALIDATION'}
                    <span class="severity-badge ${severityClass}">${severityClass}</span>
                </div>
                <div class="audit-timestamp">⏰ ${formattedTime}</div>
            </div>
            
            <div class="audit-metadata">
                ${metadata.join('')}
            </div>
            
            ${entry.message ? `
                <div class="audit-message">
                    ${escapeHtml(entry.message)}
                </div>
            ` : ''}
            
            ${changesHtml}
        </div>
    `;
}

/**
 * Get icon for operation type
 */
function getOperationIcon(operation) {
    switch (operation) {
        case 'CREATE': return '➕';
        case 'UPDATE': return '✏️';
        case 'VALIDATION': return '🔍';
        default: return '📝';
    }
}

/**
 * Update summary statistics
 */
function updateStats() {
    const stats = {
        total: filteredData.length,
        creates: 0,
        updates: 0,
        validations: 0,
        warnings: 0
    };
    
    filteredData.forEach(entry => {
        if (entry.operation === 'CREATE') stats.creates++;
        if (entry.operation === 'UPDATE') stats.updates++;
        if (entry.operation === 'VALIDATION') stats.validations++;
        if (entry.severity === 'WARNING' || entry.severity === 'ERROR') stats.warnings++;
    });
    
    document.getElementById('totalEntries').textContent = stats.total;
    document.getElementById('createCount').textContent = stats.creates;
    document.getElementById('updateCount').textContent = stats.updates;
    document.getElementById('validationCount').textContent = stats.validations;
    document.getElementById('warningCount').textContent = stats.warnings;
}

/**
 * Export audit log to CSV
 */
function exportAuditLog() {
    console.log('📥 Exporting audit log to CSV...');
    
    // CSV headers
    const headers = [
        'Timestamp',
        'Operation',
        'Severity',
        'Trip ID',
        'Source',
        'Actor',
        'Message',
        'Changed Fields',
        'Issues',
        'Reason'
    ];
    
    // CSV rows
    const rows = filteredData.map(entry => {
        const timestamp = entry.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
        return [
            timestamp.toISOString(),
            entry.operation || '',
            entry.severity || '',
            entry.tripId || '',
            entry.source || '',
            entry.actor || '',
            entry.message || '',
            (entry.changedFields || []).join('; '),
            (entry.issues || []).join('; '),
            entry.reason || ''
        ];
    });
    
    // Build CSV content
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `jetlagpro-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`✅ Exported ${filteredData.length} entries to ${filename}`);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

