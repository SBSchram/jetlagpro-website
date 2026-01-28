// JetLagPro Survey Read Service
// Handles read operations for survey system using Firebase SDK
// Write operations remain in survey.js for safety

class SurveyReadService {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 10;
    }

    // Initialize Firebase SDK for read operations
    async initialize() {
        try {
            if (this.isInitialized) {
                return true;
            }

            // Wait for Firebase functions to be available (timing issue fix)
            while ((!window.firebaseDB || !window.firebaseDoc || !window.firebaseGetDoc) && this.retryCount < this.maxRetries) {
                console.log(`🔄 SurveyReadService: Waiting for Firebase functions... attempt ${this.retryCount + 1}`);
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
                this.retryCount++;
            }

            if (!window.firebaseDB || !window.firebaseDoc || !window.firebaseGetDoc) {
                console.error('❌ SurveyReadService: Firebase not available after retries');
                return false;
            }

            this.db = window.firebaseDB;
            this.isInitialized = true;
            console.log('✅ SurveyReadService: Firebase SDK initialized for read operations');
            return true;
        } catch (error) {
            console.error('❌ SurveyReadService: Failed to initialize:', error);
            return false;
        }
    }

    // Check if survey already exists for a specific trip ID
    async checkExistingSurveyByTripId(tripId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.isInitialized) {
            throw new Error('SurveyReadService not initialized');
        }

        try {
            console.log('🔍 SurveyReadService: Checking for existing survey by tripId:', tripId);
            
            const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const surveyRef = collection(this.db, 'surveys');
            const q = query(surveyRef, where('tripId', '==', tripId));
            const querySnapshot = await getDocs(q);
            
            const result = {
                exists: !querySnapshot.empty,
                data: null,
                count: querySnapshot.size
            };

            if (!querySnapshot.empty) {
                // Get the first document (should be only one)
                const doc = querySnapshot.docs[0];
                result.data = doc.data();
                result.docId = doc.id;
            }

            console.log(`✅ SurveyReadService: Found ${result.count} existing surveys for tripId: ${tripId}`);
            return result;
        } catch (error) {
            console.error('❌ SurveyReadService: Error checking existing survey by tripId:', error);
            throw error;
        }
    }

    // Check if survey already exists for a specific survey code
    async checkExistingSurveyByCode(surveyCode) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.isInitialized) {
            throw new Error('SurveyReadService not initialized');
        }

        try {
            console.log('🔍 SurveyReadService: Checking for existing survey by code:', surveyCode);
            
            const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const surveyRef = collection(this.db, 'surveys');
            const q = query(surveyRef, where('surveyCode', '==', surveyCode));
            const querySnapshot = await getDocs(q);
            
            const result = {
                exists: !querySnapshot.empty,
                data: null,
                count: querySnapshot.size
            };

            if (!querySnapshot.empty) {
                // Get the first document (should be only one)
                const doc = querySnapshot.docs[0];
                result.data = doc.data();
                result.docId = doc.id;
            }

            console.log(`✅ SurveyReadService: Found ${result.count} existing surveys for code: ${surveyCode}`);
            return result;
        } catch (error) {
            console.error('❌ SurveyReadService: Error checking existing survey by code:', error);
            throw error;
        }
    }

    // Get trip completion data for a specific trip ID
    async getTripData(tripId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.isInitialized) {
            throw new Error('SurveyReadService not initialized');
        }

        try {
            console.log('🔍 SurveyReadService: Getting trip data for tripId:', tripId);
            
            const tripDocRef = window.firebaseDoc(this.db, 'tripCompletions', tripId);
            const tripDoc = await window.firebaseGetDoc(tripDocRef);
            
            const result = {
                exists: tripDoc.exists(),
                data: null
            };

            if (tripDoc.exists()) {
                result.data = tripDoc.data();
            }

            console.log(`✅ SurveyReadService: Trip data ${result.exists ? 'found' : 'not found'} for tripId: ${tripId}`);
            return result;
        } catch (error) {
            console.error('❌ SurveyReadService: Error getting trip data:', error);
            throw error;
        }
    }

    // Check for naked survey code (legacy survey code handling)
    async checkNakedSurveyCode() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.isInitialized) {
            throw new Error('SurveyReadService not initialized');
        }

        try {
            console.log('🔍 SurveyReadService: Checking naked survey code document');
            
            const nakedSurveyDocRef = window.firebaseDoc(this.db, 'tripCompletions', 'naked-survey-code');
            const existingDoc = await window.firebaseGetDoc(nakedSurveyDocRef);
            
            const result = {
                exists: existingDoc.exists(),
                data: null
            };

            if (existingDoc.exists()) {
                result.data = existingDoc.data();
            }

            console.log(`✅ SurveyReadService: Naked survey code document ${result.exists ? 'found' : 'not found'}`);
            return result;
        } catch (error) {
            console.error('❌ SurveyReadService: Error checking naked survey code:', error);
            throw error;
        }
    }

    // Validate if Firebase is available for read operations
    isFirebaseAvailable() {
        return !!(window.firebaseDB && window.firebaseDoc && window.firebaseGetDoc);
    }

    // Get service status
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isFirebaseAvailable: this.isFirebaseAvailable(),
            retryCount: this.retryCount,
            maxRetries: this.maxRetries
        };
    }
}

// Make SurveyReadService available globally
window.SurveyReadService = SurveyReadService;
