// JetLagPro Analytics Dashboard JavaScript
// Extracted from analytics-secret.html for better maintainability

// Global variables for data
let surveyData = [];
let testData = [];
let currentDataSource = 'real'; // 'real' or 'test'
let isLoading = true;

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
    return currentDataSource === 'real' ? surveyData : testData;
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
            postGISeverity: extractInteger('giPost') || extractInteger('surveyData', 'giPost'),
            
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
    renderSymptomAnalysis();
    renderStimulationEfficacy();
    renderAdvancedAnalytics();
    renderRecentSubmissions();
}

// Show loading state
function showLoadingState() {
    document.getElementById('symptomAnalysis').innerHTML = '<div class="loading">Loading trip data...</div>';
    document.getElementById('stimulationEfficacy').innerHTML = '<div class="loading">Loading efficacy data...</div>';
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

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
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
        const surveyDate = survey.completionDate || survey.created || survey.timestamp;
        return surveyDate && surveyDate >= sevenDaysAgo;
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
        const dateA = a.completionDate || a.created || a.timestamp;
        const dateB = b.completionDate || b.created || b.timestamp;
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
    
    html += '<table class="data-table"><thead><tr><th>Date</th><th>Code</th><th>Destination</th><th>East/West</th><th>Timezones</th><th>Status</th></tr></thead><tbody>';

    pageSurveys.forEach(survey => {
        const date = survey.completionDate || survey.created || survey.timestamp;
        const dateStr = date ? new Date(date).toLocaleDateString() : 'N/A';
        const isComplete = survey.surveyCompleted;
        const status = isComplete ? '✅ Complete' : '⚠️ Partial';
        const statusColor = isComplete ? '#16a34a' : '#f59e0b';
        
        // Convert travel direction to East/West format
        // If timezones is 0, there's no travel, so direction should be N/A
        const timezones = survey.timezonesCount || 0;
        const direction = (timezones === 0) ? 'N/A' : (survey.travelDirection || 'N/A');
        const eastWest = direction === 'east' ? '🌅 East' : direction === 'west' ? '🌇 West' : 'N/A';

        html += `<tr>
            <td>${dateStr}</td>
            <td><code>${survey.surveyCode || 'N/A'}</code></td>
            <td>${survey.destinationCode || 'N/A'}</td>
            <td>${eastWest}</td>
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

    // Add All Symptoms Analysis
    html += '<h3 style="margin-top: 40px; margin-bottom: 20px;">All Symptoms Analysis</h3>';
    html += '<p>Analysis of all jet lag symptoms: Sleep, Fatigue, Concentration, Irritability, and GI symptoms</p>';
    
    const symptoms = [
        { name: 'Sleep', baseline: 'baselineSleep', post: 'postSleepSeverity' },
        { name: 'Fatigue', baseline: 'baselineFatigue', post: 'postFatigueSeverity' },
        { name: 'Concentration', baseline: 'baselineConcentration', post: 'postConcentrationSeverity' },
        { name: 'Irritability', baseline: 'baselineIrritability', post: 'postIrritabilitySeverity' },
        { name: 'GI', baseline: 'baselineGI', post: 'postGISeverity' }
    ];

    symptoms.forEach(symptom => {
        html += `<h4 style="margin-top: 30px; margin-bottom: 15px;">${symptom.name} Symptoms</h4>`;
        html += '<table class="data-table"><thead><tr><th>Time Zone Range</th><th>Sample Size</th><th>Avg Stimulation Points</th><th>Avg Post-Travel Severity</th></tr></thead><tbody>';

        Object.entries(tzGroups).forEach(([range, surveys]) => {
            if (surveys.length === 0) return;

            const avgPoints = (surveys.reduce((sum, s) => sum + (s.pointsCompleted || 0), 0) / surveys.length).toFixed(1);
            
            // Calculate symptom-specific data - only post-travel severity
            const validSymptomSurveys = surveys.filter(s => s[symptom.post] !== null);
            let avgPostSeverity = 'N/A';

            if (validSymptomSurveys.length > 0) {
                avgPostSeverity = (validSymptomSurveys.reduce((sum, s) => sum + s[symptom.post], 0) / validSymptomSurveys.length).toFixed(2);
            }

            html += `<tr>
                <td><strong>${range}</strong></td>
                <td>${validSymptomSurveys.length}</td>
                <td>${avgPoints}</td>
                <td style="color: ${avgPostSeverity < 3 ? '#16a34a' : avgPostSeverity < 4 ? '#eab308' : '#dc2626'}">${avgPostSeverity}</td>
            </tr>`;
        });

        html += '</tbody></table>';
    });

    // Add Aggregate Symptom Score Analysis
    html += '<h4 style="margin-top: 30px; margin-bottom: 15px;">Aggregate Symptom Score</h4>';
    html += '<p>Combined analysis of all symptoms to show overall jet lag severity</p>';
    html += '<table class="data-table"><thead><tr><th>Time Zone Range</th><th>Sample Size</th><th>Avg Stimulation Points</th><th>Avg Aggregate Post-Travel Severity</th></tr></thead><tbody>';

    Object.entries(tzGroups).forEach(([range, surveys]) => {
        if (surveys.length === 0) return;

        const avgPoints = (surveys.reduce((sum, s) => sum + (s.pointsCompleted || 0), 0) / surveys.length).toFixed(1);
        
        // Calculate aggregate scores (average of all available post-travel symptoms)
        const validAggregateSurveys = surveys.filter(s => {
            const symptoms = ['postSleepSeverity', 'postFatigueSeverity', 'postConcentrationSeverity', 'postIrritabilitySeverity', 'postGISeverity'];
            return symptoms.some(symptom => s[symptom] !== null);
        });

        let avgAggregatePost = 'N/A';

        if (validAggregateSurveys.length > 0) {
            const aggregatePostScores = validAggregateSurveys.map(s => {
                const symptoms = ['postSleepSeverity', 'postFatigueSeverity', 'postConcentrationSeverity', 'postIrritabilitySeverity', 'postGISeverity'];
                const validSymptoms = symptoms.filter(symptom => s[symptom] !== null);
                return validSymptoms.length > 0 ? validSymptoms.reduce((sum, symptom) => sum + s[symptom], 0) / validSymptoms.length : 0;
            });

            avgAggregatePost = (aggregatePostScores.reduce((sum, score) => sum + score, 0) / aggregatePostScores.length).toFixed(2);
        }

        html += `<tr>
            <td><strong>${range}</strong></td>
            <td>${validAggregateSurveys.length}</td>
            <td>${avgPoints}</td>
            <td style="color: ${avgAggregatePost < 3 ? '#16a34a' : avgAggregatePost < 4 ? '#eab308' : '#dc2626'}">${avgAggregatePost}</td>
        </tr>`;
    });

    html += '</tbody></table>';

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
}

// Render advanced analytics with comprehensive graphs
function renderAdvancedAnalytics() {
    const container = document.getElementById('advancedAnalytics');
    const data = getCurrentData();
    
    if (data.length === 0) {
        container.innerHTML = '<div class="error">No survey data available for advanced analytics</div>';
        return;
    }
    
    // Filter to only include completed surveys
    const completedSurveys = data.filter(survey => survey.surveyCompleted === true);
    
    if (completedSurveys.length === 0) {
        container.innerHTML = '<div class="error">No completed surveys available for advanced analytics</div>';
        return;
    }
    
    let html = '<div style="margin-bottom: 30px;">';
    html += '<h3>Advanced Research Analytics</h3>';
    html += '<p>Comprehensive analysis of time zones crossed, app usage, and symptom severity</p>';
    html += '</div>';
    
    // Create chart containers
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">';
    html += '<div><canvas id="doseResponseChart" width="400" height="300"></canvas></div>';
    html += '<div><canvas id="timezoneEffectChart" width="400" height="300"></canvas></div>';
    html += '</div>';
    
    html += '<div style="display: grid; grid-template-columns: 1fr; gap: 30px; margin-bottom: 30px;">';
    html += '<div><canvas id="symptomEffectivenessChart" width="400" height="300"></canvas></div>';
    html += '</div>';
    
    // Add the new dose-response analysis chart
    html += '<div style="margin-bottom: 30px;">';
    html += '<h4>Dose-Response Analysis: App Usage vs Jet Lag Severity</h4>';
    html += '<p>Multiple lines showing how different levels of app usage affect symptom severity across time zones crossed</p>';
    html += '<div style="background: white; padding: 20px; border-radius: 10px; margin-top: 15px; height: 500px;">';
    html += '<canvas id="doseResponseAnalysisChart" width="800" height="400"></canvas>';
    html += '</div>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 30px;">';
    html += '<h4>3D Heatmap Matrix: Time Zones × Points × Symptom Improvement</h4>';
    html += '<div id="heatmapContainer" style="background: white; padding: 20px; border-radius: 10px; margin-top: 15px;"></div>';
    html += '</div>';
    
    container.innerHTML = html;
    
    // Render all charts
    renderDoseResponseChart(completedSurveys);
    renderTimezoneEffectChart(completedSurveys);
    renderSymptomEffectivenessChart(completedSurveys);
    renderDoseResponseAnalysisChart(completedSurveys);
    render3DHeatmap(completedSurveys);
}
