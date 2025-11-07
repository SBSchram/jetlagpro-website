// JetLagPro Analytics Dashboard JavaScript
// Extracted from analytics-secret.html for better maintainability

// Global variables for data
let surveyData = [];
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

// Helper function to get validation statistics
function getValidationStats(trips) {
    return TripValidator.getValidationStats(trips);
}

// Firebase REST API endpoint (same as iOS app)
const FIREBASE_REST_URL = "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/tripCompletions";

// Get current data source (with developer ID filtering)
function getCurrentData() {
    const data = surveyData || [];
    
    // Filter out developer trip IDs - exclude from all analysis
    const developerTripIds = ['2330B376', '7482966F'];
    return data.filter(trip => {
        const tripId = trip.tripId || '';
        // Check if tripId starts with any developer ID (handles both exact match and extended IDs)
        return !developerTripIds.some(devId => tripId.startsWith(devId));
    });
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


// Convert Firestore document format to flat structure (handles both old nested and new flattened formats)
function convertFirestoreDocument(document) {
    try {
        const fields = document.fields;
        if (!fields) return null;
        
        // Helper function to extract values from Firestore format (handles both old nested and new flat formats)
        const extractValue = (fieldName, nestedPath = null) => {
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
        
        // Convert to flat structure matching the iOS app data format
        // Try new format first, then fall back to old nested format
        const flatData = {
            id: document.name ? document.name.split('/').pop() : null,
            surveyCode: extractValue('surveyCode') || extractValue('tripData', 'surveyCode'),
            tripId: extractValue('tripId') || extractValue('tripData', 'tripId'),
            platform: extractValue('platform') || extractValue('tripData', 'platform'),
            appVersion: extractValue('appVersion') || extractValue('tripData', 'appVersion'),
            destinationCode: extractValue('destinationCode') || extractValue('tripData', 'destinationCode'),
            timezonesCount: extractValue('timezonesCount') || extractValue('tripData', 'timezonesCount'),
            travelDirection: extractValue('travelDirection') || extractValue('tripData', 'travelDirection'),
            pointsCompleted: extractValue('pointsCompleted') || extractValue('tripData', 'pointsCompleted'),
            startDate: extractValue('startDate') || extractValue('tripData', 'startDate'),
            completionDate: extractValue('completionDate') || extractValue('tripData', 'completionDate'),
            completionMethod: extractValue('completionMethod') || extractValue('tripData', 'completionMethod'),
            arrivalTimeZone: extractValue('arrivalTimeZone') || extractValue('tripData', 'arrivalTimeZone') || extractValue('arrivalTimeZone'),
            originTimezone: extractValue('originTimezone') || extractValue('tripData', 'originTimezone') || extractValue('originTimezone'),
            surveyCompleted: extractValue('surveyCompleted') || extractValue('surveyData', 'surveyCompleted'),
            created: extractValue('created') || extractValue('tripData', 'created'),
            
            // Extract individual point completion status
            point1Completed: extractValue('point1Completed'),
            point2Completed: extractValue('point2Completed'),
            point3Completed: extractValue('point3Completed'),
            point4Completed: extractValue('point4Completed'),
            point5Completed: extractValue('point5Completed'),
            point6Completed: extractValue('point6Completed'),
            point7Completed: extractValue('point7Completed'),
            point8Completed: extractValue('point8Completed'),
            point9Completed: extractValue('point9Completed'),
            point10Completed: extractValue('point10Completed'),
            point11Completed: extractValue('point11Completed'),
            point12Completed: extractValue('point12Completed'),
            
            // Note: Baseline/typical symptom data removed from survey - now focusing on anticipated vs post-travel
            
            // Extract anticipated symptoms - handles both formats
            anticipatedSleepSeverity: extractValue('sleepExpectations') || extractValue('surveyData', 'sleepExpectations'),
            anticipatedFatigueSeverity: extractValue('fatigueExpectations') || extractValue('surveyData', 'fatigueExpectations'),
            anticipatedConcentrationSeverity: extractValue('concentrationExpectations') || extractValue('surveyData', 'concentrationExpectations'),
            anticipatedIrritabilitySeverity: extractValue('irritabilityExpectations') || extractValue('surveyData', 'irritabilityExpectations'),
            anticipatedGISeverity: extractValue('giExpectations') || extractValue('surveyData', 'giExpectations'),
            
            // Extract post-travel symptoms - handles both formats
            postSleepSeverity: extractValue('sleepPost') || extractValue('surveyData', 'sleepPost'),
            postFatigueSeverity: extractValue('fatiguePost') || extractValue('surveyData', 'fatiguePost'),
            postConcentrationSeverity: extractValue('concentrationPost') || extractValue('surveyData', 'concentrationPost'),
            postIrritabilitySeverity: extractValue('irritabilityPost') || extractValue('surveyData', 'irritabilityPost'),
            postMotivationSeverity: extractValue('motivationPost') || extractValue('surveyData', 'motivationPost'),
            postGISeverity: extractValue('giPost') || extractValue('surveyData', 'giPost'),
            
            // Extract demographics - only age (gender and travel experience removed)
            age: extractValue('age') || extractValue('ageRange'),
            region: extractValue('region'),
            
            // For compatibility with existing dashboard logic - handles both formats
            timestamp: extractValue('completionDate') || extractValue('created') || extractValue('tripData', 'completionDate'),
            timezones_count: extractValue('timezonesCount') || extractValue('tripData', 'timezonesCount'),
            travel_direction: extractValue('travelDirection') || extractValue('tripData', 'travelDirection')
        };
        
        return flatData;
        
    } catch (error) {
        console.error('Error converting document:', error);
        return null;
    }
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

// Render recent submissions
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

    // Update the section heading with trip count
    const sectionHeading = container.parentElement.querySelector('h2');
    if (sectionHeading) {
        sectionHeading.innerHTML = `<span class="icon">🕒</span>Recent Submissions (${validTrips.length} trips)`;
    }

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
    const validData = allData.filter(trip => TripValidator.isValidTrip(trip));
    
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
    
    // Format confirmed trips with survey status
    const confirmedTripsText = `with surveys ${validWithSurveys.length} (${validWithSurveysPercent}%)<br>without surveys ${validWithoutSurveys.length} (${validWithoutSurveysPercent}%)`;
    
    // Format data type on separate lines
    const dataTypeText = `Early Data (${breakdown.legacy})<br>Confirmed Travel (${breakdown.real_travel + breakdown.survey_fallback})`;
    
    html += '<table style="width: auto; border-collapse: collapse; border: 1px solid #ddd;">';
    html += `<tr><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">Trips (Total / Confirmed / Test):</td><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">${validationStats.total} / ${validationStats.valid} / ${validationStats.invalid}</td></tr>`;
    html += `<tr><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">Confirmed Trips:</td><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">${confirmedTripsText}</td></tr>`;
    html += `<tr><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">Travel Direction:</td><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">${travelDirectionText || 'N/A'}</td></tr>`;
    html += `<tr><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">Data Type:</td><td style="text-align: left; padding: 8px 12px; border: 1px solid #ddd;">${dataTypeText}</td></tr>`;
    html += '<tr><td colspan="2" style="text-align: left; padding-top: 15px; padding: 8px 12px; border-top: 1px solid #ddd; border-left: 1px solid #ddd; border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; font-size: 0.9em;">Confirmed = Early data (no TZ fields) or travel where Arrival TZ # Departure TZ</td></tr>';
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
    html += `<h3>Dose-Response Analysis for ${completedSurveys.length} trips</h3>`;
    html += '<p>Multiple lines show how different levels of app usage affect symptom severity across time zones crossed.<br>Error bars show ±1 standard error.</p>';
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
    const data = allData.filter(trip => TripValidator.isValidTrip(trip));
    
    if (data.length === 0) {
        container.innerHTML = '<div class="error">No valid trip data available for analysis</div>';
        return;
    }

    // Update the section heading with valid trip count
    const headingElement = document.getElementById('pointMappingHeading');
    if (headingElement) {
        headingElement.innerHTML = `<span class="icon">🎯</span>Acupuncture Point Stimulation Analysis (${data.length} trips)`;
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
