// JetLagPro Analytics Dashboard JavaScript
// Extracted from analytics-secret.html for better maintainability

// Global variables for data
let surveyData = [];
let testData = [];
let currentDataSource = 'real'; // 'real' or 'test'
let isLoading = true;


// Firebase service instance (new integration)
let firebaseService = null;

// Acupuncture Point ID to Name Mapping
const POINT_MAPPING = {
    1: 'LU-8',
    2: 'LI-1', 
    3: 'ST-36',
    4: 'SP-3',
    5: 'HT-8',
    6: 'SI-5',
    7: 'BL-66',
    8: 'KI-3',
    9: 'PC-8',
    10: 'SJ-6',
    11: 'GB-34',
    12: 'LIV-3'
};

// Helper function to get acupuncture point name from point ID
function getPointName(pointId) {
    return POINT_MAPPING[pointId] || `Point-${pointId}`;
}

// Helper function to get all completed acupuncture points for a survey
function getCompletedPoints(survey) {
    const completedPoints = [];
    for (let i = 1; i <= 12; i++) {
        const pointField = `point${i}Completed`;
        if (survey[pointField]) {
            completedPoints.push(getPointName(i));
        }
    }
    return completedPoints;
}

// Helper function to get all trips (no filtering)
function getFilteredTrips(trips) {
    return trips; // Analyze all data
}

// Helper function to get validation statistics
function getValidationStats(trips) {
    return TripValidator.getValidationStats(trips);
}

// Toggle function removed - we analyze all data

// Pagination variables for recent submissions
let currentPage = 1;
let itemsPerPage = 100;
let totalPages = 1;

// Firebase REST API endpoint (same as iOS app)
const FIREBASE_REST_URL = "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/tripCompletions";

// Gaussian random number generator (Box-Muller transform)
function gaussianRandom(mean = 0, stdDev = 1) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Generate synthetic test data with realistic patterns
function generateTestData(numSurveys = 300) {
    const data = [];
    const destinations = ['JFK', 'LAX', 'LHR', 'NRT', 'SYD', 'CDG', 'FRA', 'ICN', 'SIN', 'DXB'];
    const travelDirections = ['Eastward', 'Westward'];
    
    for (let i = 0; i < numSurveys; i++) {
        // Generate realistic travel parameters
        const timezonesCrossed = Math.max(1, Math.floor(Math.random() * 12) + 1); // 1-12 time zones
        const pointsCompleted = Math.floor(Math.random() * 13); // 0-12 points
        const travelDirection = travelDirections[Math.floor(Math.random() * travelDirections.length)];
        const destination = destinations[Math.floor(Math.random() * destinations.length)];
        
        // Base anticipation (most people expect moderate jet lag)
        const anticipation = 3;
        
        // Time zone effect (more time zones = worse symptoms)
        const timeZoneEffect = (timezonesCrossed - 1) * 0.25;
        
        // App effect (more usage = better results, capped at -1.5 max benefit)
        const appEffect = -(pointsCompleted / 12) * 1.5;
        
        // Generate post-travel severity for each symptom using Gaussian distribution
        const generateSymptomSeverity = () => {
            const baseSeverity = anticipation + timeZoneEffect + appEffect;
            const randomVariation = gaussianRandom(0, 0.8);
            return Math.max(1, Math.min(5, Math.round(baseSeverity + randomVariation)));
        };
        
        const survey = {
            surveyCode: `TEST${String(i + 1).padStart(3, '0')}`,
            destinationCode: destination,
            timezonesCount: timezonesCrossed,
            travelDirection: travelDirection,
            pointsCompleted: pointsCompleted,
            surveyCompleted: true,
            
            // Post-travel symptom severities (1-5 scale)
            postSleepSeverity: generateSymptomSeverity(),
            postFatigueSeverity: generateSymptomSeverity(),
            postConcentrationSeverity: generateSymptomSeverity(),
            postIrritabilitySeverity: generateSymptomSeverity(),
            postMotivationSeverity: generateSymptomSeverity(),
            postGISeverity: generateSymptomSeverity(),
            
            // Timestamp (spread over last 6 months)
            timestamp: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
            
            // Platform info
            platform: Math.random() > 0.5 ? 'iOS' : 'Android',
            appVersion: '1.0.0'
        };
        
        data.push(survey);
    }
    
    return data;
}

// Get current data source (real or test)
function getCurrentData() {
    const data = currentDataSource === 'real' ? surveyData : testData;
    const filteredData = getFilteredTrips(data || []);
    
    // Filter out developer's trip ID (2330B376) - exclude from all analysis
    const developerTripId = '2330B376';
    return filteredData.filter(trip => {
        const tripId = trip.tripId || '';
        // Check if tripId starts with developer ID (handles both exact match and extended IDs like "2330B376-...")
        return !tripId.startsWith(developerTripId);
    });
}

// Switch between real and test data
function switchDataSource(source) {
    currentDataSource = source;
    
    if (source === 'test' && testData.length === 0) {
        testData = generateTestData();
    }
    
    // Refresh dashboard with new data
    renderDashboard();
    renderStimulationEfficacy();
    renderRecentSubmissions();
    renderAdvancedAnalytics();
}

// Initialize function (no Firebase SDK needed)
async function initializeDashboard() {
    try {
        await loadDashboardData();
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        showError('Failed to initialize dashboard: ' + error.message);
    }
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        isLoading = true;
        showLoadingState();
        
        await loadSurveyData();
        
        // Ensure data is fully loaded before rendering
        if (surveyData && surveyData.length > 0) {
            console.log(`📊 Data loaded successfully: ${surveyData.length} records`);
            // Small delay to ensure DOM and TripValidator are ready
            setTimeout(() => {
                renderDashboard();
            }, 100);
        } else {
            console.warn('⚠️ No data loaded, showing empty state');
            showError('No data available');
        }
        
        isLoading = false;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data: ' + error.message);
        isLoading = false;
    }
}

// Load survey data from Firebase REST API (same approach as iOS app)
async function loadSurveyData() {
    try {
        const response = await fetch(FIREBASE_REST_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Parse the response the same way the iOS app does
        if (data.documents && Array.isArray(data.documents)) {
            surveyData = [];
            data.documents.forEach((document) => {
                if (document.fields) {
                    // Convert Firestore document format to flat structure
                    const flatData = convertFirestoreDocument(document);
                    if (flatData) {
                        surveyData.push(flatData);
                    }
                }
            });
        } else {
            surveyData = [];
        }
        
    } catch (error) {
        console.error('Error loading survey data:', error);
        throw new Error('Failed to load trip completion data from Firebase REST API: ' + error.message);
    }
}


// Render timezone validation statistics (DRY)
function renderTimezoneValidationStats() {
    const container = document.getElementById('timezoneValidationStats');
    if (!container) return;
    
    // Get current data using the same method as other functions
    const allData = getCurrentData();
    
    if (!allData || allData.length === 0) {
        container.innerHTML = '<div class="error">No data available for timezone validation analysis</div>';
        return;
    }
    
    // Use TripValidator to get validation stats
    const validationStats = TripValidator.getValidationStats(allData);
    const breakdown = TripValidator.getValidationBreakdown(allData);
    
    container.innerHTML = `
        <div class="validation-stats">
            <h3>🌍 Trip Validation Statistics</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Validation Breakdown</h4>
                    <div class="stat-item">
                        <span class="stat-label">Legacy Data:</span>
                        <span class="stat-value">${breakdown.legacy}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Real Travel:</span>
                        <span class="stat-value">${breakdown.real_travel}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Survey Fallback:</span>
                        <span class="stat-value">${breakdown.survey_fallback}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Test Data:</span>
                        <span class="stat-value invalid">${breakdown.test_data}</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <h4>📊 Validation Rules</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li><strong>Legacy Data:</strong> No timezone fields (older data format) - Always valid</li>
                    <li><strong>Real Travel:</strong> Different arrival and origin timezones - Valid</li>
                    <li><strong>Survey Fallback:</strong> Same timezone but survey completed offline - Valid</li>
                    <li><strong>Test Data:</strong> Same timezone without survey fallback - Invalid</li>
                </ul>
            </div>
        </div>
    `;
}

// Convert Firestore document format to flat structure (handles both old nested and new flattened formats)
function convertFirestoreDocument(document) {
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
            arrivalTimeZone: extractString('arrivalTimeZone') || extractString('tripData', 'arrivalTimeZone') || extractString('arrivalTimeZone'),
            originTimezone: extractString('originTimezone') || extractString('tripData', 'originTimezone') || extractString('originTimezone'),
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
            
            // Note: Baseline/typical symptom data removed from survey - now focusing on anticipated vs post-travel
            
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

// Calculate key statistics (now handled in renderSymptomAnalysis)
function calculateStatistics() {
    // Statistics are now calculated and displayed directly in renderSymptomAnalysis
    // This function is kept for compatibility but no longer updates DOM elements
}

// Render dashboard sections
function renderDashboard() {
    renderTripStats();
    renderAdvancedAnalytics();
    renderStimulationEfficacy();
    renderPointStimulationAnalysis();
    renderRecentSubmissions();
}

// Show loading state
function showLoadingState() {
    document.getElementById('tripStats').innerHTML = '<div class="loading">Loading trip stats...</div>';
    document.getElementById('advancedAnalytics').innerHTML = '<div class="loading">Loading advanced analytics...</div>';
    document.getElementById('stimulationEfficacy').innerHTML = '<div class="loading">Loading efficacy data...</div>';
    document.getElementById('pointMappingTable').innerHTML = '<div class="loading">Loading point stimulation data...</div>';
    document.getElementById('recentSubmissions').innerHTML = '<div class="loading">Loading recent data...</div>';
}

// Show error message
function showError(message) {
    const container = document.getElementById('tripStats');
    if (container) {
        container.innerHTML = `<div class="error">${message}</div>`;
    } else {
        console.error(message);
    }
}

// Refresh data function
function refreshData() {
    loadDashboardData();
}

// ============================================================================
// NEW FIREBASE SERVICE INTEGRATION (Step 2)
// ============================================================================

// Initialize Firebase service
function initializeFirebaseService() {
    try {
        if (window.FirebaseService) {
            firebaseService = new window.FirebaseService();
            console.log('✅ Firebase service initialized for analytics');
            return true;
        } else {
            console.warn('⚠️ FirebaseService not available, falling back to existing methods');
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to initialize Firebase service:', error);
        return false;
    }
}

// NEW: Load data using Firebase service (alternative to loadSurveyData)
async function loadSurveyDataWithService() {
    if (!firebaseService) {
        console.warn('⚠️ Firebase service not available, falling back to existing method');
        return await loadSurveyData(); // Fallback to existing method
    }
    
    try {
        console.log('🔄 Loading data with Firebase service...');
        const data = await firebaseService.getTripCompletions();
        surveyData = data;
        console.log(`✅ Loaded ${data.length} records using Firebase service`);
        return data;
    } catch (error) {
        console.error('❌ Firebase service failed, falling back to existing method:', error);
        return await loadSurveyData(); // Fallback to existing method
    }
}

// NEW: Load dashboard data using Firebase service
async function loadDashboardDataWithService() {
    try {
        isLoading = true;
        showLoadingState();
        
        const data = await loadSurveyDataWithService();
        
        // Ensure data is fully loaded and processed before rendering
        if (data && data.length > 0) {
            console.log(`📊 Data loaded successfully: ${data.length} records`);
            // Small delay to ensure DOM and TripValidator are ready
            setTimeout(() => {
                renderDashboard();
            }, 100);
        } else {
            console.warn('⚠️ No data loaded, showing empty state');
            showError('No data available');
        }
        
        isLoading = false;
    } catch (error) {
        console.error('Error loading dashboard with service:', error);
        showError('Failed to load dashboard data: ' + error.message);
        isLoading = false;
    }
}

// NEW: Refresh data using Firebase service
function refreshDataWithService() {
    if (firebaseService) {
        console.log('🔄 Refreshing data with Firebase service...');
        loadDashboardDataWithService();
    } else {
        console.log('🔄 Firebase service not available, using existing refresh method...');
        refreshData(); // Fallback to existing method
    }
}

// ============================================================================
// END NEW FIREBASE SERVICE INTEGRATION
// ============================================================================

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Try to initialize Firebase service first
    const serviceAvailable = initializeFirebaseService();
    
    if (serviceAvailable) {
        console.log('🚀 Initializing dashboard with Firebase service...');
        loadDashboardDataWithService();
    } else {
        console.log('🚀 Initializing dashboard with existing methods...');
        initializeDashboard();
    }
});

// Auto-refresh every 5 minutes (disabled to prevent multiple loading)
// setInterval(() => {
//     if (!isLoading) {
//         loadDashboardData();
//     }
// }, 5 * 60 * 1000);

// Render symptom analysis (updated for new data structure)
function renderSymptomAnalysis() {
    const container = document.getElementById('symptomAnalysis');
    if (!container) return;
    
    const data = getCurrentData();
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="error">No survey data available</div>';
        return;
    }

    // Show comprehensive trip completion and survey statistics
    let html = '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th><th>Details</th></tr></thead><tbody>';
    
    // Core metrics (moved from top stat cards)
    const totalTrips = data.length;
    const completedTrips = data.filter(s => s.surveyCompleted).length;
    const completionRate = Math.round((completedTrips/totalTrips)*100);
    
    // Recent surveys (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = data.filter(survey => {
        const surveyDate = survey.surveySubmittedAt || survey.completionDate || survey.created || survey.timestamp;
        const surveyDateObj = surveyDate ? new Date(surveyDate) : null;
        return surveyDateObj && surveyDateObj >= sevenDaysAgo;
    }).length;
    
    html += `<tr><td><strong>✈️ Total Trips</strong></td><td>${totalTrips}</td><td>Total trip completions collected</td></tr>`;
    html += `<tr><td><strong>📅 Recent Submissions</strong></td><td>${recentCount}</td><td>Surveys in the last 7 days</td></tr>`;
    html += `<tr><td><strong>✅ Completion Rate</strong></td><td>${completionRate}%</td><td>Percentage of completed surveys</td></tr>`;
    
    // Additional trip completion statistics
    const iosTrips = data.filter(s => s.platform === 'iOS').length;
    const webTrips = data.filter(s => s.platform !== 'iOS').length;
    
    html += `<tr><td><strong>Completed Surveys</strong></td><td>${completedTrips}</td><td>${completionRate}% completion rate</td></tr>`;
    html += `<tr><td><strong>Web Survey Trips</strong></td><td>${webTrips}</td><td>${Math.round((webTrips/totalTrips)*100)}% of total</td></tr>`;

    html += '</tbody></table>';
    
    container.innerHTML = html;
}

// Render recent submissions with pagination
function renderRecentSubmissions() {
    const container = document.getElementById('recentSubmissions');
    if (!container) return;
    
    const data = getCurrentData();
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="error">No submission data available</div>';
        return;
    }

    // Sort by date (most recent first)
    const sortedSurveys = data.sort((a, b) => {
        const dateA = a.surveySubmittedAt || a.completionDate || a.created || a.timestamp;
        const dateB = b.surveySubmittedAt || b.completionDate || b.created || b.timestamp;
        return new Date(dateB) - new Date(dateA); // Most recent first
    });

    // Separate into valid trips and test data
    const validTrips = sortedSurveys.filter(trip => TripValidator.isValidTrip(trip));
    const testData = sortedSurveys.filter(trip => !TripValidator.isValidTrip(trip));
    
    // Within valid trips, separate by survey completion status
    const validCompleted = validTrips.filter(trip => trip.surveyCompleted === true);
    const validNotCompleted = validTrips.filter(trip => trip.surveyCompleted !== true);

    // Build HTML
    let html = '';
    
    // Helper function to render a trip table
    const renderTripTable = (trips, showStatus = true) => {
        if (trips.length === 0) return '<p><em>No trips in this category</em></p>';
        
        let tableHtml = '<table class="data-table"><thead><tr>';
        tableHtml += '<th>Date</th><th>Code</th><th>Destination</th><th>East/West</th><th>Points</th><th>Timezones</th>';
        if (showStatus) tableHtml += '<th>Status</th>';
        tableHtml += '</tr></thead><tbody>';

        trips.forEach(survey => {
            const date = survey.surveySubmittedAt || survey.completionDate || survey.created || survey.timestamp;
            const dateStr = date ? new Date(date).toLocaleDateString() : 'N/A';
            const isComplete = survey.surveyCompleted;
            const status = isComplete ? '✅ Complete' : '⚠️ Partial';
            const statusColor = isComplete ? '#16a34a' : '#f59e0b';
            
            // Process survey code - always extract first section of tripId
            let displayCode = 'N/A';
            if (survey.tripId) {
                // Extract first section of tripId (before any separator like hyphen)
                const tripIdParts = survey.tripId.split(/[-_]/);
                displayCode = tripIdParts[0] || 'N/A';
            }
            
            // Convert travel direction to East/West format
            const timezones = survey.timezonesCount || 0;
            const direction = (timezones === 0) ? 'N/A' : (survey.travelDirection || 'N/A');
            const eastWest = direction === 'east' ? '🌅 East' : direction === 'west' ? '🌇 West' : 'N/A';

            // Points stimulated
            const pointsStimulated = survey.pointsCompleted || 0;

            tableHtml += `<tr>
                <td>${dateStr}</td>
                <td><code>${displayCode}</code></td>
                <td>${survey.destinationCode || 'N/A'}</td>
                <td>${eastWest}</td>
                <td>${pointsStimulated}</td>
                <td>${timezones}</td>`;
            if (showStatus) tableHtml += `<td style="color: ${statusColor}">${status}</td>`;
            tableHtml += `</tr>`;
        });

        tableHtml += '</tbody></table>';
        return tableHtml;
    };
    
    // Valid Trips Section
    html += '<div style="margin-bottom: 30px;">';
    html += `<h3>📊 VALID TRIPS (${validTrips.length})</h3>`;
    
    // Survey Completed
    html += '<div style="margin: 20px 0;">';
    html += `<h4 style="color: #16a34a;">✅ Survey Completed (${validCompleted.length} trips)</h4>`;
    html += renderTripTable(validCompleted, false);
    html += '</div>';
    
    // Survey Not Completed
    html += '<div style="margin: 20px 0;">';
    html += `<h4 style="color: #f59e0b;">⚠️ Survey Not Completed (${validNotCompleted.length} trips)</h4>`;
    html += renderTripTable(validNotCompleted, false);
    html += '</div>';
    
    html += '</div>';
    
    container.innerHTML = html;
}

// Render pagination controls
function renderPaginationControls() {
    if (totalPages <= 1) {
        return '';
    }

    let html = '<div class="pagination-controls">';
    
    // Previous button
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    html += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${prevDisabled}>
        <span class="pagination-arrow">←</span> Previous
    </button>`;
    
    // Page numbers (show up to 5 pages around current page)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<button class="pagination-btn ${activeClass}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
        html += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    html += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${nextDisabled}>
        Next <span class="pagination-arrow">→</span>
    </button>`;
    
    html += '</div>';
    return html;
}

// Go to specific page
function goToPage(page) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        renderRecentSubmissions();
    }
}

// Render stimulation efficacy analysis
function renderStimulationEfficacy() {
    const container = document.getElementById('stimulationEfficacy');
    if (!container) return;
    
    const allData = getCurrentData();
    
    if (!allData || allData.length === 0) {
        container.innerHTML = '<div class="error">No survey data available</div>';
        return;
    }
    
    // Filter to only valid trips (exclude test data)
    const validData = allData.filter(trip => TripValidator && TripValidator.isValidTrip ? TripValidator.isValidTrip(trip) : true);
    
    // Filter to only include completed surveys (ignore app exploration/testing)
    const completedSurveys = validData.filter(survey => survey.surveyCompleted === true);
    
    if (completedSurveys.length === 0) {
        container.innerHTML = '<div class="error">No completed surveys available for analysis</div>';
        return;
    }
    
    
    

    // Group data by stimulation level
    const stimulationGroups = {
        '0 points': [],
        '1-3 points': [],
        '4-6 points': [],
        '7-9 points': [],
        '10-12 points': []
    };

    completedSurveys.forEach(survey => {
        const points = survey.pointsCompleted || 0;
        if (points === 0) stimulationGroups['0 points'].push(survey);
        else if (points <= 3) stimulationGroups['1-3 points'].push(survey);
        else if (points <= 6) stimulationGroups['4-6 points'].push(survey);
        else if (points <= 9) stimulationGroups['7-9 points'].push(survey);
        else stimulationGroups['10-12 points'].push(survey);
    });

    let html = '<div style="margin-bottom: 30px;">';
    html += '<h3>Time Zone Effect vs. Stimulation Analysis</h3>';                                                                       
    html += '<p>Primary analysis: How acupressure stimulation reduces the expected increase in post-travel symptoms from crossing more time zones</p>';                                            
    html += '</div>';

    // Create efficacy table
    html += '<table class="data-table"><thead><tr><th>Stimulation Level</th><th>Sample Size</th><th>Avg Post-Travel Severity</th><th>Avg Time Zones Crossed</th><th>Protection Effect*</th></tr></thead><tbody>';

    Object.entries(stimulationGroups).forEach(([group, surveys]) => {
        if (surveys.length === 0) return;

        // Calculate post-travel severity and protection effect
        let totalPostTravelSeverity = 0;
        let totalTimeZones = 0;
        let validCount = 0;
        const timezones = [];

        surveys.forEach(survey => {
            // Focus on post-travel symptom severity (primary outcome)
            if (survey.postSleepSeverity !== null) {
                totalPostTravelSeverity += survey.postSleepSeverity;
                validCount++;
            }
            
            // Track time zones crossed
            if (survey.timezonesCount) {
                totalTimeZones += survey.timezonesCount;
                timezones.push(survey.timezonesCount);
            }
        });

        const avgPostTravelSeverity = validCount > 0 ? (totalPostTravelSeverity / validCount).toFixed(2) : 'N/A';
        const avgTimeZones = timezones.length > 0 ? (totalTimeZones / timezones.length).toFixed(1) : 'N/A';
        
        // Calculate protection effect (lower severity relative to time zones crossed)
        const protectionEffect = validCount > 0 && timezones.length > 0 && avgTimeZones > 0 ? 
            (avgPostTravelSeverity / avgTimeZones).toFixed(3) : 'N/A';

        html += `<tr>
            <td><strong>${group}</strong></td>
            <td>${surveys.length}</td>
            <td style="color: ${avgPostTravelSeverity < 3 ? '#16a34a' : avgPostTravelSeverity < 4 ? '#eab308' : '#dc2626'}">${avgPostTravelSeverity}</td>                     
            <td>${avgTimeZones}</td>                     
            <td style="color: ${protectionEffect < 0.5 ? '#16a34a' : protectionEffect < 0.7 ? '#eab308' : '#dc2626'}">${protectionEffect}</td>
        </tr>`;
    });

    html += '</tbody></table>';

    // Add Time Zone Analysis
    html += '<h3 style="margin-top: 40px; margin-bottom: 20px;">Primary Analysis: Time Zone → Symptom Relationship</h3>';                                        
    html += '<p>Core research question: Does acupressure stimulation reduce the expected increase in post-travel symptoms from crossing more time zones?</p>';
    
    // Group by time zone ranges
    const tzGroups = {
        '1-3 time zones': [],
        '4-6 time zones': [],
        '7-9 time zones': [],
        '10+ time zones': []
    };

    completedSurveys.forEach(survey => {
        const tz = survey.timezonesCount || 0;
        if (tz <= 3) tzGroups['1-3 time zones'].push(survey);
        else if (tz <= 6) tzGroups['4-6 time zones'].push(survey);
        else if (tz <= 9) tzGroups['7-9 time zones'].push(survey);
        else tzGroups['10+ time zones'].push(survey);
    });

    html += '<table class="data-table"><thead><tr><th>Time Zone Range</th><th>Sample Size</th><th>Avg Stimulation Points</th><th>Avg Post-Travel Severity</th></tr></thead><tbody>';

    Object.entries(tzGroups).forEach(([range, surveys]) => {
        if (surveys.length === 0) return;

        const avgPoints = (surveys.reduce((sum, s) => sum + (s.pointsCompleted || 0), 0) / surveys.length).toFixed(1);
        
        // Calculate sleep post-travel severity only
        const validSleepSurveys = surveys.filter(s => s.postSleepSeverity !== null);
        let avgPostSeverity = 'N/A';

        if (validSleepSurveys.length > 0) {
            avgPostSeverity = (validSleepSurveys.reduce((sum, s) => sum + s.postSleepSeverity, 0) / validSleepSurveys.length).toFixed(2);
        }

        html += `<tr>
            <td><strong>${range}</strong></td>
            <td>${validSleepSurveys.length}</td>
            <td>${avgPoints}</td>
            <td style="color: ${avgPostSeverity < 3 ? '#16a34a' : avgPostSeverity < 4 ? '#eab308' : '#dc2626'}">${avgPostSeverity}</td>
        </tr>`;
    });

    html += '</tbody></table>';

    // Add All Symptoms Analysis - Multi-Series Chart
    html += '<h3 style="margin-top: 40px; margin-bottom: 20px;">All Symptoms Analysis</h3>';
    html += '<p>Interactive chart showing all jet lag symptoms: Sleep, Fatigue, Concentration, Irritability, and GI symptoms</p>';
    
    // Chart container
    html += '<div style="background: white; padding: 20px; border-radius: 10px; margin-top: 15px; height: 500px;">';
    html += '<canvas id="symptomAnalysisChart" width="800" height="400"></canvas>';
    html += '</div>';
    
    // Add explanatory notes
    html += '<div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; border: 1px solid #0ea5e9;">';       
    html += '<h4>📊 Analysis Notes:</h4>';
    html += '<ul style="margin: 10px 0; padding-left: 20px;">';                                                                         
    html += '<li><strong>Post-Travel Severity:</strong> Lower values = better outcomes (1-2 = mild, 3-4 = moderate, 5 = severe)</li>';                  
    html += '<li><strong>Core Research Question:</strong> Does using the app result in less jet lag symptoms?</li>';                
    html += '<li><strong>Three Key Variables:</strong> Post-travel symptom severity (1-5), App use (points stimulated), Time zones crossed</li>';               
    html += '<li><strong>Expected Pattern:</strong> More time zones = worse symptoms, but more app use = reduced symptoms</li>';           
    html += '<li><strong>Success Criteria:</strong> Post-travel symptom levels of 1-2 indicate good results from app usage</li>';           
    html += '</ul>';
    html += '</div>';

    container.innerHTML = html;
    
    // Render the symptom analysis chart
    renderSymptomAnalysisChart(completedSurveys, tzGroups);
}


// Render trip stats (Trip Counts section)
function renderTripStats() {
    const container = document.getElementById('tripStats');
    if (!container) return;
    
    const allData = getCurrentData();
    
    if (!allData || allData.length === 0) {
        container.innerHTML = '<div class="error">No survey data available</div>';
        return;
    }
    
    // Get validation statistics (based on all data, including test trips)
    const validationStats = getValidationStats(allData);
    const breakdown = TripValidator.getValidationBreakdown(allData);
    
    // Calculate detailed breakdown
    const validTrips = allData.filter(trip => TripValidator.isValidTrip(trip));
    const validWithSurveys = validTrips.filter(trip => trip.surveyCompleted === true);
    const validWithoutSurveys = validTrips.filter(trip => trip.surveyCompleted !== true);
    
    // Calculate travel direction for valid trips
    const directions = {};
    validTrips.forEach(trip => {
        if (trip.travelDirection) {
            directions[trip.travelDirection] = (directions[trip.travelDirection] || 0) + 1;
        }
    });
    
    // Format travel direction as separate lines
    let travelDirectionText = '';
    const totalValidTrips = validTrips.length;
    const directionEntries = Object.entries(directions).sort((a, b) => b[1] - a[1]); // Sort by count descending
    if (directionEntries.length > 0) {
        travelDirectionText = directionEntries.map(([direction, count]) => {
            const percentage = totalValidTrips > 0 ? ((count / totalValidTrips) * 100).toFixed(1) : '0.0';
            return `${direction} ${count} (${percentage}%)`;
        }).join('<br>');
    }
    
    let html = '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 0 0 15px 0;">';
    
    const validWithSurveysPercent = validationStats.valid > 0 ? Math.round((validWithSurveys.length / validationStats.valid) * 100) : 0;
    const validWithoutSurveysPercent = validationStats.valid > 0 ? Math.round((validWithoutSurveys.length / validationStats.valid) * 100) : 0;
    
    // Format real trips with survey status
    const realTripsText = `with surveys ${validWithSurveys.length} (${validWithSurveysPercent}%)<br>without surveys ${validWithoutSurveys.length} (${validWithoutSurveysPercent}%)`;
    
    html += '<table style="width: auto; border-collapse: collapse; border: 1px solid #ddd;">';
    html += `<tr><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">Trips (Total / Real / Test):</td><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">${validationStats.total} / ${validationStats.valid} / ${validationStats.invalid}</td></tr>`;
    html += `<tr><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">Real Trips:</td><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">${realTripsText}</td></tr>`;
    html += `<tr><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">Travel Direction:</td><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">${travelDirectionText || 'N/A'}</td></tr>`;
    html += `<tr><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">Legacy Data:</td><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">${breakdown.legacy}</td></tr>`;
    html += `<tr><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">Real Travel:</td><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">${breakdown.real_travel + breakdown.survey_fallback}</td></tr>`;
    html += '<tr><td colspan="2" style="text-align: left; padding-top: 15px; padding: 8px 12px; border-top: 1px solid #ddd; border-left: 1px solid #ddd; border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; font-size: 0.9em;">Real = Legacy data (no TZ fields) or real travel (Arrival # Departure TZ).</td></tr>';
    html += '</table>';
    
    html += '</div>';
    
    container.innerHTML = html;
}


// Render advanced analytics with comprehensive graphs
function renderAdvancedAnalytics() {
    const container = document.getElementById('advancedAnalytics');
    if (!container) return;
    
    const allData = getCurrentData();
    
    if (!allData || allData.length === 0) {
        container.innerHTML = '<div class="error">No survey data available for advanced analytics</div>';
        return;
    }
    
    // Get validation statistics (based on all data, including test trips)
    const validationStats = getValidationStats(allData);
    
    // Filter to only valid trips for analysis (exclude test data)
    const validData = allData.filter(trip => TripValidator.isValidTrip(trip));
    
    // Filter to only include completed surveys for this specific analysis
    const completedSurveys = validData.filter(survey => survey.surveyCompleted === true);
    
    if (completedSurveys.length === 0) {
        container.innerHTML = '<div class="error">No completed surveys available for advanced analytics</div>';
        return;
    }
    
    let html = '<div style="margin-bottom: 30px;">';
    
    // Dose-Response Analysis Section
    html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">';
    html += '<p>Multiple lines showing how different levels of app usage affect symptom severity across time zones crossed. Error bars show ±1 standard error.</p>';
    html += '<div style="background: white; padding: 20px; border-radius: 10px; margin-top: 15px; height: 500px;">';
    html += '<canvas id="doseResponseAnalysisChart" width="800" height="400"></canvas>';
    html += '</div>';
    html += '</div>';
    
    html += '</div>';

    container.innerHTML = html;
    
    // Render the comprehensive dose-response analysis chart
    renderDoseResponseAnalysisChart(completedSurveys);
}

// Render point stimulation analysis table
function renderPointStimulationAnalysis() {
    const container = document.getElementById('pointMappingTable');
    if (!container) return;
    
    const allData = getCurrentData();
    
    if (!allData || allData.length === 0) {
        container.innerHTML = '<div class="error">No survey data available</div>';
        return;
    }

    // Filter to only valid trips (exclude test data)
    const data = allData.filter(trip => TripValidator && TripValidator.isValidTrip ? TripValidator.isValidTrip(trip) : true);
    
    if (data.length === 0) {
        container.innerHTML = '<div class="error">No valid trip data available for analysis</div>';
        return;
    }

    // Update the heading with valid trip count
    const headingElement = document.getElementById('pointAnalysisHeading');
    if (headingElement) {
        headingElement.textContent = `Acupuncture Point Stimulation Analysis across ${data.length} valid trips`;
    }

    // Point mapping data
    const pointMapping = [
        { id: 1, name: 'LU-8', field: 'point1Completed' },
        { id: 2, name: 'LI-1', field: 'point2Completed' },
        { id: 3, name: 'ST-36', field: 'point3Completed' },
        { id: 4, name: 'SP-3', field: 'point4Completed' },
        { id: 5, name: 'HT-8', field: 'point5Completed' },
        { id: 6, name: 'SI-5', field: 'point6Completed' },
        { id: 7, name: 'BL-66', field: 'point7Completed' },
        { id: 8, name: 'KI-3', field: 'point8Completed' },
        { id: 9, name: 'PC-8', field: 'point9Completed' },
        { id: 10, name: 'SJ-6', field: 'point10Completed' },
        { id: 11, name: 'GB-34', field: 'point11Completed' },
        { id: 12, name: 'LIV-3', field: 'point12Completed' }
    ];

    // Calculate stimulation counts for each point
    const pointStats = pointMapping.map(point => {
        let stimulationCount = 0;
        let totalSurveys = 0;
        
        data.forEach(survey => {
            if (survey.surveyCompleted && survey[point.field] !== undefined) {
                totalSurveys++;
                if (survey[point.field] === true) {
                    stimulationCount++;
                }
            }
        });
        
        const stimulationRate = totalSurveys > 0 ? Math.round((stimulationCount / totalSurveys) * 100) : 0;
        
        return {
            ...point,
            stimulationCount,
            totalSurveys,
            stimulationRate
        };
    });

    // Sort by point ID (LU-8 first, then LI-1, ST-36, etc.)
    pointStats.sort((a, b) => a.id - b.id);

    // Generate HTML table
    let html = '<table class="data-table">';
    html += '<thead><tr>';
    html += '<th>Acupuncture Point</th>';
    html += '<th>Stimulation Count</th>';
    html += '<th>Usage Rate</th>';
    html += '</tr></thead><tbody>';

    pointStats.forEach(point => {
        const usageRate = point.totalSurveys > 0 ? `${point.stimulationRate}%` : 'N/A';
        const countDisplay = point.stimulationCount > 0 ? point.stimulationCount : '0';
        
        html += '<tr>';
        html += `<td><strong>${point.name}</strong></td>`;
        html += `<td><span class="highlight">${countDisplay}</span></td>`;
        html += `<td>${usageRate}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';

    container.innerHTML = html;
}
