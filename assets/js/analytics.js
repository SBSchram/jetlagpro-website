// JetLagPro Analytics Dashboard JavaScript
// Extracted from analytics-secret.html for better maintainability

// Global variables for data
let surveyData = [];
let testData = [];
let currentDataSource = 'real'; // 'real' or 'test'
let isLoading = true;
// Validation toggle removed - we analyze all data

// Timezone validation data (DRY)
let tripValidations = [];
let surveyValidations = [];

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
    return getFilteredTrips(data);
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
        renderDashboard();
        
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

// Load timezone validation data (DRY)
async function loadTimezoneValidationData() {
    try {
        console.log('Loading timezone validation data...');
        
        // Load trip validations
        const tripValidationResponse = await fetch('https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/tripValidations');
        const tripValidationData = await tripValidationResponse.json();
        tripValidations = tripValidationData.documents?.map(doc => convertFirestoreDocument(doc)).filter(Boolean) || [];
        
        // Load survey validations
        const surveyValidationResponse = await fetch('https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/surveyValidations');
        const surveyValidationData = await surveyValidationResponse.json();
        surveyValidations = surveyValidationData.documents?.map(doc => convertFirestoreDocument(doc)).filter(Boolean) || [];
        
        console.log(`Loaded ${tripValidations.length} trip validations and ${surveyValidations.length} survey validations`);
    } catch (error) {
        console.error('Error loading timezone validation data:', error);
        // Don't throw - validation data is optional
    }
}

// Render timezone validation statistics (DRY)
function renderTimezoneValidationStats() {
    const container = document.getElementById('timezoneValidationStats');
    if (!container) return;
    
    // Calculate trip validation stats
    const validTrips = tripValidations.filter(v => v.validationResult === 'valid').length;
    const invalidTrips = tripValidations.filter(v => v.validationResult === 'mismatch').length;
    const airplaneModeTrips = tripValidations.filter(v => v.isAirplaneMode).length;
    
    // Calculate survey validation stats
    const validSurveys = surveyValidations.filter(v => v.validationResult === 'valid').length;
    const invalidSurveys = surveyValidations.filter(v => v.validationResult === 'mismatch').length;
    const airplaneModeSurveys = surveyValidations.filter(v => v.isAirplaneMode).length;
    
    // Calculate data quality percentage
    const totalTrips = tripValidations.length;
    const totalSurveys = surveyValidations.length;
    const tripQuality = totalTrips > 0 ? Math.round((validTrips / totalTrips) * 100) : 0;
    const surveyQuality = totalSurveys > 0 ? Math.round((validSurveys / totalSurveys) * 100) : 0;
    
    container.innerHTML = `
        <div class="validation-stats">
            <h3>🌍 Timezone Validation Statistics</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Trip Completion Validation</h4>
                    <div class="stat-item">
                        <span class="stat-label">Valid Trips:</span>
                        <span class="stat-value valid">${validTrips}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Invalid Trips:</span>
                        <span class="stat-value invalid">${invalidTrips}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Airplane Mode:</span>
                        <span class="stat-value airplane">${airplaneModeTrips}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Data Quality:</span>
                        <span class="stat-value quality">${tripQuality}%</span>
                    </div>
                </div>
                <div class="stat-card">
                    <h4>Survey Access Validation</h4>
                    <div class="stat-item">
                        <span class="stat-label">Valid Surveys:</span>
                        <span class="stat-value valid">${validSurveys}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Invalid Surveys:</span>
                        <span class="stat-value invalid">${invalidSurveys}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Airplane Mode:</span>
                        <span class="stat-value airplane">${airplaneModeSurveys}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Data Quality:</span>
                        <span class="stat-value quality">${surveyQuality}%</span>
                    </div>
                </div>
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
    renderAdvancedAnalytics();
    renderStimulationEfficacy();
    renderSymptomAnalysis();
    renderPointStimulationAnalysis();
    renderRecentSubmissions();
}

// Show loading state
function showLoadingState() {
    document.getElementById('advancedAnalytics').innerHTML = '<div class="loading">Loading advanced analytics...</div>';
    document.getElementById('stimulationEfficacy').innerHTML = '<div class="loading">Loading efficacy data...</div>';
    document.getElementById('symptomAnalysis').innerHTML = '<div class="loading">Loading trip data...</div>';
    document.getElementById('pointMappingTable').innerHTML = '<div class="loading">Loading point stimulation data...</div>';
    document.getElementById('recentSubmissions').innerHTML = '<div class="loading">Loading recent data...</div>';
}

// Show error message
function showError(message) {
    const container = document.getElementById('symptomAnalysis');
    container.innerHTML = `<div class="error">${message}</div>`;
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
        
        await loadSurveyDataWithService();
        renderDashboard();
        
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

// Auto-refresh every 5 minutes
setInterval(() => {
    if (!isLoading) {
        loadDashboardData();
    }
}, 5 * 60 * 1000);

// Render symptom analysis (updated for new data structure)
function renderSymptomAnalysis() {
    const container = document.getElementById('symptomAnalysis');
    const data = getCurrentData();
    
    if (data.length === 0) {
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
    
    html += `<tr><td><strong>📝 Total Surveys</strong></td><td>${totalTrips}</td><td>Total research submissions collected</td></tr>`;
    html += `<tr><td><strong>📅 Recent Submissions</strong></td><td>${recentCount}</td><td>Surveys in the last 7 days</td></tr>`;
    html += `<tr><td><strong>✅ Completion Rate</strong></td><td>${completionRate}%</td><td>Percentage of completed surveys</td></tr>`;
    
    // Additional trip completion statistics
    const iosTrips = data.filter(s => s.platform === 'iOS').length;
    const webTrips = data.filter(s => s.platform !== 'iOS').length;
    
    html += `<tr><td><strong>Completed Surveys</strong></td><td>${completedTrips}</td><td>${completionRate}% completion rate</td></tr>`;
    html += `<tr><td><strong>Web Survey Trips</strong></td><td>${webTrips}</td><td>${Math.round((webTrips/totalTrips)*100)}% of total</td></tr>`;

    html += '</tbody></table>';
    
    // Add travel patterns data
    html += '<h3 style="margin-top: 30px; margin-bottom: 15px;">Travel Patterns</h3>';
    
    // Travel direction analysis
    const directions = {};
    const platforms = {};
    
    data.forEach(survey => {
        if (survey.travelDirection) {
            directions[survey.travelDirection] = (directions[survey.travelDirection] || 0) + 1;
        }
        if (survey.platform) {
            platforms[survey.platform] = (platforms[survey.platform] || 0) + 1;
        }
    });

    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px;">';
    
    // Travel direction chart
    html += '<div><h4>Travel Direction</h4><table class="data-table"><thead><tr><th>Direction</th><th>Count</th><th>%</th></tr></thead><tbody>';
    Object.entries(directions).forEach(([direction, count]) => {
        const percentage = ((count / surveyData.length) * 100).toFixed(1);
        html += `<tr><td>${direction}</td><td>${count}</td><td>${percentage}%</td></tr>`;
    });
    html += '</tbody></table></div>';

    // Platform usage chart
    html += '<div><h4>Platform Usage</h4><table class="data-table"><thead><tr><th>Platform</th><th>Count</th><th>%</th></tr></thead><tbody>';
    Object.entries(platforms).forEach(([platform, count]) => {
        const percentage = ((count / surveyData.length) * 100).toFixed(1);
        html += `<tr><td>${platform}</td><td>${count}</td><td>${percentage}%</td></tr>`;
    });
    html += '</tbody></table></div>';

    html += '</div>';
    
    container.innerHTML = html;
}

// Render recent submissions with pagination
function renderRecentSubmissions() {
    const container = document.getElementById('recentSubmissions');
    const data = getCurrentData();
    
    if (data.length === 0) {
        container.innerHTML = '<div class="error">No submission data available</div>';
        return;
    }

    // Sort by date (most recent first)
    const sortedSurveys = data.sort((a, b) => {
        const dateA = a.surveySubmittedAt || a.completionDate || a.created || a.timestamp;
        const dateB = b.surveySubmittedAt || b.completionDate || b.created || b.timestamp;
        return new Date(dateB) - new Date(dateA); // Most recent first
    });

    // Calculate pagination
    totalPages = Math.ceil(sortedSurveys.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageSurveys = sortedSurveys.slice(startIndex, endIndex);

    // Build table HTML
    let html = '<div class="pagination-info">';
    html += `<span>Showing ${startIndex + 1}-${Math.min(endIndex, sortedSurveys.length)} of ${sortedSurveys.length} submissions</span>`;
    html += '</div>';
    
    html += '<table class="data-table"><thead><tr><th>Date</th><th>Code</th><th>Destination</th><th>East/West</th><th>Points</th><th>Timezones</th><th>Status</th></tr></thead><tbody>';

    pageSurveys.forEach(survey => {
        const date = survey.surveySubmittedAt || survey.completionDate || survey.created || survey.timestamp;
        const dateStr = date ? new Date(date).toLocaleDateString() : 'N/A';
        const isComplete = survey.surveyCompleted;
        const status = isComplete ? '✅ Complete' : '⚠️ Partial';
        const statusColor = isComplete ? '#16a34a' : '#f59e0b';
        
        // Process survey code: JLP-[device]-[dest][e/w]-[YYMMDD]-[time]
        let displayCode = 'N/A';
        
        if (survey.surveyCode) {
            // Remove JLP- prefix
            displayCode = survey.surveyCode.replace(/^JLP-/, '');
        }
        
        // Convert travel direction to East/West format
        // If timezones is 0, there's no travel, so direction should be N/A
        const timezones = survey.timezonesCount || 0;
        const direction = (timezones === 0) ? 'N/A' : (survey.travelDirection || 'N/A');
        const eastWest = direction === 'east' ? '🌅 East' : direction === 'west' ? '🌇 West' : 'N/A';

        // Points stimulated
        const pointsStimulated = survey.pointsCompleted || 0;

        html += `<tr>
            <td>${dateStr}</td>
            <td><code>${displayCode}</code></td>
            <td>${survey.destinationCode || 'N/A'}</td>
            <td>${eastWest}</td>
            <td>${pointsStimulated}</td>
            <td>${survey.timezonesCount || 0}</td>
            <td style="color: ${statusColor}">${status}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    
    // Add pagination controls
    html += renderPaginationControls();
    
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
    const data = getCurrentData();
    
    if (data.length === 0) {
        container.innerHTML = '<div class="error">No survey data available</div>';
        return;
    }
    
    // Filter to only include completed surveys (ignore app exploration/testing)
    const completedSurveys = data.filter(survey => survey.surveyCompleted === true);
    
    if (completedSurveys.length === 0) {
        container.innerHTML = '<div class="error">No completed surveys available for analysis</div>';
        return;
    }
    
    
    // Debug: Log sample survey data to see actual values
    if (completedSurveys.length > 0) {
        console.log('Sample survey data:', {
            baseline: completedSurveys[0].baselineSleep,
            anticipated: completedSurveys[0].anticipatedSleepSeverity,
            post: completedSurveys[0].postSleepSeverity
        });
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
    renderSymptomAnalysisChart(data, tzGroups);
}

// Render advanced analytics with comprehensive graphs
function renderAdvancedAnalytics() {
    const container = document.getElementById('advancedAnalytics');
    const data = getCurrentData();
    
    if (data.length === 0) {
        container.innerHTML = '<div class="error">No survey data available for advanced analytics</div>';
        return;
    }
    
    // Get validation statistics (based on all data, not just surveys)
    console.log('🔍 DEBUG: Data length:', data.length);
    console.log('🔍 DEBUG: Sample trip:', data[0]);
    const validationStats = getValidationStats(data);
    console.log('🔍 DEBUG: Validation stats:', validationStats);
    
    // Filter to only include completed surveys for this specific analysis
    const completedSurveys = data.filter(survey => survey.surveyCompleted === true);
    
    if (completedSurveys.length === 0) {
        container.innerHTML = '<div class="error">No completed surveys available for advanced analytics</div>';
        return;
    }
    
    let html = '<div style="margin-bottom: 30px;">';
    html += '<h3>Advanced Research Analytics</h3>';
    html += '<p>Comprehensive analysis of time zones crossed, app usage, and symptom severity</p>';
    
    // Add validation statistics
    html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">';
    html += '<h4>📊 Data Quality Validation</h4>';
    html += `<p><strong>Total Trips:</strong> ${validationStats.total}</p>`;
    html += `<p><strong>Valid Trips:</strong> ${validationStats.valid} (${validationStats.validPercentage}%)</p>`;
    html += `<p><strong>Test Data:</strong> ${validationStats.invalid} (${validationStats.invalidPercentage}%)</p>`;
    html += `<p><strong>Completed Surveys:</strong> ${completedSurveys.length}</p>`;
    html += '<p><em>📊 Analyzing all data (valid and test trips)</em></p>';
    html += '</div>';
    html += '</div>';
    
    // Create the comprehensive dose-response analysis chart
    html += '<div style="margin-bottom: 30px;">';
    html += '<h4>Dose-Response Analysis: App Usage vs Jet Lag Severity</h4>';
    html += '<p>Multiple lines showing how different levels of app usage affect symptom severity across time zones crossed. Error bars show ±1 standard error.</p>';
    html += '<div style="background: white; padding: 20px; border-radius: 10px; margin-top: 15px; height: 500px;">';
    html += '<canvas id="doseResponseAnalysisChart" width="800" height="400"></canvas>';
    html += '</div>';
    html += '</div>';
    
    container.innerHTML = html;
    
    // Render the comprehensive dose-response analysis chart
    renderDoseResponseAnalysisChart(completedSurveys);
}

// Render point stimulation analysis table
function renderPointStimulationAnalysis() {
    const container = document.getElementById('pointMappingTable');
    const data = getCurrentData();
    
    if (data.length === 0) {
        container.innerHTML = '<div class="error">No survey data available</div>';
        return;
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

    // Add summary statistics
    const totalStimulations = pointStats.reduce((sum, point) => sum + point.stimulationCount, 0);
    const avgUsageRate = pointStats.length > 0 ? 
        Math.round(pointStats.reduce((sum, point) => sum + point.stimulationRate, 0) / pointStats.length) : 0;
    
    // Find most and least used points
    const sortedByUsage = [...pointStats].sort((a, b) => b.stimulationCount - a.stimulationCount);
    const mostUsed = sortedByUsage[0];
    const leastUsed = sortedByUsage[sortedByUsage.length - 1];
    
    html += '<div class="mapping-notes" style="margin-top: 20px;">';
    html += '<h4>📊 Point Usage Summary:</h4>';
    html += `<ul>`;
    html += `<li><strong>Total Stimulations:</strong> ${totalStimulations} across all points</li>`;
    html += `<li><strong>Average Usage Rate:</strong> ${avgUsageRate}% across all points</li>`;
    html += `<li><strong>Most Used Point:</strong> ${mostUsed?.name} (${mostUsed?.stimulationCount} times)</li>`;
    html += `<li><strong>Least Used Point:</strong> ${leastUsed?.name} (${leastUsed?.stimulationCount} times)</li>`;
    html += '</ul>';
    html += '</div>';

    container.innerHTML = html;
}
