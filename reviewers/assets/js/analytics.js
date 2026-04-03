// JetLagPro Analytics Dashboard JavaScript
// Extracted from analytics-secret.html for better maintainability

// Global variables for data
let surveyData = [];
let isLoading = true;
let airportCodeToCity = null; // Cache for airport code to city mapping


// Firebase service instance (new integration)
let firebaseService = null;

/**
 * Whether the trip used the cramped (economy-friendly) point set for substitutable slots 4,7,8,11,12.
 * - useCrampedPoints === true  → cramped (SP-10, BL-2, KI-27, GB-20, LIV-8).
 * - useCrampedPoints === false → original horary (SP-3, BL-66, KI-10, GB-41, LIV-1), e.g. non-cramped seating.
 * - Field missing/undefined    → legacy data (only original points were logged) → treat as horary for analysis.
 */
function tripUsesCrampedPointSet(trip) {
    return trip.useCrampedPoints === true;
}

/** Meridian label for journey slot 1–12 (must match iOS HoraryPoint pointMap). */
function slotToMeridianName(slotId, useCramped) {
    const shared = {
        1: 'LU-8',
        2: 'LI-1',
        3: 'ST-36',
        5: 'HT-8',
        6: 'SI-5',
        9: 'PC-8',
        10: 'SJ-6'
    };
    if (shared[slotId]) return shared[slotId];
    if (slotId === 4) return useCramped ? 'SP-10' : 'SP-3';
    if (slotId === 7) return useCramped ? 'BL-2' : 'BL-66';
    if (slotId === 8) return useCramped ? 'KI-27' : 'KI-10';
    if (slotId === 11) return useCramped ? 'GB-20' : 'GB-41';
    if (slotId === 12) return useCramped ? 'LIV-8' : 'LIV-1';
    return `Point-${slotId}`;
}

// Legacy: single-ID label without trip context (horary names — avoid for per-trip lists)
function getPointName(pointId) {
    return slotToMeridianName(pointId, false);
}

function getPointNameForTrip(pointId, trip) {
    return slotToMeridianName(pointId, tripUsesCrampedPointSet(trip));
}

// Helper function to get all completed acupuncture points for a survey
function getCompletedPoints(survey) {
    const completedPoints = [];
    for (let i = 1; i <= 12; i++) {
        const pointField = `point${i}Completed`;
        if (survey[pointField]) {
            completedPoints.push(getPointNameForTrip(i, survey));
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

// Developer device IDs - use single source of truth from TripValidator
// Note: trip-validator.js must be loaded before this file
const DEVELOPER_DEVICE_IDS = typeof TripValidator !== 'undefined' 
    ? TripValidator.DEVELOPER_DEVICE_IDS 
    : ['2330B376', '7482966F', '5E001B36', '23DB54B0', '1CDD41FC']; // Fallback if TripValidator not available

// Check if a trip is from a developer device
function isDeveloperTrip(trip) {
    const tripId = trip.tripId || '';
    return DEVELOPER_DEVICE_IDS.some(devId => tripId.startsWith(devId));
}

// Post-landing trips: device 4A473DF4 did acupressure after arrival (TZ=0 in raw data).
// We treat them as "with surveys" and display "Post-Landing*" instead of "0 TZ".
const POST_LANDING_DEVICE_ID = '4A473DF4';
const POST_LANDING_DESTINATIONS = ['HNL', 'JFK'];
function isPostLandingTrip(trip) {
    const deviceId = (trip.tripId || '').split(/[-_]/)[0] || '';
    const dest = (trip.destinationCode || '').toUpperCase().trim();
    return deviceId === POST_LANDING_DEVICE_ID && POST_LANDING_DESTINATIONS.includes(dest);
}

// Get all data (unfiltered - includes developer trips)
function getAllData() {
    return surveyData || [];
}

// Get current data source (with developer ID filtering - for research analysis only
function getCurrentData() {
    const data = getAllData();
    // Filter out developer trip IDs - exclude from research analysis
    return data.filter(trip => !isDeveloperTrip(trip));
}

// Initialize function (no Firebase SDK needed)
async function initializeDashboard() {
    try {
        // Pre-load airport mapping (DRY - use existing airports.json)
        await loadAirportMapping();
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
        
        // Save scroll position and hash before loading
        const savedScrollY = window.scrollY || window.pageYOffset;
        const savedHash = window.location.hash;
        
        showLoadingState();
        
        await loadSurveyData();
        
        // Ensure data is fully loaded before rendering
        if (surveyData && surveyData.length > 0) {
            console.log(`📊 Data loaded successfully: ${surveyData.length} records`);
            // Small delay to ensure DOM and TripValidator are ready
            setTimeout(() => {
                renderDashboard();
                
                // Restore scroll position or navigate to hash anchor
                if (savedHash) {
                    // If there's a hash, scroll to that anchor (with offset for sticky nav)
                    setTimeout(() => {
                        const targetElement = document.querySelector(savedHash);
                        if (targetElement) {
                            const offset = 80; // Account for sticky nav
                            const elementPosition = targetElement.getBoundingClientRect().top;
                            const offsetPosition = elementPosition + window.pageYOffset - offset;
                            window.scrollTo({
                                top: offsetPosition,
                                behavior: 'instant'
                            });
                        }
                    }, 200);
                } else if (savedScrollY > 0) {
                    // Otherwise, restore the previous scroll position
                    setTimeout(() => {
                        window.scrollTo({
                            top: savedScrollY,
                            behavior: 'instant'
                        });
                    }, 200);
                }
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
                    if (nestedField.stringValue !== undefined) return nestedField.stringValue;
                    if (nestedField.integerValue !== undefined) return parseInt(nestedField.integerValue);
                    if (nestedField.booleanValue !== undefined) return nestedField.booleanValue;
                    if (nestedField.timestampValue !== undefined) return new Date(nestedField.timestampValue);
                }
                return null;
            }
            
            // Handle direct values (new format)
            if (field.stringValue !== undefined) return field.stringValue;
            if (field.integerValue !== undefined) {
                const parsed = parseInt(field.integerValue);
                console.log('[EXTRACT] Field', fieldName, 'integerValue:', field.integerValue, '→ parsed:', parsed, 'type:', typeof parsed);
                return parsed;
            }
            if (field.booleanValue !== undefined) return field.booleanValue;
            if (field.timestampValue !== undefined) return new Date(field.timestampValue);
            
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
            timezonesCount: (() => {
                const val1 = extractValue('timezonesCount');
                const val2 = extractValue('tripData', 'timezonesCount');
                const result = val1 ?? val2;
                console.log('[EXTRACT timezonesCount] val1:', val1, 'val2:', val2, 'result:', result);
                return result;
            })(),
            travelDirection: extractValue('travelDirection') || extractValue('tripData', 'travelDirection'),
            pointsCompleted: extractValue('pointsCompleted') ?? extractValue('tripData', 'pointsCompleted'),
            startDate: extractValue('startDate') || extractValue('tripData', 'startDate'),
            completionDate: extractValue('completionDate') || extractValue('tripData', 'completionDate'),
            completionMethod: extractValue('completionMethod') || extractValue('tripData', 'completionMethod'),
            arrivalTimeZone: extractValue('arrivalTimeZone') || extractValue('tripData', 'arrivalTimeZone') || extractValue('arrivalTimeZone'),
            originTimezone: extractValue('originTimezone') || extractValue('tripData', 'originTimezone') || extractValue('originTimezone'),
            useCrampedPoints: extractValue('useCrampedPoints'),
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
            
            // Extract general anticipated severity - handles both formats
            generalAnticipated: extractValue('generalAnticipated') ?? extractValue('surveyData', 'generalAnticipated'),
            
            // Extract anticipated symptoms - handles both formats
            anticipatedSleepSeverity: extractValue('sleepExpectations') ?? extractValue('surveyData', 'sleepExpectations'),
            anticipatedFatigueSeverity: extractValue('fatigueExpectations') ?? extractValue('surveyData', 'fatigueExpectations'),
            anticipatedConcentrationSeverity: extractValue('concentrationExpectations') ?? extractValue('surveyData', 'concentrationExpectations'),
            anticipatedIrritabilitySeverity: extractValue('irritabilityExpectations') ?? extractValue('surveyData', 'irritabilityExpectations'),
            anticipatedGISeverity: extractValue('giExpectations') ?? extractValue('surveyData', 'giExpectations'),
            
            // Extract post-travel symptoms - handles both formats
            postSleepSeverity: extractValue('sleepPost') ?? extractValue('surveyData', 'sleepPost'),
            postFatigueSeverity: extractValue('fatiguePost') ?? extractValue('surveyData', 'fatiguePost'),
            postConcentrationSeverity: extractValue('concentrationPost') ?? extractValue('surveyData', 'concentrationPost'),
            postIrritabilitySeverity: extractValue('irritabilityPost') ?? extractValue('surveyData', 'irritabilityPost'),
            postMotivationSeverity: extractValue('motivationPost') ?? extractValue('surveyData', 'motivationPost'),
            postGISeverity: extractValue('giPost') ?? extractValue('surveyData', 'giPost'),
            
            // Extract demographics - only age (gender and travel experience removed)
            age: extractValue('age') ?? extractValue('ageRange'),
            region: extractValue('region'),
            
            // For compatibility with existing dashboard logic - handles both formats
            timestamp: extractValue('completionDate') || extractValue('created') || extractValue('tripData', 'completionDate'),
            timezones_count: extractValue('timezonesCount') ?? extractValue('tripData', 'timezonesCount'),
            travel_direction: extractValue('travelDirection') || extractValue('tripData', 'travelDirection')
        };
        
        // DEBUG: Log timezonesCount for specific trip
        if (flatData.tripId && flatData.tripId.includes('23DB4E06')) {
            console.log('[DEBUG] YOUR TRIP 23DB4E06:');
            console.log('  timezonesCount:', flatData.timezonesCount, 'Type:', typeof flatData.timezonesCount);
            console.log('  arrivalTimeZone:', flatData.arrivalTimeZone);
            console.log('  originTimezone:', flatData.originTimezone);
        }
        
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
    renderPointStimulationAnalysis();
    renderRecentSubmissions();
}

// Show loading state
function showLoadingState() {
    document.getElementById('tripStats').innerHTML = '<div class="loading">Loading trip stats...</div>';
    document.getElementById('advancedAnalytics').innerHTML = '<div class="loading">Loading advanced analytics...</div>';
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
        
        // Pre-load airport mapping (DRY - use existing airports.json)
        await loadAirportMapping();
        
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
async function refreshDataWithService() {
    const refreshBtn = document.querySelector('.refresh-btn');
    const originalText = refreshBtn ? refreshBtn.textContent : 'Refresh Data';
    
    // Disable button and show loading state
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
        refreshBtn.style.opacity = '0.6';
        refreshBtn.style.cursor = 'not-allowed';
    }
    
    try {
        if (firebaseService) {
            console.log('🔄 Refreshing data with Firebase service...');
            await loadDashboardDataWithService();
        } else {
            console.log('🔄 Firebase service not available, using existing refresh method...');
            await new Promise((resolve) => {
                refreshData(); // Fallback to existing method
                // Give it a moment to complete
                setTimeout(resolve, 500);
            });
        }
    } catch (error) {
        console.error('Error refreshing data:', error);
    } finally {
        // Re-enable button when done
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = originalText;
            refreshBtn.style.opacity = '1';
            refreshBtn.style.cursor = 'pointer';
        }
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
    
    // Use raw data (before developer filter) to identify test trips
    const rawData = surveyData || [];
    const data = getCurrentData(); // Filtered data for valid trips
    
    if (!rawData || rawData.length === 0) {
        container.innerHTML = '<div class="error">No submission data available</div>';
        return;
    }

    // Sort raw data by date (most recent first) - use trip start date
    const sortedRawSurveys = rawData.sort((a, b) => {
        const dateA = a.startDate || a.completionDate || a.created || a.timestamp;
        const dateB = b.startDate || b.completionDate || b.created || b.timestamp;
        return new Date(dateB) - new Date(dateA); // Most recent first
    });

    // Separate into valid research trips and test data (use raw data for both to show ALL submissions)
    // Valid trips: must pass isValidTrip() AND must NOT be developer trips
    // Test trips: either fail isValidTrip() OR are developer trips (all developer trips are test trips)
    let validTrips = sortedRawSurveys.filter(trip => 
        TripValidator.isValidTrip(trip) && !isDeveloperTrip(trip)
    );
    let testData = sortedRawSurveys.filter(trip => 
        !TripValidator.isValidTrip(trip) || isDeveloperTrip(trip)
    );
    
    // Post-landing override: move device 4A473DF4 trips (HNL/JFK) with completed surveys from Test to With Surveys
    const postLandingWithSurvey = testData.filter(t => isPostLandingTrip(t) && t.surveyCompleted === true);
    testData = testData.filter(t => !(isPostLandingTrip(t) && t.surveyCompleted === true));
    
    // Separate valid research trips by survey completion status (includes post-landing)
    let validWithSurveys = validTrips.filter(trip => trip.surveyCompleted === true);
    validWithSurveys = validWithSurveys.concat(postLandingWithSurvey);
    // Sort by date descending (newest first) so most recent trips appear at top
    validWithSurveys.sort((a, b) => {
        const dateA = a.startDate || a.completionDate || a.created || a.timestamp;
        const dateB = b.startDate || b.completionDate || b.created || b.timestamp;
        return new Date(dateB) - new Date(dateA);
    });
    const validNotCompleted = validTrips.filter(trip => trip.surveyCompleted !== true);

    // Build HTML
    let html = '';
    
    // Helper function to render a trip table - combine Dest, Dir, Points, TZ into Details column
    // Developer trips are automatically styled with gray strikeout
    const renderTripTable = (trips, showStatus = true) => {
        if (trips.length === 0) return '<p><em>No trips in this category</em></p>';
        
        let tableHtml = '<table class="stats-table"><thead><tr>';
        tableHtml += '<th>Date</th><th>Device</th><th>Route & Data</th>';
        if (showStatus) tableHtml += '<th>Status</th>';
        tableHtml += '</tr></thead><tbody>';

        trips.forEach(survey => {
            // Check if this trip is a developer trip and style accordingly
            const tripIsDeveloper = isDeveloperTrip(survey);
            const rowStyle = tripIsDeveloper ? 'style="color: #9ca3af; text-decoration: line-through;"' : '';
            
            // Use trip start date (when trip actually occurred), not survey submission date
            const date = survey.startDate || survey.completionDate || survey.created || survey.timestamp;
            const dateStr = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
            const isComplete = survey.surveyCompleted;
            const status = isComplete ? 'Complete' : 'Partial';
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
            const eastWest = direction === 'east' ? 'E' : direction === 'west' ? 'W' : 'N/A';

            // Points stimulated
            const pointsStimulated = survey.pointsCompleted || 0;
            
            // Build trip route display: Origin → Dest [→ Arrival if different]
            // Date-based legacy detection: timezone fields added Oct 24, 2025
            const TIMEZONE_FEATURE_DATE = new Date('2025-10-24T00:00:00Z');
            const tripStartDate = survey.startDate ? new Date(survey.startDate) : null;
            const isDateBasedLegacy = tripStartDate && tripStartDate < TIMEZONE_FEATURE_DATE;
            
            let routeDisplay = '';
            
            // Rule 1: Check timezonesCount FIRST (primary test indicator)
            // Test trips with timezonesCount=0 should not show (Legacy) label
            if (survey.timezonesCount === 0) {
                // Test trip - just show destination without confusing labels
                routeDisplay = survey.destinationCode || 'N/A';
            } else if (isDateBasedLegacy || (!survey.originTimezone && !survey.arrivalTimeZone)) {
                // Legacy: trip predates timezone feature OR missing timezone fields
                routeDisplay = `${survey.destinationCode || 'N/A'} (Legacy)`;
            } else if (survey.originTimezone && survey.arrivalTimeZone) {
                // Modern trip with timezone data
                const originCity = survey.originTimezone.split('/').pop().replace(/_/g, ' ');
                const arrivalCity = survey.arrivalTimeZone.split('/').pop().replace(/_/g, ' ');
                const destCode = survey.destinationCode || 'N/A';
                
                // Show arrival only if origin=arrival (test trip indicator)
                if (survey.originTimezone === survey.arrivalTimeZone) {
                    routeDisplay = `${originCity} → ${destCode} → ${arrivalCity}`;
                } else {
                    routeDisplay = `${originCity} → ${destCode}`;
                }
            } else {
                // Fallback: missing data
                routeDisplay = `${survey.destinationCode || 'N/A'}`;
            }
            
            const points = String(pointsStimulated).padStart(2, ' ') + 'pts';
            const tz = isPostLandingTrip(survey) ? 'Post-Landing*' : (String(timezones).padStart(2, ' ') + 'TZ');
            const tripDetails = `${routeDisplay} ${points} ${tz}`;

            tableHtml += `<tr ${rowStyle}>
                <td>${dateStr}</td>
                <td><code>${displayCode}</code></td>
                <td><code style="font-family: monospace;">${tripDetails}</code></td>`;
            if (showStatus) tableHtml += `<td style="color: ${statusColor}">${status}</td>`;
            tableHtml += `</tr>`;
        });

        tableHtml += '</tbody></table>';
        return tableHtml;
    };
    
    // Show all three categories: trips with surveys, trips without surveys, and test trips
    html += '<div style="text-align: center; margin-bottom: 20px;">';
    
    // Trips With Surveys (real trips with completed surveys)
    if (validWithSurveys.length > 0) {
        html += '<div style="display: inline-block; margin-bottom: 30px; margin-right: 20px;">';
        html += `<h3 style="margin-bottom: 10px; color: #16a34a;">With Surveys (${validWithSurveys.length})</h3>`;
        html += renderTripTable(validWithSurveys, false);
        html += '</div>';
    }
    
    // Trips Without Surveys (real trips missing surveys)
    html += '<div style="display: inline-block; margin-bottom: 30px; margin-right: 20px;">';
    html += `<h3 style="margin-bottom: 10px; color: #1f2937;">Without Surveys (${validNotCompleted.length})</h3>`;
    html += renderTripTable(validNotCompleted, false);
    html += '</div>';
    
    // Test Trips (invalid/excluded trips) - split into Test and Developer for heading
    // Separate test trips (invalid but not developer) from developer trips for counts
    const testTrips = testData.filter(trip => !isDeveloperTrip(trip));
    const developerTrips = testData.filter(trip => isDeveloperTrip(trip));
    
    if (testData.length > 0) {
        html += '<div style="display: inline-block;">';
        
        // Build heading with Test (black) and Developer (gray with strikeout)
        let headingParts = [];
        if (testTrips.length > 0) {
            headingParts.push(`<span style="color: #000000;">Test (${testTrips.length})</span>`);
        }
        if (developerTrips.length > 0) {
            headingParts.push(`<span style="color: #9ca3af; text-decoration: line-through;">Developer (${developerTrips.length})</span>`);
        }
        
        html += `<h3 style="margin-bottom: 10px;">${headingParts.join(' ')}</h3>`;
        
        // Render single table with all test data (developer trips will be styled with strikeout)
        // Sort to show test trips first, then developer trips
        const sortedTestData = [...testTrips, ...developerTrips];
        html += renderTripTable(sortedTestData, false);
        
        html += '</div>';
    }
    
    html += '</div>';
    html += '<p style="margin-top: 20px; font-size: 0.9rem; color: #6b7280;">* Post-Landing? Stimulation performed after arrival at destination.</p>';
    
    container.innerHTML = html;
}

// Render trip stats (Trip Counts section)
function renderTripStats() {
    const container = document.getElementById('tripStats');
    if (!container) return;
    
    // Use ALL data (including developer trips) for total count and breakdown
    const allData = getAllData();
    
    if (!allData || allData.length === 0) {
        container.innerHTML = '<div class="error">No survey data available</div>';
        return;
    }
    
    // Separate developer trips from research trips
    const developerTrips = allData.filter(trip => isDeveloperTrip(trip));
    const researchData = allData.filter(trip => !isDeveloperTrip(trip));
    
    // Get validation statistics (based on research data only, excluding developer trips)
    const validationStats = getValidationStats(researchData);
    const breakdown = TripValidator.getValidationBreakdown(researchData);
    
    // Calculate detailed breakdown (research trips only). Include post-landing trips in valid/with-surveys.
    let validTrips = researchData.filter(trip => TripValidator.isValidTrip(trip));
    const postLandingFromResearch = researchData.filter(t => isPostLandingTrip(t) && t.surveyCompleted === true);
    validTrips = validTrips.concat(postLandingFromResearch);
    const validWithSurveys = validTrips.filter(trip => trip.surveyCompleted === true);
    const validWithoutSurveys = validTrips.filter(trip => trip.surveyCompleted !== true);
    
    // Calculate travel direction for valid trips
    const directions = {};
    validTrips.forEach(trip => {
        if (trip.travelDirection) {
            directions[trip.travelDirection] = (directions[trip.travelDirection] || 0) + 1;
        }
    });
    
    // Format travel direction as inline counts, capitalized labels
    let travelDirectionText = '';
    const totalValidTrips = validTrips.length;
    const directionEntries = Object.entries(directions).sort((a, b) => b[1] - a[1]); // Sort by count descending
    if (directionEntries.length > 0) {
        travelDirectionText = directionEntries.map(([direction, count]) => {
            const percentage = totalValidTrips > 0 ? ((count / totalValidTrips) * 100).toFixed(1) : '0.0';
            const label = String(direction || '').charAt(0).toUpperCase() + String(direction || '').slice(1).toLowerCase();
            return `${count} ${label} (${percentage}%)`;
        }).join('<br>');
    }
    
    const validWithSurveysPercent = validationStats.valid > 0 ? Math.round((validWithSurveys.length / validationStats.valid) * 100) : 0;
    const validWithoutSurveysPercent = validationStats.valid > 0 ? Math.round((validWithoutSurveys.length / validationStats.valid) * 100) : 0;
    
    // Format confirmed trips with survey status (number first)
    const confirmedTripsText = `${validWithSurveys.length} with surveys (${validWithSurveysPercent}%)<br>${validWithoutSurveys.length} without surveys (${validWithoutSurveysPercent}%)`;
    
    // Compute verified/legacy/test summary for the top line (research trips only)
    const tzVerifiedCount = (breakdown.real_travel || 0);
    const fallbackVerifiedCount = (breakdown.survey_fallback || 0);
    const verifiedCount = (tzVerifiedCount + fallbackVerifiedCount);
    const legacyCount = (breakdown.legacy || 0);
    const testCount = (validationStats.invalid || 0);
    const developerCount = developerTrips.length;

    // HMAC validation status (cryptographic authentication) - use ALL data for HMAC stats
    const hmacStats = TripValidator.getHMACStats(allData);
    const hmacStatusText = `Authenticated: ${hmacStats.authenticated}<br>Legacy (no signature): ${hmacStats.legacy}${hmacStats.invalid > 0 ? `<br><span style="color: #dc2626;">Invalid Signatures: ${hmacStats.invalid}</span>` : ''}`;

    // Total trips count includes all trips (research + developer)
    const totalTrips = allData.length;

    let html = '<table class="stats-table">';
    html += `<tr><th>${totalTrips} Trips</th><td>${verifiedCount} Verified${(tzVerifiedCount||fallbackVerifiedCount)?` (TZ ${tzVerifiedCount}, Survey ${fallbackVerifiedCount})`:''}<br>${legacyCount} Legacy<br>${testCount} Test${developerCount > 0 ? `<br>${developerCount} Developer` : ''}</td></tr>`;
    // Confirmed Trips summary in a single row
    html += `<tr><th>${validationStats.valid} Confirmed Trips</th><td>${confirmedTripsText}</td></tr>`;
    html += `<tr><th>Travel Direction</th><td>${travelDirectionText || 'N/A'}</td></tr>`;
    // Removed separate Data Type row; merged into the top summary line
    html += `<tr><th>Cryptographic Status</th><td>${hmacStatusText}</td></tr>`;
    html += '</table>';
    html += '<div style="margin-top: 10px; font-size: 0.85em; color: #6b7280; line-height: 1.6; text-align: center;">';
    html += '<div>Verified: Confirmed travel where the departure and arrival timezone differ or validated by survey metadata.</div>';
    html += '<div>Legacy: Early data lacking time zone fields but included when a user survey data is present.</div>';
    html += '<div>Test: Any trip where timezonesCount is 0 (checked first) OR arrival=origin timezone</div>';
    html += '<div>Developer: Any trip from a developer device</div>';
    html += '<div>Confirmed: Early data (no TZ fields) or travel where Destination and Arrival timezones differ</div>';
    html += '<div>Authenticated: Trip IDs with valid device HMAC-SHA256 signatures</div>';
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
    
    // Filter to only valid trips for analysis (exclude test data). Include post-landing trips with surveys.
    const validData = allData.filter(trip => TripValidator.isValidTrip(trip));
    const postLandingWithSurvey = allData.filter(t => isPostLandingTrip(t) && t.surveyCompleted === true);
    
    // Filter to only include completed surveys for this specific analysis (valid + post-landing)
    const completedSurveys = [...validData.filter(survey => survey.surveyCompleted === true), ...postLandingWithSurvey];
    
    if (completedSurveys.length === 0) {
        container.innerHTML = '<div class="error">No completed surveys available for advanced analytics</div>';
        return;
    }
    
    // Update the section heading with trip count
    const headingElement = document.getElementById('doseResponseHeading');
    if (headingElement) {
        headingElement.innerHTML = `Dose-Response Analysis (${completedSurveys.length})`;
    }
    
    let html = '<div style="margin-bottom: 30px;">';
    
    // Dose-Response Analysis Section
    html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">';
    html += '<p>Multiple lines show how different levels of app usage affect symptom severity across time zones crossed.<br>Error bars show ±1 standard error.</p>';
    html += '<div style="background: white; padding: 20px; border-radius: 10px; margin-top: 15px; height: 500px;">';
    html += '<canvas id="doseResponseAnalysisChart" width="800" height="400"></canvas>';
    html += '</div>';
    html += '</div>';
    
    // Dose-Response Data Table - all surveys used in the chart
    html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">';
    html += '<h3 style="margin-top: 0; margin-bottom: 15px;">Dose-Response Raw Data</h3>';
    html += renderDoseResponseDataTable(completedSurveys);
    html += '</div>';
    
    html += '</div>';

    container.innerHTML = html;
    
    // Render the comprehensive dose-response analysis chart (post-landing trips as 5 TZ for grouping)
    const surveysForChart = completedSurveys.map(s =>
        isPostLandingTrip(s) ? { ...s, timezonesCount: 5 } : s
    );
    renderDoseResponseAnalysisChart(surveysForChart);
}

// Load airport code to city mapping from airports.json (DRY - single source of truth)
async function loadAirportMapping() {
    if (airportCodeToCity) return airportCodeToCity; // Return cached mapping
    
    try {
        const response = await fetch('../data/airports.json');
        if (!response.ok) {
            console.warn('⚠️ Could not load airports.json, using airport codes as-is');
            return {};
        }
        
        const data = await response.json();
        if (data.airports && Array.isArray(data.airports)) {
            // Create lookup map: code -> city
            airportCodeToCity = {};
            data.airports.forEach(airport => {
                if (airport.code && airport.city) {
                    airportCodeToCity[airport.code.toUpperCase()] = airport.city;
                }
            });
            console.log(`✅ Loaded ${Object.keys(airportCodeToCity).length} airport codes from airports.json`);
            return airportCodeToCity;
        }
    } catch (error) {
        console.warn('⚠️ Error loading airports.json:', error);
        return {};
    }
    
    return {};
}

// Helper function to convert airport code to city name (synchronous after pre-load)
function getCityName(airportCode) {
    if (!airportCode || airportCode === 'N/A') return 'N/A';
    
    const code = airportCode.toUpperCase().trim();
    
    // Return city name if found, otherwise return the code
    // Note: airportCodeToCity should be pre-loaded during initialization
    return airportCodeToCity && airportCodeToCity[code] ? airportCodeToCity[code] : code;
}

// Helper function to get baseline severity from timezones
function getBaselineSeverity(timezones) {
    const baselineData = [
        { timeZones: 2, severity: 1.8 },
        { timeZones: 3, severity: 2.5 },
        { timeZones: 4, severity: 2.5 },
        { timeZones: 5, severity: 2.5 },
        { timeZones: 6, severity: 3.1 },
        { timeZones: 7, severity: 3.1 },
        { timeZones: 8, severity: 3.1 },
        { timeZones: 9, severity: 3.6 },
        { timeZones: 10, severity: 3.6 },
        { timeZones: 11, severity: 3.6 },
        { timeZones: '12+', severity: 3.6 }
    ];
    
    if (timezones >= 12) {
        return 3.6; // 12+ uses 3.6
    }
    
    const baseline = baselineData.find(b => b.timeZones === timezones);
    return baseline ? baseline.severity : null;
}

// Helper function to calculate actual severity (average of post-travel symptoms)
function calculateActualSeverity(survey) {
    const symptoms = [
        survey.postSleepSeverity,
        survey.postFatigueSeverity,
        survey.postConcentrationSeverity,
        survey.postIrritabilitySeverity,
        survey.postMotivationSeverity,
        survey.postGISeverity
    ];
    
    const validSymptoms = symptoms.filter(s => s !== null && s !== undefined);
    if (validSymptoms.length === 0) return null;
    
    const sum = validSymptoms.reduce((acc, val) => acc + val, 0);
    return sum / validSymptoms.length;
}

// Helper function to get color for points column
function getPointsColor(points) {
    if (points >= 0 && points <= 2) return '#dc2626'; // Red
    if (points >= 3 && points <= 5) return '#f59e0b'; // Orange
    if (points >= 6 && points <= 8) return '#3b82f6'; // Blue
    if (points >= 9 && points <= 12) return '#16a34a'; // Green
    return '#666'; // Default gray
}

// Render dose-response data table
function renderDoseResponseDataTable(surveys) {
    if (surveys.length === 0) return '<p><em>No survey data available</em></p>';
    
    // Sort by date (most recent first) - use trip start date
    const sortedSurveys = surveys.sort((a, b) => {
        const dateA = a.startDate;
        const dateB = b.startDate;
        return new Date(dateB) - new Date(dateA);
    });
    
    let tableHtml = '<div style="overflow-x: auto;"><table class="stats-table dose-response-table">';
    tableHtml += '<thead><tr>';
    tableHtml += '<th>Date</th><th>Device</th><th>Origin</th><th>Dest</th><th>Dir</th><th>Points</th><th>TZ</th>';
    tableHtml += '<th class="wrap-header">Baseline Severity Expected</th><th class="wrap-header">Anticipated Severity</th><th class="wrap-header">Actual Severity</th>';
    tableHtml += '<th class="wrap-header">Improvement over Expected</th><th class="wrap-header">Improvement over Anticipated</th>';
    tableHtml += '</tr></thead><tbody>';
    
    sortedSurveys.forEach(survey => {
        // Use trip start date (when the trip started) as the significant date
        // CONSISTENCY: Extract UTC date component to match Python script output
        // This ensures the same date is displayed regardless of browser timezone
        const date = survey.startDate;
        let dateStr = 'N/A';
        if (date) {
            try {
                // Extract date component (YYYY-MM-DD) from ISO string
                const datePart = date.split('T')[0];
                const dateObj = new Date(datePart + 'T00:00:00Z'); // Parse as UTC midnight
                // Format as "Nov 5, 2025" (no leading zero on day)
                dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
            } catch (e) {
                dateStr = date; // Fallback to raw value
            }
        }
        
        // Extract device ID from tripId
        let displayCode = 'N/A';
        if (survey.tripId) {
            const tripIdParts = survey.tripId.split(/[-_]/);
            displayCode = tripIdParts[0] || 'N/A';
        }
        
        // Origin and destination
        let origin = survey.originTimezone || survey.originCode || 'N/A';
        // Format origin: use only part after "/" and replace "_" with spaces
        if (origin !== 'N/A' && origin.includes('/')) {
            origin = origin.split('/').pop(); // Get part after last "/"
            origin = origin.replace(/_/g, ' '); // Replace underscores with spaces
        } else if (origin !== 'N/A') {
            origin = origin.replace(/_/g, ' '); // Replace underscores with spaces even if no "/"
        }
        // Convert destination airport code to city name
        const destinationCode = survey.destinationCode || 'N/A';
        const destination = getCityName(destinationCode);
        
        // Travel direction. Post-landing trips: use 5 TZ (JFK-HNL) for baseline/chart; display "Post-Landing*".
        const timezones = survey.timezonesCount || 0;
        const effectiveTz = isPostLandingTrip(survey) ? 5 : timezones;
        const direction = (effectiveTz === 0) ? 'N/A' : (survey.travelDirection || 'N/A');
        const eastWest = direction === 'east' ? 'E' : direction === 'west' ? 'W' : 'N/A';
        
        // Points stimulated
        const pointsStimulated = survey.pointsCompleted || 0;
        const pointsColor = getPointsColor(pointsStimulated);
        
        // Baseline severity (use effective TZ for post-landing so baseline matches JFK-HNL)
        const baseline = getBaselineSeverity(effectiveTz);
        const baselineStr = baseline !== null ? baseline.toFixed(1) : 'N/A';
        
        // Anticipated severity - calculate average of individual anticipated symptoms
        // or use generalAnticipated if available
        // Note: 0 is a valid value, so we check for null/undefined specifically
        const anticipatedSymptoms = [
            survey.anticipatedSleepSeverity,
            survey.anticipatedFatigueSeverity,
            survey.anticipatedConcentrationSeverity,
            survey.anticipatedIrritabilitySeverity,
            survey.anticipatedGISeverity
        ].filter(s => s !== null && s !== undefined && !isNaN(s));
        
        let anticipated = null;
        // Check if generalAnticipated exists (including 0 as valid)
        // Try direct access first (flat structure)
        const generalAnticipatedValue = survey.generalAnticipated;
        if (generalAnticipatedValue !== null && generalAnticipatedValue !== undefined && generalAnticipatedValue !== '' && !isNaN(generalAnticipatedValue)) {
            anticipated = Number(generalAnticipatedValue);
        } 
        // Try nested in surveyData (old format)
        else if (survey.surveyData && survey.surveyData.generalAnticipated !== null && survey.surveyData.generalAnticipated !== undefined && survey.surveyData.generalAnticipated !== '' && !isNaN(survey.surveyData.generalAnticipated)) {
            anticipated = Number(survey.surveyData.generalAnticipated);
        } 
        // Fallback to average of individual anticipated symptoms
        else if (anticipatedSymptoms.length > 0) {
            // Calculate average of individual anticipated severities
            const sum = anticipatedSymptoms.reduce((acc, val) => acc + Number(val), 0);
            anticipated = sum / anticipatedSymptoms.length;
        }
        
        // Debug: log first few surveys to see what data we have
        if (sortedSurveys.indexOf(survey) < 3) {
            console.log('Survey anticipated data:', {
                generalAnticipated: survey.generalAnticipated,
                surveyData: survey.surveyData,
                anticipatedSymptoms: anticipatedSymptoms,
                calculated: anticipated,
                // Check all survey keys that might contain anticipated data
                allKeys: Object.keys(survey).filter(k => k.toLowerCase().includes('anticipat') || k.toLowerCase().includes('expect')),
                // Show full survey object structure
                surveySample: Object.keys(survey).slice(0, 20)
            });
        }
        
        const anticipatedStr = anticipated !== null && anticipated !== undefined && !isNaN(anticipated) ? Number(anticipated).toFixed(1) : 'N/A';
        
        // Actual severity
        const actual = calculateActualSeverity(survey);
        const actualStr = actual !== null ? actual.toFixed(1) : 'N/A';
        
        // Calculate improvement percentages with color coding
        let improvementOverExpected = null;
        let improvementOverExpectedStr = 'N/A';
        let improvementOverExpectedColor = '#333'; // Default
        if (baseline !== null && actual !== null) {
            improvementOverExpected = ((baseline - actual) / baseline) * 100;
            improvementOverExpectedStr = improvementOverExpected.toFixed(1) + '%';
            // Color: green for positive, red for zero or negative
            improvementOverExpectedColor = improvementOverExpected > 0 ? '#16a34a' : '#dc2626';
        }
        
        let improvementOverAnticipated = null;
        let improvementOverAnticipatedStr = 'N/A';
        let improvementOverAnticipatedColor = '#333'; // Default
        if (anticipated !== null && anticipated !== undefined && !isNaN(anticipated) && 
            actual !== null && actual !== undefined && !isNaN(actual)) {
            // Handle division by zero - if anticipated is 0, improvement is undefined
            if (anticipated === 0) {
                if (actual === 0) {
                    improvementOverAnticipatedStr = '0.0%'; // Both 0 = no change
                    improvementOverAnticipatedColor = '#dc2626'; // Red for zero
                } else {
                    improvementOverAnticipatedStr = 'N/A'; // Can't calculate % improvement from 0 baseline
                }
            } else {
                improvementOverAnticipated = ((anticipated - actual) / anticipated) * 100;
                improvementOverAnticipatedStr = improvementOverAnticipated.toFixed(1) + '%';
                // Color: green for positive, red for zero or negative
                improvementOverAnticipatedColor = improvementOverAnticipated > 0 ? '#16a34a' : '#dc2626';
            }
        }
        
        tableHtml += `<tr>
            <td>${dateStr}</td>
            <td><code>${displayCode}</code></td>
            <td>${origin}</td>
            <td>${destination}</td>
            <td>${eastWest}</td>
            <td style="color: ${pointsColor}; font-weight: 600;">${pointsStimulated}</td>
            <td>${isPostLandingTrip(survey) ? 'Post-Landing*' : timezones}</td>
            <td>${baselineStr}</td>
            <td>${anticipatedStr}</td>
            <td>${actualStr}</td>
            <td style="color: ${improvementOverExpectedColor}; font-weight: 600;">${improvementOverExpectedStr}</td>
            <td style="color: ${improvementOverAnticipatedColor}; font-weight: 600;">${improvementOverAnticipatedStr}</td>
        </tr>`;
    });
    
    tableHtml += '</tbody></table></div>';
    return tableHtml;
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
        headingElement.innerHTML = `Point Usage (${data.length} trips)`;
    }

    // One row per distinct meridian: shared slots once; substitutable slots 4,7,8,11,12 split cramped vs horary.
    // variant: null = all trips; 'cramped' | 'horary' = only trips with that point set (matches Firebase useCrampedPoints).
    const pointUsageRows = [
        { slot: 1, label: 'LU-8', variant: null },
        { slot: 2, label: 'LI-1', variant: null },
        { slot: 3, label: 'ST-36', variant: null },
        { slot: 4, label: 'SP-10', variant: 'cramped' },
        { slot: 4, label: 'SP-3', variant: 'horary' },
        { slot: 5, label: 'HT-8', variant: null },
        { slot: 6, label: 'SI-5', variant: null },
        { slot: 7, label: 'BL-2', variant: 'cramped' },
        { slot: 7, label: 'BL-66', variant: 'horary' },
        { slot: 8, label: 'KI-27', variant: 'cramped' },
        { slot: 8, label: 'KI-10', variant: 'horary' },
        { slot: 9, label: 'PC-8', variant: null },
        { slot: 10, label: 'SJ-6', variant: null },
        { slot: 11, label: 'GB-20', variant: 'cramped' },
        { slot: 11, label: 'GB-41', variant: 'horary' },
        { slot: 12, label: 'LIV-8', variant: 'cramped' },
        { slot: 12, label: 'LIV-1', variant: 'horary' }
    ];

    function rowMatchesTripVariant(variant, survey) {
        if (variant === null) return true;
        const cramped = tripUsesCrampedPointSet(survey);
        if (variant === 'cramped') return cramped;
        return !cramped;
    }

    const pointStats = pointUsageRows.map(row => {
        const field = `point${row.slot}Completed`;
        let stimulationCount = 0;
        let totalSurveys = 0;

        data.forEach(survey => {
            if (!survey.surveyCompleted || survey[field] === undefined) return;
            if (!rowMatchesTripVariant(row.variant, survey)) return;
            totalSurveys++;
            if (survey[field] === true) stimulationCount++;
        });

        const stimulationRate = totalSurveys > 0 ? Math.round((stimulationCount / totalSurveys) * 100) : 0;

        return { ...row, stimulationCount, totalSurveys, stimulationRate, field };
    });

    // Generate HTML table - use stats-table for tight columns, centered (DRY - matches other sections)
    let html = '<div style="text-align: center;">';
    html += '<table class="stats-table" style="margin: 0 auto;">';
    html += '<thead><tr>';
    html += '<th>Slot</th>';
    html += '<th>Point</th>';
    html += '<th>Count</th>';
    html += '<th>Rate</th>';
    html += '</tr></thead><tbody>';

    pointStats.forEach(point => {
        const usageRate = point.totalSurveys > 0 ? `${point.stimulationRate}%` : 'N/A';
        const countDisplay = point.stimulationCount > 0 ? point.stimulationCount : '0';
        const setNote = point.variant === 'cramped' ? ' <span style="color:#64748b;font-size:0.85em;">(cramped)</span>' : point.variant === 'horary' ? ' <span style="color:#64748b;font-size:0.85em;">(horary)</span>' : '';

        html += '<tr>';
        html += `<td>${point.slot}</td>`;
        html += `<td>${point.label}${setNote}</td>`;
        html += `<td>${countDisplay}</td>`;
        html += `<td>${usageRate}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    html += '</div>';

    container.innerHTML = html;
}

