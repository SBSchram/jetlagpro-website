// JetLagPro Analytics Dashboard JavaScript
// Extracted from analytics-secret.html for better maintainability

// Global variables for data
let surveyData = [];
let isLoading = true;

// Pagination variables for recent submissions
let currentPage = 1;
let itemsPerPage = 100;
let totalPages = 1;

// Firebase REST API endpoint (same as iOS app)
const FIREBASE_REST_URL = "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/tripCompletions";

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
    
    if (surveyData.length === 0) {
        container.innerHTML = '<div class="error">No survey data available</div>';
        return;
    }

    // Show comprehensive trip completion and survey statistics
    let html = '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th><th>Details</th></tr></thead><tbody>';
    
    // Core metrics (moved from top stat cards)
    const totalTrips = surveyData.length;
    const completedTrips = surveyData.filter(s => s.surveyCompleted).length;
    const completionRate = Math.round((completedTrips/totalTrips)*100);
    
    // Recent surveys (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = surveyData.filter(survey => {
        const surveyDate = survey.completionDate || survey.created || survey.timestamp;
        return surveyDate && surveyDate >= sevenDaysAgo;
    }).length;
    
    html += `<tr><td><strong>📝 Total Surveys</strong></td><td>${totalTrips}</td><td>Total research submissions collected</td></tr>`;
    html += `<tr><td><strong>📅 Recent Submissions</strong></td><td>${recentCount}</td><td>Surveys in the last 7 days</td></tr>`;
    html += `<tr><td><strong>✅ Completion Rate</strong></td><td>${completionRate}%</td><td>Percentage of completed surveys</td></tr>`;
    
    // Additional trip completion statistics
    const iosTrips = surveyData.filter(s => s.platform === 'iOS').length;
    const webTrips = surveyData.filter(s => s.platform !== 'iOS').length;
    
    html += `<tr><td><strong>Completed Surveys</strong></td><td>${completedTrips}</td><td>${completionRate}% completion rate</td></tr>`;
    html += `<tr><td><strong>Web Survey Trips</strong></td><td>${webTrips}</td><td>${Math.round((webTrips/totalTrips)*100)}% of total</td></tr>`;

    html += '</tbody></table>';
    
    // Add travel patterns data
    html += '<h3 style="margin-top: 30px; margin-bottom: 15px;">Travel Patterns</h3>';
    
    // Travel direction analysis
    const directions = {};
    const platforms = {};
    
    surveyData.forEach(survey => {
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
    
    if (surveyData.length === 0) {
        container.innerHTML = '<div class="error">No submission data available</div>';
        return;
    }

    // Sort by date (most recent first)
    const sortedSurveys = surveyData.sort((a, b) => {
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
    
    if (surveyData.length === 0) {
        container.innerHTML = '<div class="error">No survey data available</div>';
        return;
    }
    
    // Filter to only include completed surveys (ignore app exploration/testing)
    const completedSurveys = surveyData.filter(survey => survey.surveyCompleted === true);
    
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

    html += '<table class="data-table"><thead><tr><th>Time Zone Range</th><th>Sample Size</th><th>Avg Stimulation Points</th><th>Avg Sleep Improvement</th><th>Avg Post-Travel Severity</th></tr></thead><tbody>';

    Object.entries(tzGroups).forEach(([range, surveys]) => {
        if (surveys.length === 0) return;

        const avgPoints = (surveys.reduce((sum, s) => sum + (s.pointsCompleted || 0), 0) / surveys.length).toFixed(1);
        
        // Calculate sleep improvements
        const validSleepSurveys = surveys.filter(s => s.baselineSleep !== null && s.postSleepSeverity !== null);
        let avgSleepImprovement = 'N/A';
        let avgPostSeverity = 'N/A';

        if (validSleepSurveys.length > 0) {
            avgSleepImprovement = (validSleepSurveys.reduce((sum, s) => sum + (s.baselineSleep - s.postSleepSeverity), 0) / validSleepSurveys.length).toFixed(2);
            avgPostSeverity = (validSleepSurveys.reduce((sum, s) => sum + s.postSleepSeverity, 0) / validSleepSurveys.length).toFixed(2);
        }

        html += `<tr>
            <td><strong>${range}</strong></td>
            <td>${surveys.length}</td>
            <td>${avgPoints}</td>
            <td style="color: ${avgSleepImprovement > 0 ? '#16a34a' : '#dc2626'}">${avgSleepImprovement}</td>
            <td>${avgPostSeverity}</td>
        </tr>`;
    });

    html += '</tbody></table>';

    // Add Travel Direction Analysis
    html += '<h3 style="margin-top: 40px; margin-bottom: 20px;">Travel Direction Analysis</h3>';
    html += '<p>Eastward vs Westward travel effects on jet lag and stimulation effectiveness</p>';
    
    const eastwardSurveys = completedSurveys.filter(s => s.travelDirection === 'Eastward');
    const westwardSurveys = completedSurveys.filter(s => s.travelDirection === 'Westward');

    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px;">';
    
    // Eastward analysis
    html += '<div><h4>🌅 Eastward Travel (More Severe Jet Lag)</h4>';
    if (eastwardSurveys.length > 0) {
        const avgPointsEast = (eastwardSurveys.reduce((sum, s) => sum + (s.pointsCompleted || 0), 0) / eastwardSurveys.length).toFixed(1);
        const avgTzEast = (eastwardSurveys.reduce((sum, s) => sum + (s.timezonesCount || 0), 0) / eastwardSurveys.length).toFixed(1);
        
        const validEastSleep = eastwardSurveys.filter(s => s.baselineSleep !== null && s.postSleepSeverity !== null);
        let avgImprovementEast = 'N/A';
        if (validEastSleep.length > 0) {
            avgImprovementEast = (validEastSleep.reduce((sum, s) => sum + (s.baselineSleep - s.postSleepSeverity), 0) / validEastSleep.length).toFixed(2);
        }

        html += `<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>`;
        html += `<tr><td>Sample Size</td><td>${eastwardSurveys.length}</td></tr>`;
        html += `<tr><td>Avg Stimulation Points</td><td>${avgPointsEast}</td></tr>`;
        html += `<tr><td>Avg Time Zones</td><td>${avgTzEast}</td></tr>`;
        html += `<tr><td>Avg Sleep Improvement</td><td style="color: ${avgImprovementEast > 0 ? '#16a34a' : '#dc2626'}">${avgImprovementEast}</td></tr>`;
        html += '</tbody></table></div>';
    } else {
        html += '<p>No eastward travel data available</p></div>';
    }

    // Westward analysis
    html += '<div><h4>🌇 Westward Travel (Less Severe Jet Lag)</h4>';
    if (westwardSurveys.length > 0) {
        const avgPointsWest = (westwardSurveys.reduce((sum, s) => sum + (s.pointsCompleted || 0), 0) / westwardSurveys.length).toFixed(1);
        const avgTzWest = (westwardSurveys.reduce((sum, s) => sum + (s.timezonesCount || 0), 0) / westwardSurveys.length).toFixed(1);
        
        const validWestSleep = westwardSurveys.filter(s => s.baselineSleep !== null && s.postSleepSeverity !== null);
        let avgImprovementWest = 'N/A';
        if (validWestSleep.length > 0) {
            avgImprovementWest = (validWestSleep.reduce((sum, s) => sum + (s.baselineSleep - s.postSleepSeverity), 0) / validWestSleep.length).toFixed(2);
        }

        html += `<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>`;
        html += `<tr><td>Sample Size</td><td>${westwardSurveys.length}</td></tr>`;
        html += `<tr><td>Avg Stimulation Points</td><td>${avgPointsWest}</td></tr>`;
        html += `<tr><td>Avg Time Zones</td><td>${avgTzWest}</td></tr>`;
        html += `<tr><td>Avg Sleep Improvement</td><td style="color: ${avgImprovementWest > 0 ? '#16a34a' : '#dc2626'}">${avgImprovementWest}</td></tr>`;
        html += '</tbody></table></div>';
    } else {
        html += '<p>No westward travel data available</p></div>';
    }

    html += '</div>';

    // Add explanatory notes
    html += '<div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; border: 1px solid #0ea5e9;">';       
    html += '<h4>📊 Analysis Notes:</h4>';
    html += '<ul style="margin: 10px 0; padding-left: 20px;">';                                                                         
    html += '<li><strong>Post-Travel Severity:</strong> Lower values = better outcomes (1-2 = mild, 3-4 = moderate, 5 = severe)</li>';                  
    html += '<li><strong>Protection Effect:</strong> Lower values = better protection (severity per time zone crossed)</li>';                
    html += '<li><strong>Core Hypothesis:</strong> More time zones = higher symptoms, but more stimulation = reduced increase</li>';               
    html += '<li><strong>Dose-Response:</strong> Higher stimulation levels should show lower protection effect values</li>';           
    html += '</ul>';
    html += '</div>';

    container.innerHTML = html;
}

// Render advanced analytics with comprehensive graphs
function renderAdvancedAnalytics() {
    const container = document.getElementById('advancedAnalytics');
    
    if (surveyData.length === 0) {
        container.innerHTML = '<div class="error">No survey data available for advanced analytics</div>';
        return;
    }
    
    // Filter to only include completed surveys
    const completedSurveys = surveyData.filter(survey => survey.surveyCompleted === true);
    
    if (completedSurveys.length === 0) {
        container.innerHTML = '<div class="error">No completed surveys available for advanced analytics</div>';
        return;
    }
    
    let html = '<div style="margin-bottom: 30px;">';
    html += '<h3>Advanced Research Analytics</h3>';
    html += '<p>Comprehensive analysis of time zones, travel direction, and acupressure point effectiveness</p>';
    html += '</div>';
    
    // Create chart containers
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">';
    html += '<div><canvas id="doseResponseChart" width="400" height="300"></canvas></div>';
    html += '<div><canvas id="timezoneEffectChart" width="400" height="300"></canvas></div>';
    html += '</div>';
    
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">';
    html += '<div><canvas id="directionComparisonChart" width="400" height="300"></canvas></div>';
    html += '<div><canvas id="symptomEffectivenessChart" width="400" height="300"></canvas></div>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 30px;">';
    html += '<h4>3D Heatmap Matrix: Time Zones × Points × Symptom Improvement</h4>';
    html += '<div id="heatmapContainer" style="background: white; padding: 20px; border-radius: 10px; margin-top: 15px;"></div>';
    html += '</div>';
    
    container.innerHTML = html;
    
    // Render all charts
    renderDoseResponseChart(completedSurveys);
    renderTimezoneEffectChart(completedSurveys);
    renderDirectionComparisonChart(completedSurveys);
    renderSymptomEffectivenessChart(completedSurveys);
    render3DHeatmap(completedSurveys);
}
