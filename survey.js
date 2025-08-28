// Liverpool Jet Lag Questionnaire (LJLQ) Survey JavaScript

// Global variables
let surveyData = {};
let isCodeValidated = false;

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

// Check if coming from app and refresh if needed
function checkAndRefreshFromApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const fromApp = urlParams.get('from') === 'app';
    
    if (fromApp && !sessionStorage.getItem('appRefreshDone')) {
        console.log('🔄 Coming from app - forcing fresh load...');
        sessionStorage.setItem('appRefreshDone', 'true');
        
        // Add timestamp to force refresh
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('t', Date.now().toString());
        
        // Force reload with cache bust
        window.location.href = newUrl.toString();
        return;
    }
}

// Force scroll to very top (mobile-optimized)
function forceScrollToTop() {
    console.log('📍 Forcing scroll to top...');
    
    // Multiple methods to ensure it works on all mobile browsers
    document.body.scrollTop = 0; // Safari
    document.documentElement.scrollTop = 0; // Chrome/Firefox
    window.scrollTo(0, 0);
    
    // Also scroll the survey container itself
    const surveyContainer = document.querySelector('.survey-container');
    if (surveyContainer) {
        surveyContainer.scrollTop = 0;
    }
}

// Initialize survey when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LJLQ Survey Initializing...');
    
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
    
    // Setup flight landing time validation
    setupFlightLandingValidation();
    
    // Setup scale sliders
    setupScaleSliders();
    
    // Initialize enhanced sliders with tick marks
    initializeEnhancedSliders();
    
    // Always scroll to top on mobile
    if (window.innerWidth <= 768) {
        setTimeout(forceScrollToTop, 500);
    }
    
    console.log('✅ LJLQ Survey initialized');
});

// Setup scale sliders functionality
function setupScaleSliders() {
    const sliders = document.querySelectorAll('.scale-slider');
    
    sliders.forEach(slider => {
        // Update display on change
        slider.addEventListener('input', function() {
            const selectedValue = this.value;
            const selectedValueDiv = this.parentElement.querySelector('.selected-value');
            if (selectedValueDiv) {
                // Handle duration sliders (show "X days")
                if (this.name.includes('duration')) {
                    if (selectedValue === '0') {
                        selectedValueDiv.textContent = 'Selected: 0 days';
                    } else if (selectedValue === '5') {
                        selectedValueDiv.textContent = 'Selected: 5+ days';
                    } else {
                        selectedValueDiv.textContent = `Selected: ${selectedValue} day${selectedValue === '1' ? '' : 's'}`;
                    }
                } else {
                    selectedValueDiv.textContent = `Selected: ${selectedValue}`;
                }
            }
        });
        
        // Initialize display
        const selectedValueDiv = slider.parentElement.querySelector('.selected-value');
        if (selectedValueDiv) {
            if (slider.name.includes('duration')) {
                if (slider.value === '0') {
                    selectedValueDiv.textContent = 'Selected: 0 days';
                } else if (slider.value === '5') {
                    selectedValueDiv.textContent = 'Selected: 5+ days';
                } else {
                    selectedValueDiv.textContent = `Selected: ${slider.value} day${slider.value === '1' ? '' : 's'}`;
                }
            } else {
                selectedValueDiv.textContent = `Selected: ${slider.value}`;
            }
        }
    });
}

// Auto-fill survey code from URL parameter
function autoFillSurveyCode() {
    console.log('🔗 Checking for survey code in URL...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        console.log('✅ Found survey code in URL:', code);
        const surveyCodeInput = document.getElementById('surveyCode');
        if (surveyCodeInput) {
            surveyCodeInput.value = code.toUpperCase();
            
            // Auto-populate point data if available
            autoFillPointData();
            
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
                        scrollToSurvey();
                    }, 1000); // Wait for validation to complete
                }
            }, 500);
        }
    } else {
        console.log('ℹ️ No survey code found in URL');
    }
}

// Auto-fill point completion data from URL parameters
function autoFillPointData() {
    console.log('📊 Checking for point data in URL...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const pointsCompleted = urlParams.get('points');
    const totalPoints = urlParams.get('total');
    
    if (pointsCompleted && totalPoints) {
        console.log(`✅ Found point data: ${pointsCompleted}/${totalPoints} points completed`);
        
        // Auto-fill the total points question
        const totalPointsSelect = document.querySelector('select[name="points_total"]');
        if (totalPointsSelect) {
            // Convert number to range that matches the options
            const pointsNum = parseInt(pointsCompleted);
            let rangeValue;
            if (pointsNum === 0) rangeValue = '0';
            else if (pointsNum <= 3) rangeValue = '1-3';
            else if (pointsNum <= 6) rangeValue = '4-6';
            else if (pointsNum <= 9) rangeValue = '7-9';
            else rangeValue = '10-12';
            
            totalPointsSelect.value = rangeValue;
            console.log(`📝 Auto-filled total points: ${pointsCompleted} → ${rangeValue}`);
        }
        
        // Show a helpful message to the user
        const pointDataMessage = document.createElement('div');
        pointDataMessage.className = 'point-data-message';
        pointDataMessage.innerHTML = `
            <div style="background: #e8f5e8; border: 1px solid #4caf50; border-radius: 8px; padding: 12px; margin: 16px 0;">
                <strong>📊 Point Data Auto-filled:</strong> Your app data shows you completed ${pointsCompleted} out of ${totalPoints} points during your journey. 
                This data has been automatically filled in the survey below. You can modify these numbers if needed.
            </div>
        `;
        
        // Insert the message before the first survey section
        const firstSection = document.querySelector('.survey-section');
        if (firstSection) {
            firstSection.parentNode.insertBefore(pointDataMessage, firstSection);
        }
    } else {
        console.log('ℹ️ No point data found in URL - user will need to enter manually');
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
    
    // Auto-fill timezone count
    if (timezones) {
        const timezonesSelect = document.querySelector('select[name="timezones"]');
        if (timezonesSelect) {
            // Handle 12+ case
            const value = parseInt(timezones) >= 12 ? '12+' : timezones;
            timezonesSelect.value = value;
            console.log(`✅ Auto-filled timezones: ${value}`);
            autoFilledData.push(`${value} timezones`);
        }
    }
    
    // Auto-fill travel direction
    if (direction) {
        const directionSelect = document.querySelector('select[name="direction"]');
        if (directionSelect) {
            directionSelect.value = direction;
            console.log(`✅ Auto-filled direction: ${direction}`);
            autoFilledData.push(`${direction}ward travel`);
        }
    }
    
    // Auto-fill destination (hidden field)
    if (destination) {
        const destinationInput = document.querySelector('input[name="destination"]');
        if (destinationInput) {
            destinationInput.value = destination;
            console.log(`✅ Auto-filled destination: ${destination}`);
            autoFilledData.push(`destination: ${destination}`);
        }
    }
    
    // Landing time is intentionally left for user input - they know exactly when they landed
    
    // Show comprehensive auto-fill message if any data was populated
    if (autoFilledData.length > 0) {
        const travelDataMessage = document.createElement('div');
        travelDataMessage.className = 'travel-data-message';
        travelDataMessage.innerHTML = `
            <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 12px; margin: 16px 0;">
                <strong>✈️ Travel Data Auto-filled:</strong> Your app data has automatically populated: ${autoFilledData.join(', ')}${destination ? `, destination: ${destination}` : ''}. 
                You can modify any of these values if needed.
            </div>
        `;
        
        // Insert the message before the travel context section
        const contextForm = document.querySelector('#contextForm');
        if (contextForm) {
            contextForm.parentNode.insertBefore(travelDataMessage, contextForm);
        }
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



// Setup flight landing time validation
function setupFlightLandingValidation() {
    console.log('✈️ Setting up flight landing time validation...');
    
    const flightLandingInput = document.querySelector('input[name="flight_landing_time"]');
    
    if (!flightLandingInput) {
        console.error('❌ Flight landing time input not found');
        return;
    }
    
    // Set max attribute to current date/time to prevent future dates
    const now = new Date();
    const nowString = now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
    flightLandingInput.setAttribute('max', nowString);
    
    // Add real-time validation
    flightLandingInput.addEventListener('input', function() {
        validateFlightLandingTime(this);
    });
    
    // Add blur validation for immediate feedback
    flightLandingInput.addEventListener('blur', function() {
        validateFlightLandingTime(this);
    });
    
    console.log('✅ Flight landing time validation setup complete');
}

// Validate flight landing time
function validateFlightLandingTime(input) {
    const value = input.value;
    const now = new Date();
    
    // Remove any existing validation styling
    input.classList.remove('valid', 'invalid');
    
    if (!value) {
        // Field is empty, no validation needed yet
        return;
    }
    
    const selectedDate = new Date(value);
    
    if (selectedDate > now) {
        // Future date selected
        input.classList.add('invalid');
        input.title = 'Flight landing time cannot be in the future';
    } else {
        // Valid date
        input.classList.add('valid');
        input.title = '';
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
    
    // Subtle indicator that new version is loaded (only show on desktop for debugging)
    if (window.innerWidth > 768) {
        setTimeout(() => {
            showMobileAlert('✅ Fresh Survey Loaded!', 'Single-scroll experience active. v2025011905', 'success');
        }, 2000);
    }
    
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
    
    // Add version indicator to the page
    const versionIndicator = document.createElement('div');
    versionIndicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: #10b981;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: bold;
        z-index: 1000;
        opacity: 0.8;
    `;
    versionIndicator.textContent = 'v2025011905 ✅';
    document.body.appendChild(versionIndicator);
}

// Progress indicator removed - using single scrollable page instead

// Save form data to localStorage
function saveFormData() {
    console.log('💾 Saving form data...');
    
    // Collect all form data
    const forms = ['baselineForm', 'postForm', 'contextForm', 'demographicsForm'];
    
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            const formData = new FormData(form);
            for (let [key, value] of formData.entries()) {
                if (value) {
                    surveyData[key] = value;
                }
            }
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
    
    // Get all required fields
    const requiredFields = document.querySelectorAll('input[required], select[required]');
    requiredFields.forEach(field => {
        if (!field.value || field.value.trim() === '') {
            isValid = false;
            field.style.borderColor = '#ef4444';
        } else {
            field.style.borderColor = '';
        }
    });
    
    if (!isValid) {
        alert('Please complete all required fields before submitting.');
        return;
    }
    
    // Save final data
    saveFormData();
    
    // Export data
    try {
        await exportSurveyData();
        console.log('✅ Survey data export completed successfully');
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
    
    const exportData = {
        timestamp: timestamp,
        surveyCode: surveyCode,
        surveyData: surveyData
    };
    
    // Save to Firestore first
    try {
        console.log('💾 Saving to Firestore...');
        console.log('🔍 Firebase availability check:', {
            firebaseDB: !!window.firebaseDB,
            firebaseCollection: !!window.firebaseCollection, 
            firebaseAddDoc: !!window.firebaseAddDoc,
            firebaseServerTimestamp: !!window.firebaseServerTimestamp
        });
        
        if (window.firebaseDB && window.firebaseCollection && window.firebaseAddDoc && window.firebaseServerTimestamp) {
            console.log('🚀 Attempting Firestore save...');
            
            // Prepare data with sanitized comment
            const firestoreData = {
                surveyCode: surveyCode,
                timestamp: window.firebaseServerTimestamp(),
                submittedAt: timestamp,
                responses: surveyData,
                version: 'ljlq_v1'
            };
            
            // Add sanitized comment if present
            if (surveyData.userComment) {
                const sanitizedComment = sanitizeComment(surveyData.userComment);
                if (sanitizedComment) {
                    firestoreData.comment = sanitizedComment;
                }
            }
            
            const docRef = await window.firebaseAddDoc(
                window.firebaseCollection(window.firebaseDB, 'survey_responses'), 
                firestoreData
            );
            console.log('✅ Survey saved to Firestore with ID:', docRef.id);
        } else {
            console.warn('⚠️ Firebase not available, skipping cloud save');
            console.warn('Missing Firebase functions:', {
                firebaseDB: !window.firebaseDB,
                firebaseCollection: !window.firebaseCollection,
                firebaseAddDoc: !window.firebaseAddDoc,
                firebaseServerTimestamp: !window.firebaseServerTimestamp
            });
        }
    } catch (error) {
        console.error('❌ Error saving to Firestore:', error);
        // Don't fail the whole process if Firestore fails
    }
    
    console.log('✅ Survey data saved to research database');
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

// Initialize enhanced sliders with visual tick marks and snap behavior
function initializeEnhancedSliders() {
    console.log('🎚️ Initializing enhanced sliders...');
    
    const sliders = document.querySelectorAll('.scale-slider');
    
    sliders.forEach(slider => {
        // Add snap behavior for discrete values (1-5)
        slider.addEventListener('input', function() {
            const value = parseFloat(this.value);
            const min = parseFloat(this.min);
            const max = parseFloat(this.max);
            const step = (max - min) / 4; // 5 values: 1, 2, 3, 4, 5
            
            // Find closest step value
            const closestStep = Math.round((value - min) / step) * step + min;
            this.value = Math.max(min, Math.min(max, closestStep));
        });
        
        // Add visual feedback on interaction
        slider.addEventListener('mousedown', function() {
            this.style.transform = 'scale(1.02)';
        });
        
        slider.addEventListener('mouseup', function() {
            this.style.transform = 'scale(1)';
        });
        
        slider.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    console.log(`✅ Enhanced ${sliders.length} sliders with tick marks and snap behavior`);
} 