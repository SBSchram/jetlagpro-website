// JetLagPro Firebase Service
// Extracted from working analytics.js to eliminate DRY violations
// Provides common Firebase REST API integration across all systems

class FirebaseService {
    constructor() {
        this.restUrl = "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/tripCompletions";
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
}

// Make service available globally
window.FirebaseService = FirebaseService;
