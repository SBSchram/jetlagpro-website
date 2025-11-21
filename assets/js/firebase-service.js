// JetLagPro Firebase Service
// Extracted from working analytics.js to eliminate DRY violations
// Provides common Firebase REST API integration across all systems

class FirebaseService {
    constructor() {
        this.restUrl = "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/tripCompletions";
        this.auditLogUrl = "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/auditLog";
        this.isLoading = false;
    }

    // Load trip completion data from Firebase REST API
    async getTripCompletions() {
        try {
            this.isLoading = true;
            
            const response = await fetch(this.restUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            let tripData = [];
            
            // Parse the response the same way the iOS app does
            if (data.documents && Array.isArray(data.documents)) {
                data.documents.forEach((document) => {
                    if (document.fields) {
                        // Convert Firestore document format to flat structure
                        const flatData = this.convertFirestoreDocument(document);
                        if (flatData) {
                            tripData.push(flatData);
                        }
                    }
                });
            }
            
            this.isLoading = false;
            return tripData;
            
        } catch (error) {
            console.error('Error loading trip completion data:', error);
            this.isLoading = false;
            throw new Error('Failed to load trip completion data from Firebase REST API: ' + error.message);
        }
    }

    // Convert Firestore document format to flat structure (handles both old nested and new flattened formats)
    convertFirestoreDocument(document) {
        try {
            const fields = document.fields;
            if (!fields) return null;
            
            // Helper function to extract nested values (for old format)
            const extractNestedValue = (fieldName, nestedPath = null) => {
                const field = fields[fieldName];
                if (!field) return null;
                
                // Handle nested objects (old format)
                if (nestedPath && field.mapValue && field.mapValue.fields) {
                    const nestedField = field.mapValue.fields[nestedPath];
                    if (nestedField) {
                        if (nestedField.stringValue) return nestedField.stringValue;
                        if (nestedField.integerValue) return parseInt(nestedField.integerValue);
                        if (nestedField.booleanValue !== undefined) return nestedField.booleanValue;
                        if (nestedField.timestampValue) return new Date(nestedField.timestampValue);
                    }
                    return null;
                }
                
                // Handle direct values (new format)
                if (field.stringValue) return field.stringValue;
                if (field.integerValue) return parseInt(field.integerValue);
                if (field.booleanValue !== undefined) return field.booleanValue;
                if (field.timestampValue) return new Date(field.timestampValue);
                
                return null;
            };
            
            // Extract values from Firestore format (handles both formats)
            const extractString = (fieldName, nestedPath = null) => {
                return extractNestedValue(fieldName, nestedPath);
            };
            
            const extractInteger = (fieldName, nestedPath = null) => {
                return extractNestedValue(fieldName, nestedPath);
            };
            
            const extractBoolean = (fieldName, nestedPath = null) => {
                return extractNestedValue(fieldName, nestedPath);
            };
            
            const extractTimestamp = (fieldName, nestedPath = null) => {
                return extractNestedValue(fieldName, nestedPath);
            };
            
            // Convert to flat structure matching the iOS app data format
            // Try new format first, then fall back to old nested format
            const flatData = {
                id: document.name ? document.name.split('/').pop() : null,
                surveyCode: extractString('surveyCode') || extractString('tripData', 'surveyCode'),
                tripId: extractString('tripId') || extractString('tripData', 'tripId'),
                platform: extractString('platform') || extractString('tripData', 'platform'),
                appVersion: extractString('appVersion') || extractString('tripData', 'appVersion'),
                destinationCode: extractString('destinationCode') || extractString('tripData', 'destinationCode'),
                timezonesCount: extractInteger('timezonesCount') || extractInteger('tripData', 'timezonesCount'),
                travelDirection: extractString('travelDirection') || extractString('tripData', 'travelDirection'),
                pointsCompleted: extractInteger('pointsCompleted') || extractInteger('tripData', 'pointsCompleted'),
                startDate: extractTimestamp('startDate') || extractTimestamp('tripData', 'startDate'),
                completionDate: extractTimestamp('completionDate') || extractTimestamp('tripData', 'completionDate'),
                completionMethod: extractString('completionMethod') || extractString('tripData', 'completionMethod'),
                arrivalTimeZone: extractString('arrivalTimeZone') || extractString('tripData', 'arrivalTimeZone'),
                originTimezone: extractString('originTimezone') || extractString('tripData', 'originTimezone'),
                surveyCompleted: extractBoolean('surveyCompleted') || extractBoolean('surveyData', 'surveyCompleted'),
                created: extractTimestamp('created') || extractTimestamp('tripData', 'created'),
                
                // Extract individual point completion status
                point1Completed: extractBoolean('point1Completed'),
                point2Completed: extractBoolean('point2Completed'),
                point3Completed: extractBoolean('point3Completed'),
                point4Completed: extractBoolean('point4Completed'),
                point5Completed: extractBoolean('point5Completed'),
                point6Completed: extractBoolean('point6Completed'),
                point7Completed: extractBoolean('point7Completed'),
                point8Completed: extractBoolean('point8Completed'),
                point9Completed: extractBoolean('point9Completed'),
                point10Completed: extractBoolean('point10Completed'),
                point11Completed: extractBoolean('point11Completed'),
                point12Completed: extractBoolean('point12Completed'),
                
                // Extract general anticipated severity - handles both formats
                generalAnticipated: extractInteger('generalAnticipated') || extractInteger('surveyData', 'generalAnticipated'),
                
                // Extract anticipated symptoms - handles both formats
                anticipatedSleepSeverity: extractInteger('sleepExpectations') || extractInteger('surveyData', 'sleepExpectations'),
                anticipatedFatigueSeverity: extractInteger('fatigueExpectations') || extractInteger('surveyData', 'fatigueExpectations'),
                anticipatedConcentrationSeverity: extractInteger('concentrationExpectations') || extractInteger('surveyData', 'concentrationExpectations'),
                anticipatedIrritabilitySeverity: extractInteger('irritabilityExpectations') || extractInteger('surveyData', 'irritabilityExpectations'),
                anticipatedGISeverity: extractInteger('giExpectations') || extractInteger('surveyData', 'giExpectations'),
                
                // Extract post-travel symptoms - handles both formats
                postSleepSeverity: extractInteger('sleepPost') || extractInteger('surveyData', 'sleepPost'),
                postFatigueSeverity: extractInteger('fatiguePost') || extractInteger('surveyData', 'fatiguePost'),
                postConcentrationSeverity: extractInteger('concentrationPost') || extractInteger('surveyData', 'concentrationPost'),
                postIrritabilitySeverity: extractInteger('irritabilityPost') || extractInteger('surveyData', 'irritabilityPost'),
                postMotivationSeverity: extractInteger('motivationPost') || extractInteger('surveyData', 'motivationPost'),
                postGISeverity: extractInteger('giPost') || extractInteger('surveyData', 'giPost'),
                
                // Extract demographics - only age (gender and travel experience removed)
                age: extractString('age') || extractString('ageRange'),
                region: extractString('region'),
                
                // For compatibility with existing dashboard logic - handles both formats
                timestamp: extractTimestamp('completionDate') || extractTimestamp('created') || extractTimestamp('tripData', 'completionDate'),
                timezones_count: extractInteger('timezonesCount') || extractInteger('tripData', 'timezonesCount'),
                travel_direction: extractString('travelDirection') || extractString('tripData', 'travelDirection'),
                surveyCode: extractString('surveyCode') || extractString('tripData', 'surveyCode')
            };
            
            return flatData;
            
        } catch (error) {
            console.error('Error converting document:', error);
            return null;
        }
    }

    // Show loading state for a specific container
    showLoadingState(containerId, message = 'Loading data...') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="loading">${message}</div>`;
        }
    }

    // Show error state for a specific container
    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="error">${message}</div>`;
        }
    }

    // Check if service is currently loading
    isLoading() {
        return this.isLoading;
    }

    // Load audit log data from Firebase REST API
    async getAuditLog(limit = 1000) {
        try {
            // Note: Firestore REST API doesn't support orderBy in simple queries
            // We'll fetch all and sort client-side
            const url = `${this.auditLogUrl}?pageSize=${limit}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            let auditEntries = [];
            
            if (data.documents && Array.isArray(data.documents)) {
                data.documents.forEach((document) => {
                    if (document.fields) {
                        const entry = this.convertAuditLogDocument(document);
                        if (entry) {
                            auditEntries.push(entry);
                        }
                    }
                });
            }
            
            // Sort by timestamp descending (newest first)
            auditEntries.sort((a, b) => {
                if (!a.timestamp || !b.timestamp) return 0;
                return b.timestamp - a.timestamp;
            });
            
            return auditEntries;
            
        } catch (error) {
            console.error('Error loading audit log:', error);
            throw new Error('Failed to load audit log from Firebase: ' + error.message);
        }
    }

    // Convert audit log document from Firestore format
    convertAuditLogDocument(document) {
        try {
            const fields = document.fields;
            if (!fields) return null;

            const entry = {
                id: document.name.split('/').pop()
            };

            // Extract all fields
            if (fields.operation?.stringValue) entry.operation = fields.operation.stringValue;
            if (fields.collection?.stringValue) entry.collection = fields.collection.stringValue;
            if (fields.documentId?.stringValue) entry.documentId = fields.documentId.stringValue;
            if (fields.tripId?.stringValue) entry.tripId = fields.tripId.stringValue;
            if (fields.timestamp?.timestampValue) entry.timestamp = new Date(fields.timestamp.timestampValue);
            if (fields.severity?.stringValue) entry.severity = fields.severity.stringValue;
            if (fields.message?.stringValue) entry.message = fields.message.stringValue;
            if (fields.reason?.stringValue) entry.reason = fields.reason.stringValue;
            // Extract source - could be stringValue or already extracted
            if (fields.source?.stringValue) {
                entry.source = fields.source.stringValue;
            } else if (fields.source) {
                // Handle if source is already a plain value (from GCS)
                entry.source = this.extractValue(fields.source);
            }
            if (fields.actor?.stringValue) entry.actor = fields.actor.stringValue;
            if (fields.eventId?.stringValue) entry.eventId = fields.eventId.stringValue;
            if (fields.originTimezone?.stringValue) entry.originTimezone = fields.originTimezone.stringValue;
            if (fields.destinationCode?.stringValue) entry.destinationCode = fields.destinationCode.stringValue;
            if (fields.arrivalTimeZone?.stringValue) entry.arrivalTimeZone = fields.arrivalTimeZone.stringValue;
            if (fields.travelDirection?.stringValue) entry.travelDirection = fields.travelDirection.stringValue;

            // Extract arrays
            if (fields.changedFields?.arrayValue?.values) {
                entry.changedFields = fields.changedFields.arrayValue.values.map(v => v.stringValue);
            }
            if (fields.issues?.arrayValue?.values) {
                entry.issues = fields.issues.arrayValue.values.map(v => v.stringValue);
            }

            // Extract metadata for provenance
            if (fields.metadata?.mapValue?.fields) {
                const metadataFields = fields.metadata.mapValue.fields;
                const metadataResult = {};

                if (metadataFields.writeMetadata?.mapValue?.fields) {
                    metadataResult.writeMetadata = {};
                    Object.entries(metadataFields.writeMetadata.mapValue.fields).forEach(([key, value]) => {
                        metadataResult.writeMetadata[key] = this.extractValue(value);
                    });
                }

                if (metadataFields.surveyMetadata?.mapValue?.fields) {
                    metadataResult.surveyMetadata = {};
                    Object.entries(metadataFields.surveyMetadata.mapValue.fields).forEach(([key, value]) => {
                        metadataResult.surveyMetadata[key] = this.extractValue(value);
                    });
                }

                Object.entries(metadataFields).forEach(([key, value]) => {
                    if (key === 'writeMetadata' || key === 'surveyMetadata') return;
                    metadataResult[key] = this.extractValue(value);
                });

                if (Object.keys(metadataResult).length > 0) {
                    entry.metadata = metadataResult;
                }
            }

            // Extract changes object (nested map)
            if (fields.changes?.mapValue?.fields) {
                entry.changes = {};
                Object.entries(fields.changes.mapValue.fields).forEach(([key, value]) => {
                    if (value.mapValue?.fields) {
                        entry.changes[key] = {
                            before: this.extractValue(value.mapValue.fields.before),
                            after: this.extractValue(value.mapValue.fields.after)
                        };
                    }
                });
            }

            // Extract deletedData (full trip data snapshot for DELETE operations)
            if (fields.deletedData?.mapValue?.fields) {
                entry.deletedData = {};
                Object.entries(fields.deletedData.mapValue.fields).forEach(([key, value]) => {
                    entry.deletedData[key] = this.extractValue(value);
                });
            }

            return entry;
            
        } catch (error) {
            console.error('Error converting audit log document:', error);
            return null;
        }
    }

    // Helper to extract any type of value (recursively for nested structures)
    extractValue(field) {
        if (!field) return null;
        if (field.stringValue !== undefined) return field.stringValue;
        if (field.integerValue !== undefined) return parseInt(field.integerValue);
        if (field.doubleValue !== undefined) return parseFloat(field.doubleValue);
        if (field.booleanValue !== undefined) return field.booleanValue === 'true' || field.booleanValue === true;
        if (field.timestampValue) {
            // Return ISO string for consistent comparison
            const date = new Date(field.timestampValue);
            return isNaN(date.getTime()) ? field.timestampValue : date.toISOString();
        }
        if (field.nullValue !== undefined) return null;
        if (field.mapValue?.fields) {
            // Recursively extract nested map
            const result = {};
            Object.entries(field.mapValue.fields).forEach(([key, value]) => {
                result[key] = this.extractValue(value);
            });
            return result;
        }
        if (field.arrayValue?.values) {
            // Recursively extract array values
            return field.arrayValue.values.map(v => this.extractValue(v));
        }
        return null;
    }
}

// Make service available globally
window.FirebaseService = FirebaseService;
