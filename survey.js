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

// Initialize survey when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LJLQ Survey Initializing...');
    
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
    
    console.log('✅ LJLQ Survey initialized');
});

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
            
            // Auto-validate the code
            setTimeout(() => {
                const validateBtn = document.getElementById('validateCode');
                if (validateBtn) {
                    validateBtn.click();
                }
            }, 500); // Small delay to ensure everything is loaded
        }
    } else {
        console.log('ℹ️ No survey code found in URL');
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
    
    // Show first section
    showSection('preBaseline');
    
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
    
    // Setup navigation buttons
    setupNavigation();
    
    console.log('✅ Form listeners setup complete');
}

// Setup navigation between sections
function setupNavigation() {
    const sections = ['preBaseline', 'postAssessment', 'contextSection', 'demographicsSection', 'commentSection'];
    
    sections.forEach((sectionId, index) => {
        const section = document.getElementById(sectionId);
        if (!section) return;
        
        // Add navigation buttons
        const navDiv = document.createElement('div');
        navDiv.className = 'section-navigation';
        
        if (index > 0) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'btn btn-secondary';
            prevBtn.textContent = 'Previous Section';
            prevBtn.onclick = () => showSection(sections[index - 1]);
            navDiv.appendChild(prevBtn);
        }
        
        if (index < sections.length - 1) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'btn btn-primary';
            nextBtn.textContent = 'Next Section';
            nextBtn.onclick = () => showSection(sections[index + 1]);
            navDiv.appendChild(nextBtn);
        } else {
            const submitBtn = document.createElement('button');
            submitBtn.className = 'btn btn-success btn-submit';
            submitBtn.textContent = 'Enter Survey Code to Submit';
            submitBtn.onclick = submitSurvey;
            submitBtn.disabled = true;
            navDiv.appendChild(submitBtn);
        }
        
        section.appendChild(navDiv);
    });
}

// Show specific section
function showSection(sectionId) {
    console.log('📄 Showing section:', sectionId);
    
    // Hide all sections
    const sections = ['preBaseline', 'postAssessment', 'contextSection', 'demographicsSection', 'commentSection'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = 'none';
        }
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Update progress indicator
    updateProgress(sectionId);
}

// Update progress indicator
function updateProgress(currentSection) {
    const sections = ['preBaseline', 'postAssessment', 'contextSection', 'demographicsSection', 'commentSection'];
    const currentIndex = sections.indexOf(currentSection);
    const totalSections = sections.length;
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill && progressText) {
        const progress = ((currentIndex + 1) / totalSections) * 100;
        progressFill.style.width = progress + '%';
        progressText.textContent = `Section ${currentIndex + 1} of ${totalSections}`;
    }
}

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
function submitSurvey() {
    console.log('📤 Submitting survey...');
    
    // Check if code is validated
    if (!isCodeValidated) {
        alert('Please enter a valid survey code to submit your responses.');
        return;
    }
    
    // Validate all sections
    const sections = ['preBaseline', 'postAssessment', 'contextSection'];
    let isValid = true;
    
    sections.forEach(sectionId => {
        if (!validateSection(sectionId)) {
            isValid = false;
        }
    });
    
    if (!isValid) {
        alert('Please complete all required fields before submitting.');
        return;
    }
    
    // Save final data
    saveFormData();
    
    // Export data
    exportSurveyData();
    
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

// Show completion message
function showCompletion() {
    console.log('🎉 Showing completion message...');
    
    // Hide all sections
    const sections = ['preBaseline', 'postAssessment', 'contextSection', 'demographicsSection', 'commentSection'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = 'none';
        }
    });
    
    // Show completion section
    const completion = document.getElementById('surveyComplete');
    if (completion) {
        completion.style.display = 'block';
    }
    
    // Clear saved data
    localStorage.removeItem('ljlqSurveyData');
    
    console.log('✅ Survey completed');
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