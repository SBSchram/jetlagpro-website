// Liverpool Jet Lag Questionnaire (LJLQ) Survey JavaScript

// Global variables
let surveyData = {};

// Initialize survey when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LJLQ Survey Initializing...');
    
    // Load saved progress if exists
    loadSurveyProgress();
    
    // Setup form event listeners
    setupFormListeners();
    
    // Show first section
    showSection('preBaseline');
    
    console.log('✅ LJLQ Survey initialized');
});

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
            submitBtn.className = 'btn btn-success';
            submitBtn.textContent = 'Submit Survey';
            submitBtn.onclick = submitSurvey;
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

// Export survey data
function exportSurveyData() {
    console.log('📊 Exporting survey data...');
    
    const timestamp = new Date().toISOString();
    const exportData = {
        timestamp: timestamp,
        surveyData: surveyData
    };
    
    // Create download link
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ljlq_survey_${timestamp.split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    console.log('✅ Survey data exported');
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