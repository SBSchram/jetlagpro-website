/**
 * AUDIT LOG VIEWER - TABLE FORMAT
 * Concise, scannable table of audit entries
 */

let auditLogData = [];
const firebaseService = new FirebaseService();

async function refreshAuditLog() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
    }
    
    const tbody = document.getElementById('auditLog');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading">Refreshing audit log...</td></tr>';
    }
    
    await loadAuditLog();
    
    if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh Data';
    }
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

        // Group entries by trip ID
        const groupedByTrip = {};
        auditLogData.forEach(entry => {
            const tripId = entry.tripId || entry.documentId || 'unknown';
            if (!groupedByTrip[tripId]) {
                groupedByTrip[tripId] = [];
            }
            groupedByTrip[tripId].push(entry);
        });

        // Sort entries within each group by timestamp (newest first)
        Object.keys(groupedByTrip).forEach(tripId => {
            groupedByTrip[tripId].sort((a, b) => {
                const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
                const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
                return bTime - aTime; // Newest first within group
            });
        });

        // Sort groups by earliest timestamp in each group (oldest group first)
        const sortedGroups = Object.keys(groupedByTrip).sort((tripIdA, tripIdB) => {
            const groupA = groupedByTrip[tripIdA];
            const groupB = groupedByTrip[tripIdB];
            
            // Find earliest timestamp in each group
            const earliestA = Math.min(...groupA.map(e => e.timestamp instanceof Date ? e.timestamp.getTime() : 0));
            const earliestB = Math.min(...groupB.map(e => e.timestamp instanceof Date ? e.timestamp.getTime() : 0));
            
            return earliestB - earliestA; // Oldest group first
        });

        // Flatten back to array, preserving group order
        // Also add context metadata to each entry
        auditLogData = [];
        sortedGroups.forEach(tripId => {
            const group = groupedByTrip[tripId];
            group.forEach((entry, groupIndex) => {
                // Add context: check if DELETE occurred before this entry
                const hasRecentDelete = group.slice(0, groupIndex).some(e => e.operation === 'DELETE');
                entry._hasRecentDelete = hasRecentDelete;
                
                // Add context: check if this is first survey submission (no previous survey data)
                if (entry.operation === 'UPDATE') {
                    const hasPreviousSurvey = group.slice(0, groupIndex).some(e => 
                        e.operation === 'UPDATE' && 
                        (e.changes?._surveyMetadata || e.changes?.surveyCompleted)
                    );
                    entry._isFirstSurvey = !hasPreviousSurvey && !hasRecentDelete;
                    entry._isAfterRecreation = hasRecentDelete;
                }
                
                auditLogData.push(entry);
            });
        });
        
        renderAuditTable();
        updateStats();
        
    } catch (error) {
        console.error('❌ Error loading audit log:', error);
        document.getElementById('auditLog').innerHTML = `
            <tr><td colspan="9" class="empty-state">Error loading audit log: ${error.message}</td></tr>
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
    let travelDirection = '-';

    // Extract data from various sources based on operation type
    let data = {};
    if (entry.operation === 'CREATE') {
        data = entry.dataSnapshot || {};
        const metaBefore = entry.beforeSnapshot || {};
        const meta = entry.metadata?.writeMetadata || {};
        origin = entry.originTimezone || data.originTimezone || metaBefore.originTimezone || meta.originTimezone || '-';
        dest = entry.destinationCode || data.destinationCode || metaBefore.destinationCode || meta.destinationCode || '-';
        arrival = entry.arrivalTimeZone || data.arrivalTimeZone || metaBefore.arrivalTimeZone || meta.arrivalTimeZone || '-';
        travelDirection = entry.travelDirection || data.travelDirection || metaBefore.travelDirection || meta.travelDirection || '-';
    } else if (entry.operation === 'UPDATE') {
        // Try afterSnapshot first, then entry properties, then changes
        const afterSnapshot = entry.afterSnapshot || {};
        const beforeSnapshot = entry.beforeSnapshot || {};
        origin = afterSnapshot.originTimezone || entry.originTimezone || beforeSnapshot.originTimezone || '-';
        dest = afterSnapshot.destinationCode || entry.destinationCode || beforeSnapshot.destinationCode || '-';
        arrival = afterSnapshot.arrivalTimeZone || entry.arrivalTimeZone || beforeSnapshot.arrivalTimeZone || '-';
        travelDirection = afterSnapshot.travelDirection || entry.travelDirection || beforeSnapshot.travelDirection || '-';
    } else if (entry.operation === 'DELETE') {
        data = entry.deletedData || {};
        const meta = entry.metadata?.writeMetadata || {};
        origin = entry.originTimezone || data.originTimezone || meta.originTimezone || '-';
        dest = entry.destinationCode || data.destinationCode || meta.destinationCode || '-';
        arrival = entry.arrivalTimeZone || data.arrivalTimeZone || meta.arrivalTimeZone || '-';
        travelDirection = entry.travelDirection || data.travelDirection || meta.travelDirection || '-';
    }

    origin = formatTimezone(origin);
    arrival = formatTimezone(arrival);
    
    // Format destination with travel direction: "DEST - E/W"
    const directionDisplay = travelDirection && travelDirection !== '-' 
        ? travelDirection.charAt(0).toUpperCase() + travelDirection.slice(1).toLowerCase()
        : '';
    const destDisplay = dest !== '-' 
        ? (directionDisplay ? `${dest} - ${directionDisplay}` : dest)
        : '-';

    const hasChanges = entry.changes && Object.keys(entry.changes).length > 0;
    const isExpandable = (source === 'FC' || action === 'MODIFY') && hasChanges;
    const expandClass = isExpandable ? 'expandable' : '';
    const onclick = isExpandable ? `onclick=\"toggleExpand(${index})\"` : '';
    const expandIcon = isExpandable ? ' <span class="expand-icon">▼</span>' : '';

    let evaluation = classifyEntry(entry);

    // Check if this is the first entry for this trip ID (to add group separator)
    const isFirstInGroup = index === 0 || 
        (auditLogData[index - 1] && 
         (auditLogData[index - 1].tripId || auditLogData[index - 1].documentId) !== tripId);
    
    const groupSeparator = isFirstInGroup && index > 0 
        ? '<tr class="trip-group-separator"><td colspan="9"></td></tr>' 
        : '';
    
    // Enhanced DELETE styling
    const deleteClass = action === 'DELETE' ? ' delete-entry' : '';
    const deleteIcon = action === 'DELETE' ? ' ⚠️' : '';
    
    let html = groupSeparator + `
        <tr class="${expandClass}${deleteClass}" ${onclick} data-index="${index}" data-trip-id="${tripId}">
            <td>${timestamp}</td>
            <td class="${actionClass}">${action}${deleteIcon}${expandIcon}</td>
            <td class="${sourceClass}">${source}</td>
            <td>${surveyCode}</td>
            <td>${origin}</td>
            <td>${destDisplay}</td>
            <td>${arrival}</td>
            <td>${evaluation}</td>
            <td>${validStatus}</td>
        </tr>
    `;

    if (isExpandable) {
        const changeType = action === 'MODIFY' ? 'Survey Changes' : 'Console Changes';
        const tripIdDisplay = tripId ? ` ${tripId}` : '';
        
        // Add context note for UPDATE with before: null
        let contextNote = '';
        if (entry.operation === 'UPDATE' && entry.changes) {
            const hasNullBefore = Object.values(entry.changes).some(change => change.before === null || change.before === undefined);
            if (hasNullBefore) {
                if (entry._isAfterRecreation) {
                    contextNote = '<div class="context-note context-warning">⚠️ Note: Trip was recreated after deletion, so previous survey data is not shown in BEFORE column.</div>';
                } else if (entry._isFirstSurvey) {
                    contextNote = '<div class="context-note context-info">ℹ️ Note: This is the initial survey submission for this trip.</div>';
                }
            }
        }
        
        // Enhanced message for DELETE
        let deleteContext = '';
        if (entry.operation === 'DELETE' && entry.deletedData) {
            const deletedFields = Object.keys(entry.deletedData).filter(k => !k.startsWith('_'));
            const surveyFields = deletedFields.filter(k => 
                k.includes('survey') || 
                k.includes('Post') || 
                k.includes('Anticipated') ||
                k === 'userComment' ||
                k === 'ageRange'
            );
            deleteContext = `<div class="context-note context-error">
                <strong>⚠️ Data Lost:</strong> This deletion removed ${deletedFields.length} field(s) including:
                ${surveyFields.length > 0 ? `<br>• Survey data: ${surveyFields.join(', ')}` : ''}
                ${deletedFields.length > surveyFields.length ? `<br>• Trip data: ${deletedFields.filter(f => !surveyFields.includes(f)).slice(0, 5).join(', ')}${deletedFields.length - surveyFields.length > 5 ? '...' : ''}` : ''}
            </div>`;
        }
        
        html += `
            <tr class=\"expanded-row\" id=\"expanded-${index}\">
                <td colspan=\"9\">
                    <div class=\"expanded-content\">
                        <h4>${changeType}:${tripIdDisplay}</h4>
                        ${contextNote}
                        ${deleteContext}
                        <div class=\"changes-table-container\">
                            <table class=\"changes-table\">
                                <thead>
                                    <tr>
                                        <th class=\"col-field\">Field Name</th>
                                        <th class=\"col-before\">BEFORE</th>
                                        <th class=\"col-after\">AFTER</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(entry.changes).map(([field, change]) => {
                                        // For metadata fields, expand each property on its own line
                                        const isMetadata = field.toLowerCase().includes('metadata');
                                        
                                        // Try to parse as object (handle both object and JSON string cases)
                                        let beforeObj = change.before;
                                        let afterObj = change.after;
                                        
                                        // If it's a string that looks like JSON, try to parse it
                                        if (typeof beforeObj === 'string') {
                                            const trimmed = beforeObj.trim();
                                            if (trimmed.startsWith('{')) {
                                                try {
                                                    beforeObj = JSON.parse(beforeObj);
                                                } catch (e) {
                                                    // Not valid JSON, keep as string
                                                }
                                            }
                                        }
                                        if (typeof afterObj === 'string') {
                                            const trimmed = afterObj.trim();
                                            if (trimmed.startsWith('{')) {
                                                try {
                                                    afterObj = JSON.parse(afterObj);
                                                } catch (e) {
                                                    // Not valid JSON, keep as string
                                                }
                                            }
                                        }
                                        
                                        // Note: userAgent inside _surveyMetadata will be handled as a regular property
                                        // by formatMetadataField, which will show it as a single value (not expanded)
                                        
                                        // Check if either before or after is an object (after potential parsing)
                                        const beforeIsObj = typeof beforeObj === 'object' && beforeObj !== null && !Array.isArray(beforeObj);
                                        const afterIsObj = typeof afterObj === 'object' && afterObj !== null && !Array.isArray(afterObj);
                                        
                                        if (isMetadata && (beforeIsObj || afterIsObj)) {
                                            return formatMetadataField(field, { before: beforeObj, after: afterObj });
                                        } else {
                                            return `
                                                <tr>
                                                    <td class=\"field-name-cell\">${escapeHtml(field)}</td>
                                                    <td class=\"value-before\">${escapeHtml(formatValue(change.before, false))}</td>
                                                    <td class=\"value-after\">${escapeHtml(formatValue(change.after, false))}</td>
                                                </tr>
                                            `;
                                        }
                                    }).join('')}
                                </tbody>
                            </table>
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

const DEVELOPER_PREFIXES = ['2330B376', '7482966F', '5E001B36', '23DB54B0'];

function classifyEntry(entry) {
    const tripId = entry.tripId || entry.documentId || '';
    if (DEVELOPER_PREFIXES.some(prefix => tripId.startsWith(prefix))) {
        return 'Dev';
    }

    const origin = entry.originTimezone || entry.afterSnapshot?.originTimezone || entry.dataSnapshot?.originTimezone || entry.metadata?.writeMetadata?.originTimezone || entry.deletedData?.originTimezone || '-';
    const arrival = entry.arrivalTimeZone || entry.afterSnapshot?.arrivalTimeZone || entry.dataSnapshot?.arrivalTimeZone || entry.metadata?.writeMetadata?.arrivalTimeZone || entry.deletedData?.arrivalTimeZone || '-';

    if (origin !== '-' && arrival !== '-' && origin === arrival) {
        return 'Test';
    }

    return 'Real';
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
 * Format metadata field with each property on its own line
 * For _surveyMetadata, show only the property name (no prefix)
 * Only shows fields that actually changed
 */
function formatMetadataField(fieldName, change) {
    const beforeObj = change.before || {};
    const afterObj = change.after || {};
    const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
    
    // Filter to only show fields that actually changed
    const changedKeys = Array.from(allKeys).filter(key => {
        const beforeVal = beforeObj[key] !== undefined ? beforeObj[key] : null;
        const afterVal = afterObj[key] !== undefined ? afterObj[key] : null;
        // Compare values (handle null/undefined)
        if (beforeVal === null && afterVal === null) return false;
        if (beforeVal === null || afterVal === null) return true;
        // For objects/arrays, compare JSON strings
        if (typeof beforeVal === 'object' || typeof afterVal === 'object') {
            return JSON.stringify(beforeVal) !== JSON.stringify(afterVal);
        }
        // For primitives, direct comparison
        return String(beforeVal) !== String(afterVal);
    });
    
    if (changedKeys.length === 0) {
        return ''; // No changes to display
    }
    
    return changedKeys.map(key => {
        const beforeVal = beforeObj[key] !== undefined ? beforeObj[key] : null;
        const afterVal = afterObj[key] !== undefined ? afterObj[key] : null;
        // For metadata fields, show only the property name (remove _surveyMetadata. prefix)
        const displayName = fieldName.toLowerCase().includes('metadata') ? escapeHtml(key) : `${escapeHtml(fieldName)}.${escapeHtml(key)}`;
        return `
            <tr>
                <td class=\"field-name-cell\">${displayName}</td>
                <td class=\"value-before\">${escapeHtml(formatValue(beforeVal, false))}</td>
                <td class=\"value-after\">${escapeHtml(formatValue(afterVal, false))}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Format value for display (compact format)
 * @param {*} value - The value to format
 * @param {boolean} prettyPrint - Whether to pretty-print JSON (not used in compact mode)
 */
function formatValue(value, prettyPrint = false) {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'object' && value instanceof Date) {
        return value.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    if (typeof value === 'object') {
        try {
            // Compact JSON (single line, no indentation)
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    }
    if (typeof value === 'boolean') return value ? 'true' : 'false';
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
        deletions: 0
    };
    
    auditLogData.forEach(entry => {
        if (entry.operation === 'CREATE') stats.creates++;
        if (entry.operation === 'UPDATE') stats.updates++;
        if (entry.operation === 'VALIDATION') stats.validations++;
        if (entry.operation === 'DELETE') stats.deletions++;
    });
    
    document.getElementById('totalEntries').textContent = stats.total;
    document.getElementById('createCount').textContent = stats.creates;
    document.getElementById('updateCount').textContent = stats.updates;
    document.getElementById('validationCount').textContent = stats.validations;
    document.getElementById('deletionCount').textContent = stats.deletions;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
