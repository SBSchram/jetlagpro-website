/**
 * JetLagPro Trip Validation Service
 * Centralized validation logic for determining valid vs test trips
 * 
 * DRY Principle: Single source of truth for validation rules
 * Easy maintenance: Update rules in one place, applies everywhere
 */

class TripValidator {
    /**
     * Validates if a trip is legitimate (not test data)
     * 
     * @param {Object} trip - Trip data object
     * @returns {boolean} - true if valid trip, false if test data
     */
    static isValidTrip(trip) {
        // Rule 1: Legacy data (no arrivalTimeZone field) - always valid
        if (!trip.arrivalTimeZone) {
            return true;
        }
        
        // Rule 2: Real travel (different timezones)
        if (trip.arrivalTimeZone !== trip.originTimezone) {
            return true;
        }
        
        // Rule 3: Survey fallback (same timezone but survey completion)
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
                completionMethod: trip.completionMethod,
                timezonesMatch: trip.arrivalTimeZone === trip.originTimezone,
                hasSurveyFallback: trip.completionMethod && trip.completionMethod.includes('_survey')
            }
        };
        
        // Rule 1: Legacy data
        if (!trip.arrivalTimeZone) {
            details.isValid = true;
            details.reason = 'Legacy data (no arrivalTimeZone field)';
            details.rule = 'legacy';
            return details;
        }
        
        // Rule 2: Real travel
        if (trip.arrivalTimeZone !== trip.originTimezone) {
            details.isValid = true;
            details.reason = 'Real travel (different timezones)';
            details.rule = 'real_travel';
            return details;
        }
        
        // Rule 3: Survey fallback
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TripValidator;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.TripValidator = TripValidator;
}
