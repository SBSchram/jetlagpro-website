// Liverpool Jet Lag Questionnaire (LJLQ) Survey JavaScript

// Global variables
let surveyData = {};
let isCodeValidated = false;
let isExistingSurvey = false;
let currentTripId = null;

// Security functions for comment sanitization
function sanitizeComment(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    
    return input
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>]/g, '')     // Remove < > characters
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim()
        .substring(0, 1000);      // Limit length
}

function validateComment(input) {
    if (!input || typeof input !== 'string') {
        return { isValid: false, message: 'Invalid input' };
    }
    
    const sanitized = sanitizeComment(input);
    
    if (sanitized.length === 0) {
        return { isValid: true, message: 'Comment is optional' };
    }
    
    if (sanitized.length < 10) {
        return { isValid: false, message: 'Comment must be at least 10 characters long' };
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /document\./i,
        /window\./i
    ];
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(sanitized)) {
            return { isValid: false, message: 'Comment contains invalid content' };
        }
    }
    
    return { isValid: true, message: 'Comment is valid' };
}

// Check if coming from app (has tripId) and refresh if needed
function checkAndRefreshFromApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('tripId');
    const fromApp = tripId !== null; // If tripId exists, we're coming from the app
    
    if (fromApp && !sessionStorage.getItem('appRefreshDone')) {
        console.log('🔄 Coming from app (has tripId) - forcing fresh load...');
        sessionStorage.setItem('appRefreshDone', 'true');
        
        // Add timestamp to force refresh
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('t', Date.now().toString());
        
        // Force reload with cache bust
        window.location.href = newUrl.toString();
        return;
    }
}

// Simple scroll to top of survey
function scrollToTop() {
    console.log('📍 Scrolling to top of survey...');
    window.scrollTo(0, 0);
}

// Initialize survey when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LJLQ Survey Initializing...');
    
    // Prevent browser from restoring previous scroll position
    window.history.scrollRestoration = 'manual';
    
    // Check if coming from app and force refresh if needed
    checkAndRefreshFromApp();
    
    // Setup code validation first
    setupCodeValidation();
    
    
    // Auto-fill survey code from URL parameter
    autoFillSurveyCode();
    
    // Always initialize survey (but submission will be disabled without code)
    initializeSurvey();
    
    // Initialize comment section
    initializeCommentSection();
    
    

    // Setup rating bubbles
    setupRatingBubbles();
    
    
    // Always scroll to top after all initialization is complete
    setTimeout(scrollToTop, 1000);
    
    // CSS media queries now handle responsive design automatically
    // No JavaScript needed for show/hide logic
    
    console.log('✅ LJLQ Survey initialized');
});


// Auto-fill survey code from URL parameter  
function autoFillSurveyCode() {
    console.log('🔗 Checking for survey code in URL...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const tripId = urlParams.get('tripId');
    const testMode = urlParams.get('test') === 'true' || window.location.hostname === 'localhost';
    
    if (code) {
        console.log('✅ Found survey code in URL:', code);
        if (tripId) {
            console.log('✅ Found tripId in URL:', tripId);
            // Store tripId globally for later use in Firebase update
            window.currentTripId = tripId;
        }
        const surveyCodeInput = document.getElementById('surveyCode');
        if (surveyCodeInput) {
            surveyCodeInput.value = code.toUpperCase();
            
            // Point data is already saved in Firebase from trip completion
            
            // Auto-populate timezone and direction data if available
            autoFillTimezoneData();
            
            // Auto-validate the code and hide the preview section
            setTimeout(() => {
                const validateBtn = document.getElementById('validateCode');
                if (validateBtn) {
                    validateBtn.click();
                    
                    // After validation, hide the preview section and show clean survey
                    setTimeout(() => {
                        hideSurveyPreview();
                        // Don't scroll here - let the main scroll function handle it
                    }, 1000); // Wait for validation to complete
                }
            }, 500);
        }
    } else if (testMode) {
        console.log('🧪 Test mode enabled - allowing survey submission for development');
        enableSurveySubmission();
        hideSurveyPreview();
    } else {
        console.log('ℹ️ No survey code found in URL');
    }
}


// Auto-fill timezone, direction, and destination data from URL parameters
function autoFillTimezoneData() {
    console.log('🌍 Checking for timezone and travel data in URL...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const timezones = urlParams.get('timezones');
    const direction = urlParams.get('direction');
    const destination = urlParams.get('destination');
    const startDate = urlParams.get('startDate');
    
    let autoFilledData = [];
    
    // Note: Timezone, direction, and destination data are now handled by Firebase
    if (timezones) {
        console.log(`✅ Timezone data available: ${timezones} timezones (stored in Firebase)`);
        autoFilledData.push(`${timezones} timezones`);
    }
    
    if (direction) {
        console.log(`✅ Direction data available: ${direction}ward travel (stored in Firebase)`);
        autoFilledData.push(`${direction}ward travel`);
    }
    
    if (destination) {
        console.log(`✅ Destination data available: ${destination} (stored in Firebase)`);
        autoFilledData.push(`destination: ${destination}`);
    }
    
    // Landing time is intentionally left for user input - they know exactly when they landed
    
    // Data is auto-filled silently without showing a message
    if (autoFilledData.length > 0) {
        console.log(`✅ Auto-filled travel data: ${autoFilledData.join(', ')}`);
    } else {
        console.log('ℹ️ No timezone/travel data found in URL - user will need to enter manually');
    }
}

// Hide the survey preview section when code is validated
function hideSurveyPreview() {
    const previewSection = document.querySelector('.survey-preview');
    if (previewSection) {
        previewSection.classList.add('hidden');
        // Remove from DOM after transition
        setTimeout(() => {
            previewSection.style.display = 'none';
        }, 500);
    }
    
    // Also hide the intro section to show clean survey
    const introSection = document.querySelector('.survey-intro');
    if (introSection) {
        introSection.classList.add('hidden');
        // Remove from DOM after transition
        setTimeout(() => {
            introSection.style.display = 'none';
        }, 500);
    }
}




// Setup survey code validation
function setupCodeValidation() {
    console.log('🔐 Setting up code validation...');
    
    const validateBtn = document.getElementById('validateCode');
    const surveyCode = document.getElementById('surveyCode');
    const validationMessage = document.getElementById('validationMessage');
    
    if (!validateBtn || !surveyCode) {
        console.error('❌ Code validation elements not found');
        return;
    }
    
    // Handle code validation
    validateBtn.addEventListener('click', function() {
        const code = surveyCode.value.trim().toUpperCase();
        
        if (validateSurveyCode(code)) {
            isCodeValidated = true;
            validationMessage.innerHTML = '<div class="success">✅ Code validated! Survey submission enabled.</div>';
            validationMessage.className = 'validation-message success';
            
            // Enable survey submission
            enableSurveySubmission();
            
            // Hide preview section for clean experience
            setTimeout(() => {
                hideSurveyPreview();
            }, 1500); // Show success message briefly, then clean up
            
        } else {
            validationMessage.innerHTML = '<div class="error">❌ Invalid code. Please check your survey code and try again.</div>';
            validationMessage.className = 'validation-message error';
        }
    });
    
    // Handle Enter key in code input
    surveyCode.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            validateBtn.click();
        }
    });
    
    console.log('✅ Code validation setup complete');
}

// Initialize comment section with character counter and validation
function initializeCommentSection() {
    console.log('💬 Initializing comment section...');
    
    const commentTextarea = document.getElementById('userComment');
    const charCounter = document.getElementById('commentCharCount');
    
    if (!commentTextarea || !charCounter) {
        console.error('❌ Comment section elements not found');
        return;
    }
    
    // Character counter
    commentTextarea.addEventListener('input', function() {
        const currentLength = this.value.length;
        charCounter.textContent = currentLength;
        
        // Visual feedback for character limit
        if (currentLength > 900) {
            charCounter.style.color = '#dc2626'; // Red
        } else if (currentLength > 800) {
            charCounter.style.color = '#f59e0b'; // Orange
        } else {
            charCounter.style.color = '#6b7280'; // Gray
        }
    });
    
    // Real-time validation
    commentTextarea.addEventListener('blur', function() {
        const validation = validateComment(this.value);
        if (!validation.isValid && this.value.trim().length > 0) {
            this.style.borderColor = '#dc2626';
            // Could add a validation message here if needed
        } else {
            this.style.borderColor = '#d1d5db';
        }
    });
    
    // Disable initially (will be enabled with code validation)
    commentTextarea.disabled = true;
    commentTextarea.style.opacity = '0.5';
    
    console.log('✅ Comment section initialized');
}

// Enable survey submission when code is validated
function enableSurveySubmission() {
    console.log('✅ Enabling survey submission...');
    
    // Enable all form inputs
    const allSelects = document.querySelectorAll('select');
    const allInputs = document.querySelectorAll('input[type="text"], input[type="email"]');
    const commentTextarea = document.getElementById('userComment');
    
    allSelects.forEach(select => {
        select.disabled = false;
        select.style.opacity = '1';
    });
    
    allInputs.forEach(input => {
        input.disabled = false;
        input.style.opacity = '1';
    });
    
    // Enable comment textarea
    if (commentTextarea) {
        commentTextarea.disabled = false;
        commentTextarea.style.opacity = '1';
    }
    
    // Enable submit button
    const submitBtn = document.querySelector('.btn-submit');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Survey';
        submitBtn.classList.remove('disabled');
    }
    
    console.log('✅ Survey submission enabled');
}

// Disable survey submission initially
function disableSurveySubmission() {
    console.log('🔒 Disabling survey submission...');
    
    // Disable all form inputs
    const allSelects = document.querySelectorAll('select');
    const allInputs = document.querySelectorAll('input[type="text"], input[type="email"]');
    const commentTextarea = document.getElementById('userComment');
    
    allSelects.forEach(select => {
        select.disabled = true;
        select.style.opacity = '0.5';
    });
    
    allInputs.forEach(input => {
        input.disabled = true;
        input.style.opacity = '0.5';
    });
    
    // Disable comment textarea
    if (commentTextarea) {
        commentTextarea.disabled = true;
        commentTextarea.style.opacity = '0.5';
    }
    
    // Disable submit button
    const submitBtn = document.querySelector('.btn-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enter Survey Code to Submit';
        submitBtn.classList.add('disabled');
    }
    
    console.log('🔒 Survey submission disabled');
}

// Validate survey code format
function validateSurveyCode(code) {
    console.log('🔍 Validating code:', code);
    
    // Check if code matches JLP-XXXXXXXX format
    const codePattern = /^JLP-[A-F0-9]{8}$/;
    
    if (codePattern.test(code)) {
        console.log('✅ Code format is valid');
        return true;
    } else {
        console.log('❌ Code format is invalid');
        return false;
    }
}

// Initialize survey functionality
function initializeSurvey() {
    console.log('📋 Initializing survey functionality...');
    
    // Load saved progress if exists
    loadSurveyProgress();
    
    // Setup form event listeners
    setupFormListeners();
    
    // Show all sections for scrollable experience
    showAllSections();
    
    // All form controls should be enabled by default.
    // Submission is still blocked in submitSurvey() if code is not validated.
    
    console.log('✅ Survey functionality initialized');
}

// Setup form event listeners for all dropdowns
function setupFormListeners() {
    console.log('🔧 Setting up form listeners...');
    
    // Get all select elements
    const selects = document.querySelectorAll('select');
    
    selects.forEach(select => {
        select.addEventListener('change', function() {
            console.log('📝 Dropdown changed:', this.name, '=', this.value);
            saveFormData();
        });
    });
    
    // Setup single submit button at the bottom
    setupSubmitButton();
    
    console.log('✅ Form listeners setup complete');
}

// Setup single submit button at the bottom
function setupSubmitButton() {
    console.log('📝 Setting up single submit button');
    
    // Remove any existing navigation buttons
    const existingNavs = document.querySelectorAll('.section-navigation');
    existingNavs.forEach(nav => nav.remove());
    
    // Find the last section (comment section) to add submit button
    const commentSection = document.getElementById('commentSection');
    if (commentSection) {
        // Create submit button container
        const submitContainer = document.createElement('div');
        submitContainer.className = 'submit-container';
        submitContainer.style.cssText = `
            margin-top: 40px;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        `;
        
        // Create submit button
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-success btn-submit';
        submitBtn.textContent = 'Enter Survey Code to Submit';
        submitBtn.onclick = submitSurvey;
        submitBtn.disabled = true;
        submitBtn.style.cssText = `
            padding: 15px 30px;
            font-size: 18px;
            font-weight: 600;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        submitContainer.appendChild(submitBtn);
        commentSection.appendChild(submitContainer);
    }
    
    console.log('✅ Submit button setup complete');
}

// Initialize frictionless single-page survey 
function showAllSections() {
    console.log('🎉 =================================================');
    console.log('🎉 NEW FRICTIONLESS SURVEY LOADED - VERSION 2025011903');
    console.log('🎉 =================================================');
    console.log('✅ Single-scroll survey (no sections)');
    console.log('✅ Mobile alerts working');
    console.log('✅ Fresh content delivered');
    console.log('✅ Cache issues resolved');
    console.log('🎉 =================================================');
    
    // Version indicator removed - using eternal cache busting now
    
    // Remove any section navigation or barriers
    const navElements = document.querySelectorAll('.section-navigation, .nav-buttons, .continue-btn, .next-btn, .prev-btn');
    navElements.forEach(el => el.remove());
    
    // Remove progress indicators completely
    const progressElements = document.querySelectorAll('.survey-progress, .progress-bar, .progress-text');
    progressElements.forEach(el => el.style.display = 'none');
    
    // Ensure all content is visible and flows naturally
    const surveyContent = document.querySelector('.survey-content');
    if (surveyContent) {
        surveyContent.style.display = 'block';
    }
    
    // Version indicator removed - eternal cache busting handles this automatically
}

// Progress indicator removed - using single scrollable page instead

// Save form data to localStorage
function saveFormData() {
    console.log('💾 Saving form data...');
    
    // Collect rating data from the new bubble system
    const ratings = getRatingValues();
    Object.assign(surveyData, ratings);
    
    // Collect other form data (context, demographics, etc.)
    const contextInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="date"], select');
    contextInputs.forEach(input => {
        if (input.name && input.value) {
            surveyData[input.name] = input.value;
        }
    });
    
    // Save comment data
    const commentTextarea = document.getElementById('userComment');
    if (commentTextarea) {
        const commentValue = commentTextarea.value.trim();
        if (commentValue) {
            surveyData.userComment = commentValue;
        }
    }
    
    // Save to localStorage
    localStorage.setItem('ljlqSurveyData', JSON.stringify(surveyData));
    
    console.log('✅ Form data saved:', surveyData);
}

// Load saved progress
function loadSurveyProgress() {
    console.log('📂 Loading saved progress...');
    
    const saved = localStorage.getItem('ljlqSurveyData');
    if (saved) {
        try {
            surveyData = JSON.parse(saved);
            console.log('✅ Loaded saved data:', surveyData);
            
            // Populate forms with saved data
            populateForms();
        } catch (e) {
            console.error('❌ Error loading saved data:', e);
            surveyData = {};
        }
    }
}

// Populate forms with saved data
function populateForms() {
    console.log('🔄 Populating forms with saved data...');
    
    Object.keys(surveyData).forEach(key => {
        const select = document.querySelector(`select[name="${key}"]`);
        if (select) {
            select.value = surveyData[key];
        }
    });
    
    // Restore comment if saved
    if (surveyData.userComment) {
        const commentTextarea = document.getElementById('userComment');
        if (commentTextarea) {
            commentTextarea.value = surveyData.userComment;
            // Update character counter
            const charCounter = document.getElementById('commentCharCount');
            if (charCounter) {
                charCounter.textContent = surveyData.userComment.length;
            }
        }
    }
    
    console.log('✅ Forms populated');
}

// Validate required fields
function validateSection(sectionId) {
    console.log('🔍 Validating section:', sectionId);
    
    const section = document.getElementById(sectionId);
    if (!section) return true;
    
    const requiredSelects = section.querySelectorAll('select[required]');
    let isValid = true;
    
    requiredSelects.forEach(select => {
        if (!select.value) {
            isValid = false;
            select.classList.add('error');
        } else {
            select.classList.remove('error');
        }
    });
    
    console.log('✅ Section validation:', isValid);
    return isValid;
}

// Submit survey
async function submitSurvey() {
    console.log('📤 Submitting survey...');
    
    // Check if code is validated
    if (!isCodeValidated) {
        alert('Please enter a valid survey code to submit your responses.');
        return;
    }
    
    // Validate all required fields in the single survey form
    let isValid = true;
    
    // Ratings are pre-filled with default values, so no validation needed
    
    // Get all other required fields
    const requiredFields = document.querySelectorAll('input[required], select[required]');
    const missingRequiredFields = [];
    
    requiredFields.forEach(field => {
        if (!field.value || field.value.trim() === '') {
            isValid = false;
            field.style.borderColor = '#ef4444';
            missingRequiredFields.push(field);
        } else {
            field.style.borderColor = '';
        }
    });
    
    
    if (!isValid) {
        // Show mobile alert for missing required fields
        showMobileAlert('⚠️ Missing Required Information', 'Please complete all required fields before submitting.', 'error');
        
        // Scroll to first missing required field
        setTimeout(() => {
            if (missingRequiredFields.length > 0) {
                const firstMissingField = missingRequiredFields[0];
                const fieldContainer = firstMissingField.closest('.rating-container');
                
                if (fieldContainer) {
                    fieldContainer.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                    
                    // Add highlight effect
                    fieldContainer.style.border = '2px solid #ef4444';
                    fieldContainer.style.borderRadius = '8px';
                    setTimeout(() => {
                        fieldContainer.style.border = '';
                        fieldContainer.style.borderRadius = '';
                    }, 3000);
                    
                    console.log(`📍 Scrolled to missing required field: ${firstMissingField.name}`);
                }
            }
        }, 100);
        return;
    }
    
    // Check for duplicate survey (survey code + trip ID combination)
    const surveyCode = document.getElementById('surveyCode').value.trim().toUpperCase();
    const tripId = window.currentTripId;
    
    if (tripId) {
        try {
            // Check if survey already exists for this specific trip ID
            const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const surveyRef = collection(window.firebaseDB, 'surveys');
            const q = query(surveyRef, where('tripId', '==', tripId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // Ask user if they want to overwrite
                const overwrite = confirm('A survey for this trip already exists. Do you want to overwrite the existing data?');
                if (!overwrite) {
                    console.log('❌ User cancelled submission - duplicate trip survey detected');
                    return;
                }
                console.log('✅ User chose to overwrite existing trip survey data');
            }
        } catch (error) {
            console.warn('⚠️ Could not check for duplicate trip survey:', error);
            // Continue with submission even if check fails
        }
    } else {
        // Fallback: Check for duplicate survey code only if no trip ID
        try {
            const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const surveyRef = collection(window.firebaseDB, 'surveys');
            const q = query(surveyRef, where('surveyCode', '==', surveyCode));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const overwrite = confirm('A survey with this code already exists. Do you want to overwrite the existing data?');
                if (!overwrite) {
                    console.log('❌ User cancelled submission - duplicate survey code detected');
                    return;
                }
                console.log('✅ User chose to overwrite existing survey data');
            }
        } catch (error) {
            console.warn('⚠️ Could not check for duplicate survey code:', error);
        }
    }
    
    // Save final data
    saveFormData();
    
    // Export data
    try {
        await exportSurveyData();
        console.log('✅ Survey data export completed successfully');
        
        // Mark trip as surveyed in Firebase if tripId exists
        const tripId = window.currentTripId;
        if (tripId) {
            try {
                const tripDocRef = window.firebaseDoc(window.firebaseDB, 'tripCompletions', tripId);
                await window.firebaseUpdateDoc(tripDocRef, {
                    surveyCompleted: true
                });
                console.log('✅ Marked trip as surveyed in Firebase:', tripId);
            } catch (error) {
                console.warn('⚠️ Could not mark trip as surveyed:', error);
                // Continue even if marking as surveyed fails
            }
        }
    } catch (error) {
        console.error('❌ Error during survey data export:', error);
        showMobileAlert('⚠️ Partial Save', 'Survey submitted locally, but there was an issue saving to the research database. Your responses are still recorded.', 'error');
        return; // Don't show completion if Firebase failed
    }
    
    // Show completion message
    showCompletion();
}

// Export survey data and save to Firestore
async function exportSurveyData() {
    console.log('📊 Exporting survey data...');
    
    const timestamp = new Date().toISOString();
    const surveyCode = document.getElementById('surveyCode').value.trim().toUpperCase();
    const tripId = window.currentTripId;
    
    // Wait for Firebase functions to be available (timing issue fix)
    let retryCount = 0;
    while ((!window.firebaseDoc || !window.firebaseUpdateDoc || !window.firebaseGetDoc || !window.firebaseSetDoc || !window.firebaseArrayUnion) && retryCount < 10) {
        console.log(`🔄 Waiting for Firebase functions... attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        retryCount++;
    }
    
    const exportData = {
        timestamp: timestamp,
        surveyCode: surveyCode,
        tripId: tripId,
        surveyData: surveyData
    };
    
    // Save to Firestore using unified collection approach
    try {
        console.log('💾 Saving to unified tripCompletions collection...');
        console.log('🔍 Firebase availability check:', {
            firebaseDB: !!window.firebaseDB,
            firebaseCollection: !!window.firebaseCollection, 
            firebaseDoc: !!window.firebaseDoc,
            firebaseUpdateDoc: !!window.firebaseUpdateDoc,
            firebaseServerTimestamp: !!window.firebaseServerTimestamp,
            tripId: tripId
        });
        
        if (window.firebaseDB && window.firebaseCollection && window.firebaseDoc && window.firebaseUpdateDoc && window.firebaseServerTimestamp && tripId) {
            console.log('🚀 Attempting to update existing tripCompletions record...');
            
            // Prepare flat survey data to add to existing trip record
            const surveyUpdateData = {
                // Survey completion status
                surveyCompleted: true,
                surveySubmittedAt: timestamp,
                
                // Individual survey responses (flat, not nested)
                userComment: surveyData.userComment || '',
                ageRange: surveyData.ageRange || '',
                gender: surveyData.gender || '',
                travelExperience: surveyData.travelExperience || '',
                
                // Rating responses (1-5 scale)
                generalAnticipated: surveyData.generalAnticipated || 1,
                sleepPre: surveyData.sleepPre || 1,
                sleepExpectations: surveyData.sleepExpectations || 1,
                sleepPost: surveyData.sleepPost || 1,
                fatiguePre: surveyData.fatiguePre || 1,
                fatigueExpectations: surveyData.fatigueExpectations || 1,
                fatiguePost: surveyData.fatiguePost || 1,
                concentrationPre: surveyData.concentrationPre || 1,
                concentrationExpectations: surveyData.concentrationExpectations || 1,
                concentrationPost: surveyData.concentrationPost || 1,
                irritabilityPre: surveyData.irritabilityPre || 1,
                irritabilityExpectations: surveyData.irritabilityExpectations || 1,
                irritabilityPost: surveyData.irritabilityPost || 1,
                giPre: surveyData.giPre || 1,
                giExpectations: surveyData.giExpectations || 1,
                giPost: surveyData.giPost || 1
            };
            
            // Add sanitized comment if present
            if (surveyData.userComment) {
                const sanitizedComment = sanitizeComment(surveyData.userComment);
                if (sanitizedComment) {
                    surveyUpdateData.userComment = sanitizedComment;
                }
            }
            
            try {
                // Try to update the existing tripCompletions document using tripId as document ID
                const tripDocRef = window.firebaseDoc(window.firebaseDB, 'tripCompletions', tripId);
                await window.firebaseUpdateDoc(tripDocRef, surveyUpdateData);
                console.log('✅ Flat survey data added to existing trip record:', tripId);
            } catch (updateError) {
                console.warn('⚠️ Failed to update existing document, trying to create new one:', updateError);
                
                // If update fails, try to create a new document with the tripId
                try {
                    const newDocRef = window.firebaseDoc(window.firebaseDB, 'tripCompletions', tripId);
                    await window.firebaseUpdateDoc(newDocRef, {
                        ...surveyUpdateData,
                        // Add basic trip info if we have it from URL
                        tripId: tripId,
                        surveyCode: surveyCode,
                        platform: 'ReactNative',
                        appVersion: '2025011905',
                        created: window.firebaseServerTimestamp()
                    });
                    console.log('✅ Created new tripCompletions record with survey data:', tripId);
                } catch (createError) {
                    console.error('❌ Failed to create new document:', createError);
                    throw createError;
                }
            }
        } else {
            console.warn('⚠️ Cannot update unified collection - missing requirements:', {
                firebaseDB: !window.firebaseDB,
                firebaseCollection: !window.firebaseCollection,
                firebaseDoc: !window.firebaseDoc,
                firebaseUpdateDoc: !window.firebaseUpdateDoc,
                firebaseServerTimestamp: !window.firebaseServerTimestamp,
                tripId: !tripId
            });
            
            // Fallback: if tripId is missing, create a standalone survey record
            if (!tripId) {
                console.log('⚠️ No tripId available - creating standalone survey record');
                
                // Create a new document with just survey data (no trip link)
                const standaloneSurveyData = {
                    // Survey completion status
                    surveyCompleted: true,
                    surveySubmittedAt: timestamp,
                    surveyCode: surveyCode,
                    platform: 'LegacyUser',
                    
                                    // Individual survey responses (flat, not nested)
                userComment: surveyData.userComment || '',
                ageRange: surveyData.ageRange || '',
                gender: surveyData.gender || '',
                travelExperience: surveyData.travelExperience || '',
                
                // Rating responses (1-5 scale)
                sleepPre: surveyData.sleepPre || 1,
                sleepExpectations: surveyData.sleepExpectations || 1,
                sleepPost: surveyData.sleepPost || 1,
                fatiguePre: surveyData.fatiguePre || 1,
                fatigueExpectations: surveyData.fatigueExpectations || 1,
                fatiguePost: surveyData.fatiguePost || 1,
                concentrationPre: surveyData.concentrationPre || 1,
                concentrationExpectations: surveyData.concentrationExpectations || 1,
                concentrationPost: surveyData.concentrationPost || 1,
                irritabilityPre: surveyData.irritabilityPre || 1,
                irritabilityExpectations: surveyData.irritabilityExpectations || 1,
                irritabilityPost: surveyData.irritabilityPost || 1,
                giPre: surveyData.giPre || 1,
                giExpectations: surveyData.giExpectations || 1,
                giPost: surveyData.giPost || 1
                };
                
                // Add sanitized comment if present
                if (surveyData.userComment) {
                    const sanitizedComment = sanitizeComment(surveyData.userComment);
                    if (sanitizedComment) {
                        standaloneSurveyData.userComment = sanitizedComment;
                    }
                }
                
                try {
                    // First, check if this survey code already exists
                    const nakedSurveyDocRef = window.firebaseDoc(window.firebaseDB, 'tripCompletions', 'naked-survey-code');
                    const existingDoc = await window.firebaseGetDoc(nakedSurveyDocRef);
                    
                    if (existingDoc.exists()) {
                        const existingData = existingDoc.data();
                        const existingCodes = existingData.legacySurveyCodes || [];
                        
                        // Check if this survey code already exists
                        if (existingCodes.includes(surveyCode)) {
                            console.log('⚠️ Survey code already exists in naked survey record:', surveyCode);
                            throw new Error('This survey code has already been used. Each survey code can only be used once.');
                        }
                    }
                    
                    // Create a single "naked survey code" document for all legacy users
                    await window.firebaseUpdateDoc(nakedSurveyDocRef, {
                        // Survey completion status
                        surveyCompleted: true,
                        surveySubmittedAt: timestamp,
                        platform: 'LegacyUser',
                        appVersion: 'Legacy',
                        lastUpdated: window.firebaseServerTimestamp(),
                        
                        // Store all legacy survey codes in an array
                        legacySurveyCodes: window.firebaseArrayUnion(surveyCode),
                        
                        // Store survey data with survey code as key
                        [`surveyData_${surveyCode}`]: standaloneSurveyData
                    });
                    console.log('✅ Added legacy survey data to naked survey code record:', surveyCode);
                } catch (updateError) {
                    console.warn('⚠️ Failed to update naked survey record, trying to create it:', updateError);
                    
                    try {
                        // Create the naked survey code document if it doesn't exist
                        const nakedSurveyDocRef = window.firebaseDoc(window.firebaseDB, 'tripCompletions', 'naked-survey-code');
                        await window.firebaseSetDoc(nakedSurveyDocRef, {
                            // Survey completion status
                            surveyCompleted: true,
                            surveySubmittedAt: timestamp,
                            platform: 'LegacyUser',
                            
                            // Store all legacy survey codes in an array (first entry)
                            legacySurveyCodes: [surveyCode],
                            
                            // Store survey data with survey code as key
                            [`surveyData_${surveyCode}`]: standaloneSurveyData
                        });
                        console.log('✅ Created naked survey code record with legacy data:', surveyCode);
                    } catch (createError) {
                        console.error('❌ Failed to create naked survey code record:', createError);
                        throw createError;
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error updating tripCompletions record:', error);
        
        // Check if this is a duplicate survey code error
        if (error.message && error.message.includes('already been used')) {
            showMobileAlert('⚠️ Survey Already Completed', 'This survey code has already been used. Each survey code can only be used once. If you need to complete another survey, please use a different survey code from the app.', 'error');
        } else {
            throw error; // Re-throw other errors to show user the error
        }
    }
    
    console.log('✅ Flat survey data added to unified tripCompletions record');
}

// Show completion message with visual feedback
function showCompletion() {
    console.log('🎉 Showing completion message...');
    
    // Show immediate visual feedback
    showMobileAlert('🎉 Survey Submitted!', 'Your responses have been saved to our research database. Thank you for participating!', 'success');
    
    // Hide the survey content
    const surveyContent = document.querySelector('.survey-content');
    if (surveyContent) {
        surveyContent.style.display = 'none';
    }
    
    // Show completion section
    const completion = document.getElementById('surveyComplete');
    if (completion) {
        completion.style.display = 'block';
        completion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Clear saved data
    localStorage.removeItem('ljlqSurveyData');
    
    console.log('✅ Survey completed');
}

// Mobile-friendly alert system (no console required)
function showMobileAlert(title, message, type = 'info') {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.mobile-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create alert container
    const alert = document.createElement('div');
    alert.className = `mobile-alert mobile-alert-${type}`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        max-width: 90vw;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        animation: slideInDown 0.3s ease-out;
    `;
    
    alert.innerHTML = `
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">${title}</div>
        <div style="font-size: 14px; line-height: 1.4;">${message}</div>
        <button onclick="this.parentElement.remove()" style="
            margin-top: 15px;
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
        ">OK</button>
    `;
    
    // Add CSS animation
    if (!document.querySelector('#mobile-alert-styles')) {
        const style = document.createElement('style');
        style.id = 'mobile-alert-styles';
        style.textContent = `
            @keyframes slideInDown {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

// Reset survey
function resetSurvey() {
    console.log('🔄 Resetting survey...');
    
    // Clear all form data
    const forms = ['baselineForm', 'postForm', 'contextForm', 'demographicsForm'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    });
    
    // Clear saved data
    surveyData = {};
    localStorage.removeItem('ljlqSurveyData');
    
    // Show first section
    showSection('preBaseline');
    
    console.log('✅ Survey reset complete');
}


// Rating Bubble System Functions
function setupRatingBubbles() {
    console.log('🎯 Setting up rating bubbles...');
    
    // Set default state to "None" (value 1) for all rating fields
    const ratingContainers = document.querySelectorAll('.rating-container');
    ratingContainers.forEach(container => {
        const radioInputs = container.querySelectorAll('.rating-input');
        const bubbles = container.querySelectorAll('.rating-bubble');
        
        // Set first radio (value 1 = "None") as default checked
        if (radioInputs.length > 0) {
            radioInputs[0].checked = true;
        }
        
        // Add click handlers to all rating bubbles
        bubbles.forEach((bubble, index) => {
            bubble.addEventListener('click', function() {
                const radioInput = radioInputs[index];
                if (radioInput && radioInput.type === 'radio') {
                    radioInput.checked = true;
                    
                    // Update visual state
                    updateRatingBubbleStates();
                    
                    // Log selection for debugging
                    const name = radioInput.name;
                    const value = radioInput.value;
                    console.log(`📊 Rating selected: ${name} = ${value}`);
                }
            });
            
            // Add keyboard support for accessibility
            bubble.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
            
            // Make bubbles focusable
            bubble.setAttribute('tabindex', '0');
            bubble.setAttribute('role', 'radio');
            bubble.setAttribute('aria-label', `Rating ${bubble.textContent}`);
        });
    });
    
    // Initialize visual states
    updateRatingBubbleStates();
}

function updateRatingBubbleStates() {
    // Update all rating containers to show current selections
    const ratingContainers = document.querySelectorAll('.rating-container');
    
    ratingContainers.forEach(container => {
        const radioInputs = container.querySelectorAll('.rating-input');
        const bubbles = container.querySelectorAll('.rating-bubble');
        
        radioInputs.forEach((input, index) => {
            if (input.checked) {
                // Add selected class to the bubble
                bubbles[index].classList.add('selected');
                
                // Update aria attributes for accessibility
                bubbles[index].setAttribute('aria-checked', 'true');
                input.setAttribute('aria-checked', 'true');
            } else {
                // Remove selected class
                bubbles[index].classList.remove('selected');
                bubbles[index].setAttribute('aria-checked', 'false');
                input.setAttribute('aria-checked', 'false');
            }
        });
    });
}

function getRatingValues() {
    const ratings = {};
    const ratingInputs = document.querySelectorAll('.rating-input');
    
    // Group radio buttons by name to avoid overwriting
    const radioGroups = {};
    ratingInputs.forEach(input => {
        if (!radioGroups[input.name]) {
            radioGroups[input.name] = [];
        }
        radioGroups[input.name].push(input);
    });
    
    // For each group, get the checked value or default to 1
    Object.keys(radioGroups).forEach(groupName => {
        const checkedInput = radioGroups[groupName].find(input => input.checked);
        if (checkedInput) {
            ratings[groupName] = parseInt(checkedInput.value);
        } else {
            ratings[groupName] = 1; // Default if none checked
        }
    });
    
    return ratings;
}





// Check for existing survey data and pre-fill form
async function checkAndPreFillExistingSurvey() {
    // Get tripId from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('tripId');
    
    if (!tripId) {
        console.log('ℹ️ No tripId in URL - new survey');
        return;
    }
    
    currentTripId = tripId;
    
    try {
        // Check if Firebase is available
        if (!window.firebaseDB || !window.firebaseDoc || !window.firebaseGetDoc) {
            console.log('⚠️ Firebase not available yet - will retry');
            setTimeout(checkAndPreFillExistingSurvey, 1000);
            return;
        }
        
        console.log('🔍 Checking for existing survey data for tripId:', tripId);
        
        // Get the trip document from Firebase
        const tripDocRef = window.firebaseDoc(window.firebaseDB, 'tripCompletions', tripId);
        const tripDoc = await window.firebaseGetDoc(tripDocRef);
        
        if (tripDoc.exists()) {
            const tripData = tripDoc.data();
            
            // Check if survey data exists
            if (tripData.surveyCompleted) {
                console.log('✅ Found existing survey data - pre-filling form');
                isExistingSurvey = true;
                
                // Update the heading
                updateSurveyHeading(tripId);
                
                // Pre-fill the form with existing data
                prefillSurveyWithTripData(tripData);
            } else {
                console.log('ℹ️ Trip exists but no survey data - new survey');
            }
        } else {
            console.log('ℹ️ Trip not found - new survey');
        }
    } catch (error) {
        console.error('❌ Error checking for existing survey:', error);
    }
}

// Update survey heading for existing surveys
function updateSurveyHeading(tripId) {
    // Find the specific h3 with "Let's Get Started!" text
    const headings = document.querySelectorAll('h3');
    for (const heading of headings) {
        if (heading.textContent.includes("Let's Get Started!")) {
            heading.textContent = `Editing ${tripId}`;
            console.log(`✅ Updated heading to: Editing ${tripId}`);
            return;
        }
    }
    console.log('⚠️ Could not find "Let\'s Get Started!" heading to update');
}

// Pre-fill survey with trip data
function prefillSurveyWithTripData(tripData) {
    console.log('📝 Pre-filling survey with existing trip data...');
    console.log('🔍 Full tripData object:', tripData);
    
    
    // Pre-fill demographic fields
    const demographicFields = ['ageRange', 'gender', 'travelExperience'];
    demographicFields.forEach(field => {
        if (tripData[field]) {
            const element = document.querySelector(`select[name="${field}"]`);
            if (element) {
                element.value = tripData[field];
                console.log(`✅ Pre-filled ${field} with value: ${tripData[field]}`);
            } else {
                console.log(`⚠️ Could not find element for ${field}`);
            }
        }
    });
    
    // Pre-fill rating fields using the working 4-step approach
    const ratingFields = [
        'generalAnticipated',
        'sleepPre', 'sleepExpectations', 'sleepPost',
        'fatiguePre', 'fatigueExpectations', 'fatiguePost',
        'concentrationPre', 'concentrationExpectations', 'concentrationPost',
        'irritabilityPre', 'irritabilityExpectations', 'irritabilityPost',
        'giPre', 'giExpectations', 'giPost'
    ];
    
    
    ratingFields.forEach(field => {
        if (tripData[field] !== undefined && tripData[field] !== null) {
            const value = tripData[field];
            const selector = `input[name="${field}"][value="${value}"]`;
            
            const radio = document.querySelector(selector);
            if (radio) {
                // STEP 1: Remove 'selected' class from all radio buttons in this group first
                const allRadiosInGroup = document.querySelectorAll(`input[name="${field}"]`);
                allRadiosInGroup.forEach(r => {
                    const label = document.querySelector(`label[for="${r.id}"]`);
                    if (label) {
                        label.classList.remove('selected');
                    }
                });
                
                // STEP 2: Set the target radio button as checked
                radio.checked = true;
                
                // STEP 3: Add 'selected' class to the corresponding label (which IS the rating-bubble)
                const label = document.querySelector(`label[for="${radio.id}"]`);
                if (label) {
                    label.classList.add('selected');
                }
                
                // STEP 4: Trigger change event
                const event = new Event('change', { bubbles: true });
                radio.dispatchEvent(event);
            }
        }
    });
    
    
    // Pre-fill comments
    if (tripData.userComment) {
        const commentField = document.querySelector('#userComment');
        if (commentField) {
            commentField.value = tripData.userComment;
            // Update character count
            updateCommentCounter();
        }
    }
    
    console.log('✅ Survey pre-filled with existing trip data');
}



// Initialize survey when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Survey page loaded - checking for existing data');
    
    // Check for existing survey data and pre-fill if found
    checkAndPreFillExistingSurvey();
    
    // Initialize other survey functionality
    initializeSurvey();
});

// Initialize survey functionality
function initializeSurvey() {
    // Add event listeners for form elements
    setupFormEventListeners();
    
    // Initialize comment counter
    const commentField = document.querySelector('#userComment');
    if (commentField) {
        commentField.addEventListener('input', updateCommentCounter);
        updateCommentCounter();
    }
}

// Setup form event listeners
function setupFormEventListeners() {
    // Add any other form event listeners here
    console.log('📋 Form event listeners initialized');
}

// Update comment character counter
function updateCommentCounter() {
    const commentField = document.querySelector('#userComment');
    const counter = document.querySelector('#commentCharCount');
    
    if (commentField && counter) {
        const length = commentField.value.length;
        counter.textContent = length;
        
        // Change color if approaching limit
        if (length > 900) {
            counter.style.color = '#dc2626';
        } else if (length > 800) {
            counter.style.color = '#f59e0b';
        } else {
            counter.style.color = '#6b7280';
        }
    }
}
