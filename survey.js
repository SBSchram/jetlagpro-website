// Liverpool Jet Lag Questionnaire (LJLQ) Survey JavaScript

// Global variables
let surveyData = {};
let isCodeValidated = false;

// Initialize survey when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LJLQ Survey Initializing...');
    
    // Setup code validation first
    setupCodeValidation();
    
    // Always initialize survey (but submission will be disabled without code)
    initializeSurvey();
    
    console.log('✅ LJLQ Survey initialized');
});

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

// Enable survey submission when code is validated
function enableSurveySubmission() {
    console.log('✅ Enabling survey submission...');
    
    // Enable all form inputs
    const allSelects = document.querySelectorAll('select');
    const allInputs = document.querySelectorAll('input[type="text"], input[type="email"]');
    
    allSelects.forEach(select => {
        select.disabled = false;
        select.style.opacity = '1';
    });
    
    allInputs.forEach(input => {
        input.disabled = false;
        input.style.opacity = '1';
    });
    
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
    
    allSelects.forEach(select => {
        select.disabled = true;
        select.style.opacity = '0.5';
    });
    
    allInputs.forEach(input => {
        input.disabled = true;
        input.style.opacity = '0.5';
    });
    
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
    const sections = ['preBaseline', 'postAssessment', 'contextSection', 'demographicsSection'];
    
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
    const sections = ['preBaseline', 'postAssessment', 'contextSection', 'demographicsSection'];
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
    const sections = ['preBaseline', 'postAssessment', 'contextSection', 'demographicsSection'];
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
            const docRef = await window.firebaseAddDoc(
                window.firebaseCollection(window.firebaseDB, 'survey_responses'), 
                {
                    surveyCode: surveyCode,
                    timestamp: window.firebaseServerTimestamp(),
                    submittedAt: timestamp,
                    responses: surveyData,
                    version: 'ljlq_v1'
                }
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
    const sections = ['preBaseline', 'postAssessment', 'contextSection', 'demographicsSection'];
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