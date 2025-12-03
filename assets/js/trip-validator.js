/**
 * JetLagPro Trip Validation Service
 * Centralized validation logic for determining valid vs test trips
 * 
 * DRY Principle: Single source of truth for validation rules
 * Easy maintenance: Update rules in one place, applies everywhere
 * 
 * Build 6+: Includes HMAC-SHA256 signature validation for cryptographic authentication
 */

class TripValidator {
    // HMAC secret key for signature validation
    // Note: This is exposed client-side for analytics validation only
    // Same key is embedded in iOS and React Native apps
    static HMAC_SECRET = '7f3a9d8b2c4e1f6a5d8b3c9e7f2a4d6b8c1e3f5a7d9b2c4e6f8a1d3b5c7e9f2a';
    
    // Developer device IDs - single source of truth
    // These are device IDs from developer test devices and simulators
    // Used to filter out test data from research analysis
    static DEVELOPER_DEVICE_IDS = ['2330B376', '7482966F', '5E001B36', '23DB54B0', '1CDD41FC'];
    
    /**
     * Validates HMAC-SHA256 signature on a trip ID
     * Trip IDs from Build 6+ have format: deviceID-dest-date-time-signature
     * 
     * @param {string} tripId - Full trip identifier with signature
     * @returns {Object} - Validation result with details
     */
    static validateHMAC(tripId) {
        if (!tripId) {
            return { valid: false, reason: 'missing_trip_id', category: 'error' };
        }
        
        const parts = tripId.split('-');
        
        // Check for UUID format (legacy, very old trips)
        // UUIDs have 5 parts with specific lengths: 8-4-4-4-12
        if (parts.length === 5 && 
            parts[0].length === 8 && 
            parts[1].length === 4 && 
            parts[2].length === 4 && 
            parts[3].length === 4 && 
            parts[4].length === 12) {
            return { 
                valid: true, 
                reason: 'legacy_uuid_format', 
                category: 'legacy',
                tripId: tripId
            };
        }
        
        // Legacy format (4 parts): Pre-Build 6 data without signatures
        if (parts.length === 4) {
            return { 
                valid: true, 
                reason: 'legacy_no_signature', 
                category: 'legacy',
                tripId: tripId
            };
        }
        
        // Build 6+ format (5 parts): deviceID-dest-date-time-signature
        if (parts.length === 5) {
            const baseTripId = parts.slice(0, 4).join('-');
            const providedSignature = parts[4];
            
            // Validate signature format (8 hex characters)
            if (!/^[a-fA-F0-9]{8}$/.test(providedSignature)) {
                return { 
                    valid: false, 
                    reason: 'invalid_signature_format', 
                    category: 'invalid',
                    tripId: tripId,
                    providedSignature: providedSignature
                };
            }
            
            // Check if CryptoJS is available (required for HMAC computation)
            if (typeof CryptoJS === 'undefined') {
                console.warn('CryptoJS not loaded - cannot validate HMAC signatures');
                return { 
                    valid: true, // Assume valid if we can't verify
                    reason: 'crypto_unavailable', 
                    category: 'unverified',
                    tripId: tripId
                };
            }
            
            // Compute expected signature
            const hmac = CryptoJS.HmacSHA256(baseTripId, this.HMAC_SECRET);
            const expectedSignature = hmac.toString(CryptoJS.enc.Hex).substring(0, 8).toLowerCase();
            
            if (providedSignature.toLowerCase() === expectedSignature) {
                return { 
                    valid: true, 
                    reason: 'valid_signature', 
                    category: 'authenticated',
                    tripId: tripId,
                    signature: providedSignature
                };
            } else {
                return { 
                    valid: false, 
                    reason: 'signature_mismatch', 
                    category: 'invalid',
                    tripId: tripId,
                    expected: expectedSignature,
                    provided: providedSignature
                };
            }
        }
        
        // Unexpected format
        return { 
            valid: false, 
            reason: 'unexpected_format', 
            category: 'error',
            tripId: tripId,
            parts: parts.length
        };
    }
    
    /**
     * Categorizes trips by HMAC validation status
     * 
     * @param {Array} trips - Array of trip objects with tripId field
     * @returns {Object} - Categorized trips
     */
    static categorizeByHMAC(trips) {
        const categories = {
            authenticated: [],  // Build 6+ with valid signatures
            legacy: [],         // Pre-Build 6 without signatures
            invalid: [],        // Invalid or mismatched signatures
            error: []          // Missing trip IDs or malformed
        };
        
        trips.forEach(trip => {
            const validation = this.validateHMAC(trip.tripId);
            categories[validation.category].push({
                ...trip,
                hmacValidation: validation
            });
        });
        
        return categories;
    }
    
    /**
     * Gets HMAC validation statistics for a dataset
     * 
     * @param {Array} trips - Array of trip objects
     * @returns {Object} - HMAC validation statistics
     */
    static getHMACStats(trips) {
        const categories = this.categorizeByHMAC(trips);
        
        return {
            total: trips.length,
            authenticated: categories.authenticated.length,
            legacy: categories.legacy.length,
            invalid: categories.invalid.length,
            error: categories.error.length,
            authenticatedPercentage: trips.length > 0 ? 
                Math.round((categories.authenticated.length / trips.length) * 100) : 0,
            legacyPercentage: trips.length > 0 ? 
                Math.round((categories.legacy.length / trips.length) * 100) : 0
        };
    }
    

    /**
     * Validates if a trip is legitimate (not test data)
     * 
     * @param {Object} trip - Trip data object
     * @returns {boolean} - true if valid trip, false if test data
     */
    static isValidTrip(trip) {
        // Rule 1: Test trip if timezonesCount === 0 - ALWAYS invalid (local test, no travel)
        // This is the definitive indicator of a test trip
        if (trip.timezonesCount === 0) {
            return false;
        }
        
        // Rule 2: Legacy data (timezonesCount > 0 but no arrivalTimeZone field) - valid
        // These are early trips before we added timezone fields
        if (!trip.arrivalTimeZone) {
            return true;
        }
        
        // Rule 3: Real travel (different timezones AND timezonesCount > 0)
        if (trip.arrivalTimeZone !== trip.originTimezone && 
            trip.timezonesCount && trip.timezonesCount > 0) {
            return true;
        }
        
        // Rule 4: Survey fallback (same timezone but survey completion)
        if (trip.arrivalTimeZone === trip.originTimezone && 
            trip.completionMethod && 
            trip.completionMethod.includes('_survey')) {
            return true;
        }
        
        // Invalid: Same timezone without survey fallback = test data
        return false;
    }
    
    /**
     * Gets detailed validation reason for debugging/analysis
     * 
     * @param {Object} trip - Trip data object
     * @returns {Object} - Validation details
     */
    static getValidationDetails(trip) {
        const details = {
            isValid: false,
            reason: '',
            rule: '',
            data: {
                hasArrivalTimeZone: !!trip.arrivalTimeZone,
                arrivalTimeZone: trip.arrivalTimeZone,
                originTimezone: trip.originTimezone,
                timezonesCount: trip.timezonesCount,
                completionMethod: trip.completionMethod,
                timezonesMatch: trip.arrivalTimeZone === trip.originTimezone,
                hasSurveyFallback: trip.completionMethod && trip.completionMethod.includes('_survey')
            }
        };
        
        // Rule 1: Test trip if timezonesCount === 0 (definitive test indicator)
        if (trip.timezonesCount === 0) {
            console.log('[VALIDATOR] Trip', trip.tripId, 'is TEST (timezonesCount=0). Value:', trip.timezonesCount, 'Type:', typeof trip.timezonesCount);
            details.isValid = false;
            details.reason = 'Test data (timezonesCount is 0)';
            details.rule = 'test_data';
            return details;
        }
        
        // Rule 2: Date-based legacy detection
        // Timezone fields were added Oct 24, 2025 - trips before this are legacy
        const TIMEZONE_FEATURE_DATE = new Date('2025-10-24T00:00:00Z');
        if (trip.startDate) {
            try {
                const tripStartDate = new Date(trip.startDate);
                if (tripStartDate < TIMEZONE_FEATURE_DATE) {
                    details.isValid = true;
                    details.reason = 'Legacy data (trip predates timezone feature)';
                    details.rule = 'legacy';
                    return details;
                }
            } catch (e) {
                // Invalid date, continue with other checks
            }
        }
        
        // Rule 3: Field-based legacy data (no arrivalTimeZone but timezonesCount > 0)
        if (!trip.arrivalTimeZone) {
            console.log('[VALIDATOR] Trip', trip.tripId, 'is LEGACY (no arrivalTimeZone). timezonesCount:', trip.timezonesCount, 'Type:', typeof trip.timezonesCount);
            details.isValid = true;
            details.reason = 'Legacy data (no arrivalTimeZone field)';
            details.rule = 'legacy';
            return details;
        }
        
        // Rule 4: Real travel (different timezones AND timezonesCount > 0)
        if (trip.arrivalTimeZone !== trip.originTimezone && 
            trip.timezonesCount && trip.timezonesCount > 0) {
            details.isValid = true;
            details.reason = 'Real travel (different timezones)';
            details.rule = 'real_travel';
            return details;
        }
        
        // Rule 5: Survey fallback
        if (trip.arrivalTimeZone === trip.originTimezone && 
            trip.completionMethod && 
            trip.completionMethod.includes('_survey')) {
            details.isValid = true;
            details.reason = 'Survey fallback (offline trip data)';
            details.rule = 'survey_fallback';
            return details;
        }
        
        // Invalid: Test data
        details.reason = 'Test data (same timezone, no survey fallback)';
        details.rule = 'test_data';
        return details;
    }
    
    /**
     * Filters an array of trips to only valid ones
     * 
     * @param {Array} trips - Array of trip objects
     * @returns {Array} - Array of valid trips only
     */
    static filterValidTrips(trips) {
        return trips.filter(trip => this.isValidTrip(trip));
    }
    
    /**
     * Filters an array of trips to only invalid ones (test data)
     * 
     * @param {Array} trips - Array of trip objects
     * @returns {Array} - Array of invalid trips only
     */
    static filterInvalidTrips(trips) {
        return trips.filter(trip => !this.isValidTrip(trip));
    }
    
    /**
     * Gets validation statistics for a dataset
     * 
     * @param {Array} trips - Array of trip objects
     * @returns {Object} - Validation statistics
     */
    static getValidationStats(trips) {
        const validTrips = this.filterValidTrips(trips);
        const invalidTrips = this.filterInvalidTrips(trips);
        
        return {
            total: trips.length,
            valid: validTrips.length,
            invalid: invalidTrips.length,
            validPercentage: trips.length > 0 ? Math.round((validTrips.length / trips.length) * 100) : 0,
            invalidPercentage: trips.length > 0 ? Math.round((invalidTrips.length / trips.length) * 100) : 0
        };
    }
    
    /**
     * Gets breakdown by validation rule
     * 
     * @param {Array} trips - Array of trip objects
     * @returns {Object} - Breakdown by validation rule
     */
    static getValidationBreakdown(trips) {
        const breakdown = {
            legacy: 0,
            real_travel: 0,
            survey_fallback: 0,
            test_data: 0
        };
        
        trips.forEach(trip => {
            const details = this.getValidationDetails(trip);
            breakdown[details.rule]++;
        });
        
        return breakdown;
    }
    
    /**
     * Filters trips to only include those with completed surveys
     * 
     * @param {Array} trips - Array of trip objects
     * @returns {Array} - Array of trips with completed surveys
     */
    static filterSurveyData(trips) {
        return trips.filter(trip => trip.surveyCompleted === true);
    }
    
    /**
     * Gets validation statistics for survey data only
     * 
     * @param {Array} trips - Array of trip objects
     * @returns {Object} - Validation statistics for survey data
     */
    static getSurveyValidationStats(trips) {
        const surveyData = this.filterSurveyData(trips);
        return this.getValidationStats(surveyData);
    }
    
    /**
     * Filters trips for research analysis - excludes test data, developer sessions,
     * and trips with invalid HMAC signatures
     * 
     * @param {Array} trips - Array of trip objects
     * @param {Object} options - Filtering options
     * @param {boolean} options.requireSurvey - Only include trips with completed surveys (default: false)
     * @param {boolean} options.excludeDeveloper - Exclude developer test sessions (default: true)
     * @param {Array<string>} options.developerDeviceIds - Developer device IDs to exclude (default: TripValidator.DEVELOPER_DEVICE_IDS)
     * @returns {Array} - Filtered array of trips for analysis
     */
    static filterForAnalysis(trips, options = {}) {
        const {
            requireSurvey = false,
            excludeDeveloper = true,
            developerDeviceIds = TripValidator.DEVELOPER_DEVICE_IDS
        } = options;
        
        let filtered = trips;
        
        // 1. Exclude test trips (same timezone) - uses existing isValidTrip logic
        filtered = filtered.filter(trip => this.isValidTrip(trip));
        
        // 2. Exclude trips with invalid HMAC signatures (Build 6+)
        filtered = filtered.filter(trip => {
            const hmacValidation = this.validateHMAC(trip.tripId);
            // Include if valid OR legacy (but not invalid)
            return hmacValidation.valid || hmacValidation.category === 'legacy';
        });
        
        // 3. Optionally exclude developer test sessions
        if (excludeDeveloper) {
            filtered = filtered.filter(trip => {
                const tripId = trip.tripId || '';
                return !developerDeviceIds.some(devId => tripId.startsWith(devId));
            });
        }
        
        // 4. Optionally require completed surveys
        if (requireSurvey) {
            filtered = filtered.filter(trip => trip.surveyCompleted === true);
        }
        
        return filtered;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TripValidator;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.TripValidator = TripValidator;
}
