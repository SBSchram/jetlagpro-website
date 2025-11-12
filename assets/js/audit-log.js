/**
 * AUDIT LOG VIEWER - TABLE FORMAT
 * Concise, scannable table of audit entries
 */

let auditLogData = [];
const firebaseService = new FirebaseService();

async function refreshAuditLog() {
    const tbody = document.getElementById('auditLog');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Refreshing audit log...</td></tr>';
    }
    await loadAuditLog();
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🔍 Initializing Audit Log Viewer...');
    await loadAuditLog();
});

/**
 * Load audit log from Firestore via REST API
 */
async function loadAuditLog() {
    try {
        console.log('📥 Fetching audit log from Firestore REST API...');
        
        const allEntries = await firebaseService.getAuditLog(1000);
        
        // Group entries by trip ID to combine CREATE/UPDATE with their VALIDATION
        const entriesByTrip = {};
        allEntries.forEach(entry => {
            const tripId = entry.tripId || entry.documentId;
            if (!tripId) return;
            
            if (!entriesByTrip[tripId]) {
                entriesByTrip[tripId] = { creates: [], updates: [], validations: [] };
            }
            
            if (entry.operation === 'CREATE') {
                entriesByTrip[tripId].creates.push(entry);
            } else if (entry.operation === 'UPDATE') {
                entriesByTrip[tripId].updates.push(entry);
            } else if (entry.operation === 'VALIDATION') {
                entriesByTrip[tripId].validations.push(entry);
            }
        });
        
        // Build final list: CREATE/UPDATE entries with validation status attached
        auditLogData = [];
        allEntries.forEach(entry => {
            if (entry.operation === 'VALIDATION') return; // Skip standalone validations
            
            const tripId = entry.tripId || entry.documentId;
            const tripValidations = entriesByTrip[tripId]?.validations || [];
            
            // Check if any validation failed
            const hasError = tripValidations.some(v => 
                v.severity === 'ERROR' || 
                v.reason === 'signature_invalid' ||
                (v.issues && v.issues.length > 0)
            );
            
            entry.validationStatus = hasError ? 'invalid' : 'valid';
            auditLogData.push(entry);
        });
        
        console.log(`✅ Loaded ${auditLogData.length} audit entries (${allEntries.length} total)`);
        console.log('🔎 Sample entries:', auditLogData.slice(0, 3).map(entry => ({
            operation: entry.operation,
            source: entry.source,
            writeSource: entry.metadata?.writeMetadata?.source,
            surveySource: entry.metadata?.surveyMetadata?.source
        })));

        auditLogData.sort((a, b) => {
            const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
            const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
            return bTime - aTime;
        });
        
        renderAuditTable();
        updateStats();
        
    } catch (error) {
        console.error('❌ Error loading audit log:', error);
        document.getElementById('auditLog').innerHTML = `
            <tr><td colspan="8" class="empty-state">Error loading audit log: ${error.message}</td></tr>
        `;
    }
}

/**
 * Render audit log as table rows
 */
function renderAuditTable() {
    const tbody = document.getElementById('auditLog');
    
    if (auditLogData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No audit entries found</td></tr>';
        return;
    }
    
    tbody.innerHTML = auditLogData.map((entry, index) => renderTableRow(entry, index)).join('');
}

/**
 * Render individual table row
 */
function renderTableRow(entry, index) {
    const timestamp = entry.timestamp ? entry.timestamp.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : '-';

    let action = entry.operation || 'VALIDATION';
    if (entry.operation === 'UPDATE') {
        const surveyMetaChange = entry.changes && entry.changes._surveyMetadata;
        const isInitialSurvey = surveyMetaChange && surveyMetaChange.before == null;
        action = isInitialSurvey ? 'UPDATE' : 'MODIFY';
    }

    const actionClass = `action-${action}`;

    const validStatus = entry.validationStatus === 'invalid'
        ? '<span class=\"valid-no\">✗</span>'
        : '<span class=\"valid-yes\">✓</span>';

    const rawSource = determineRawSource(entry);
    const {label: source, cssClass: sourceClass} = mapSource(rawSource);

    const tripId = entry.tripId || entry.documentId || '';
    const surveyCode = tripId ? tripId.split('-')[0] : '-';

    let origin = '-';
    let dest = '-';
    let arrival = '-';

    if (entry.operation === 'CREATE') {
        const data = entry.dataSnapshot || {};
        const metaBefore = entry.beforeSnapshot || {};
        const meta = entry.metadata?.writeMetadata || {};
        origin = data.originTimezone || metaBefore.originTimezone || meta.originTimezone || '-';
        dest = data.destinationCode || metaBefore.destinationCode || meta.destinationCode || '-';
        arrival = data.arrivalTimeZone || metaBefore.arrivalTimeZone || meta.arrivalTimeZone || '-';
        if (!origin || origin === '-') {
            console.debug('CREATE entry missing origin, metadata snapshot:', entry);
        }
    } else if (entry.operation === 'UPDATE' && entry.afterSnapshot) {
        origin = entry.afterSnapshot.originTimezone || '-';
        dest = entry.afterSnapshot.destinationCode || '-';
        arrival = entry.afterSnapshot.arrivalTimeZone || '-';
    }

    origin = formatTimezone(origin);
    arrival = formatTimezone(arrival);

    const isExpandable = source === 'FC' && entry.changes && Object.keys(entry.changes).length > 0;
    const expandClass = isExpandable ? 'expandable' : '';
    const onclick = isExpandable ? `onclick=\"toggleExpand(${index})\"` : '';

    let html = `
        <tr class="${expandClass}" ${onclick} data-index="${index}">
            <td>${timestamp}</td>
            <td class="${actionClass}">${action}</td>
            <td class="${sourceClass}">${source}</td>
            <td>${surveyCode}</td>
            <td>${origin}</td>
            <td>${dest}</td>
            <td>${arrival}</td>
            <td>${validStatus}</td>
        </tr>
    `;

    if (isExpandable) {
        html += `
            <tr class=\"expanded-row\" id=\"expanded-${index}\">
                <td colspan=\"8\">
                    <div class=\"expanded-content\">
                        <h4>Console Changes:</h4>
                        <div class=\"change-list\">
                            ${Object.entries(entry.changes).map(([field, change]) => `
                                <div class=\"change-item\">
                                    <span class=\"field-name\">${escapeHtml(field)}</span>
                                    <span class=\"old-value\">Before: ${escapeHtml(formatValue(change.before))}</span>
                                    <span class=\"new-value\">After: ${escapeHtml(formatValue(change.after))}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    return html;
}

function determineRawSource(entry) {
    const message = (entry.message || "").toLowerCase();
    const hasDeleteCue = entry.operation === 'DELETE' || message.includes('deleted');

    if (hasDeleteCue) {
        return 'firebase_console';
    }

    const hasChangedFields = Array.isArray(entry.changedFields) && entry.changedFields.length > 0;
    const hasChangesMap = entry.changes && Object.keys(entry.changes).length > 0;

    if (hasChangedFields || hasChangesMap) {
        return 'web_survey';
    }

    return 'ios_app';
}

function mapSource(rawSource) {
    switch (rawSource) {
        case 'ios_app':
            return {label: 'App', cssClass: 'source-app'};
        case 'web_survey':
            return {label: 'Survey', cssClass: 'source-survey'};
        case 'firebase_console':
        case 'console':
            return {label: 'FC', cssClass: 'source-console'};
        default:
            return {label: '-', cssClass: ''};
    }
}

/**
 * Toggle expanded row
 */
function toggleExpand(index) {
    const expandedRow = document.getElementById(`expanded-${index}`);
    if (expandedRow) {
        expandedRow.classList.toggle('show');
    }
}

/**
 * Format timezone (show short name)
 */
function formatTimezone(tz) {
    if (!tz || tz === '-') return '-';
    // Show just the last part (e.g. "America/New_York" -> "New_York")
    const parts = tz.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
}

/**
 * Format value for display
 */
function formatValue(value) {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'object' && value instanceof Date) {
        return value.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string' && value.length > 100) {
        return value.substring(0, 100) + '...';
    }
    return String(value);
}

/**
 * Update summary statistics
 */
function updateStats() {
    const stats = {
        total: auditLogData.length,
        creates: 0,
        updates: 0,
        validations: 0,
        warnings: 0
    };
    
    auditLogData.forEach(entry => {
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
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
