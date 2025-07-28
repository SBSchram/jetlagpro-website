// Survey JavaScript Functionality

// Global variables
let currentQuestion = 1;
let totalQuestions = 13;
let surveyData = {};
let currentPhase = 1;

// Initialize survey when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded - Starting survey initialization');
    console.log('📄 Current page:', window.location.href);
    console.log('🔍 Document ready state:', document.readyState);
    
    // Add global click listener for debugging
    document.addEventListener('click', function(e) {
        console.log('🖱️ Global click detected on:', e.target.tagName, e.target.className, e.target.textContent?.trim());
    });
    
    // Check if we're on the survey page
    if (window.location.pathname.includes('survey.html')) {
        console.log('✅ Survey page detected');
        initializeSurvey();
        setupEventListeners();
    } else {
        console.log('❌ Not on survey page');
    }
});

// Initialize survey
function initializeSurvey() {
    console.log('🔍 Initializing survey...');
    
    // Load saved progress if exists
    loadSurveyProgress();
    
    // Show first question
    showQuestion(currentQuestion);
    
    // Update progress
    updateProgress();
    
    console.log('✅ Survey initialized. Current question:', currentQuestion);
    console.log('📊 Total questions:', totalQuestions);
    console.log('📝 Survey data:', surveyData);
}

// Setup event listeners
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Slider event listeners
    setupSliders();
    
    // Emoji scale event listeners
    setupEmojiScales();
    
    // Button grid event listeners
    setupButtonGrids();
    
    // Demographic select event listeners
    setupDemographicSelects();
    
    console.log('✅ Event listeners setup complete');
}

// Setup slider functionality
function setupSliders() {
    const sliders = document.querySelectorAll('.slider');
    sliders.forEach(slider => {
        slider.addEventListener('input', function() {
            const value = this.value;
            const valueDisplay = document.getElementById(this.id + 'Value');
            if (valueDisplay) {
                valueDisplay.textContent = value;
            }
            
            // Save answer with question container ID
            const questionId = this.closest('.question-container').id;
            saveAnswer(questionId, value);
        });
    });
}

// Setup emoji scale functionality
function setupEmojiScales() {
    const emojiOptions = document.querySelectorAll('.emoji-option');
    emojiOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from siblings
            const siblings = this.parentElement.querySelectorAll('.emoji-option');
            siblings.forEach(sib => sib.classList.remove('selected'));
            
            // Add selected class to clicked option
            this.classList.add('selected');
            
            // Save answer
            const value = this.getAttribute('data-value');
            const questionId = this.closest('.question-container').id;
            saveAnswer(questionId, value);
        });
    });
}

// Setup button grid functionality
function setupButtonGrids() {
    const optionButtons = document.querySelectorAll('.option-button');
    console.log('🔘 Found option buttons:', optionButtons.length);
    
    if (optionButtons.length === 0) {
        console.log('❌ No option buttons found!');
        console.log('🔍 Looking for elements with class "option-button"');
        const allElements = document.querySelectorAll('*');
        console.log('📊 Total elements on page:', allElements.length);
        return;
    }
    
    optionButtons.forEach((button, index) => {
        console.log(`🔘 Button ${index + 1}:`, button.textContent.trim());
        console.log(`🔘 Button ${index + 1} classes:`, button.className);
        console.log(`🔘 Button ${index + 1} data-value:`, button.getAttribute('data-value'));
        
        button.addEventListener('click', function(e) {
            console.log('🔘 Button clicked:', this.textContent.trim());
            console.log('🔘 Click event:', e);
            
            // Remove selected class from siblings
            const siblings = this.parentElement.querySelectorAll('.option-button');
            siblings.forEach(sib => sib.classList.remove('selected'));
            
            // Add selected class to clicked button
            this.classList.add('selected');
            
            // Save answer
            const value = this.getAttribute('data-value');
            const questionId = this.closest('.question-container').id;
            console.log('💾 Saving answer:', questionId, value);
            saveAnswer(questionId, value);
        });
        
        console.log(`✅ Event listener attached to button ${index + 1}`);
    });
}

// Setup demographic select functionality
function setupDemographicSelects() {
    const demographicSelects = document.querySelectorAll('.demographic-select');
    demographicSelects.forEach(select => {
        select.addEventListener('change', function() {
            const value = this.value;
            const questionId = this.id; // Use the select's ID as the question key
            saveAnswer(questionId, value);
        });
    });
}

// Show specific question
function showQuestion(questionNumber) {
    // Hide all questions
    const questions = document.querySelectorAll('.question-container');
    questions.forEach(q => q.style.display = 'none');
    
    // Show current question
    const currentQ = document.getElementById('q' + questionNumber);
    if (currentQ) {
        currentQ.style.display = 'block';
    }
    
    // Update current question
    currentQuestion = questionNumber;
    
    // Update progress
    updateProgress();
    
    // Save progress
    saveSurveyProgress();
}

// Next question
function nextQuestion() {
    if (currentQuestion === 5) {
        // After q5, show demographic questions (q5b)
        showQuestion('5b');
    } else if (currentQuestion === '5b') {
        // After demographics, complete phase 1
        completePhase1();
    } else if (currentQuestion < totalQuestions) {
        showQuestion(currentQuestion + 1);
    }
}

// Previous question
function previousQuestion() {
    if (currentQuestion === '5b') {
        // Go back from demographics to q5
        showQuestion(5);
    } else if (currentQuestion > 1) {
        showQuestion(currentQuestion - 1);
    }
}

// Complete Phase 1
function completePhase1() {
    // Validate all questions are answered
    if (!validatePhase(1)) {
        alert('Please answer all questions before proceeding.');
        return;
    }
    
    // Hide Phase 1, show Phase 2
    document.getElementById('phase1').style.display = 'none';
    document.getElementById('phase2').style.display = 'block';
    
    // Reset to first question of Phase 2
    currentQuestion = 6;
    showQuestion(currentQuestion);
    currentPhase = 2;
}

// Complete Phase 2
function completePhase2() {
    // Validate all questions are answered
    if (!validatePhase(2)) {
        alert('Please answer all questions before proceeding.');
        return;
    }
    
    // Hide Phase 2, show Phase 3
    document.getElementById('phase2').style.display = 'none';
    document.getElementById('phase3').style.display = 'block';
    
    // Reset to first question of Phase 3
    currentQuestion = 9;
    showQuestion(currentQuestion);
    currentPhase = 3;
}

// Complete entire survey
function completeSurvey() {
    // Validate all questions are answered
    if (!validatePhase(3)) {
        alert('Please answer all questions before proceeding.');
        return;
    }
    
    // Save final data
    saveSurveyData();
    
    // Show completion screen
    document.getElementById('phase3').style.display = 'none';
    document.getElementById('surveyComplete').style.display = 'block';
    
    // Clear progress (survey complete)
    localStorage.removeItem('jetlagpro_survey_progress');
    localStorage.removeItem('jetlagpro_survey_data');
}

// Debug function to check saved answers
function debugSurveyData() {
    console.log('Current surveyData:', surveyData);
    console.log('Phase 1 validation:', validatePhase(1));
    for (let i = 1; i <= 5; i++) {
        const questionId = 'q' + i;
        console.log(`${questionId}:`, surveyData[questionId] || 'NOT ANSWERED');
    }
    
    // Also check demographic questions
    const demographicQuestions = ['q5b_ageRange', 'q5b_gender', 'q5b_travelExperience', 'q5b_geographicRegion', 'q5b_travelPurpose'];
    console.log('Demographic questions:');
    demographicQuestions.forEach(qId => {
        console.log(`${qId}:`, surveyData[qId] || 'NOT ANSWERED');
    });
}

// Validate phase completion
function validatePhase(phase) {
    let startQ, endQ;
    
    switch(phase) {
        case 1:
            startQ = 1;
            endQ = 5;
            break;
        case 2:
            startQ = 6;
            endQ = 8;
            break;
        case 3:
            startQ = 9;
            endQ = 13;
            break;
    }
    
    for (let i = startQ; i <= endQ; i++) {
        const questionId = 'q' + i;
        if (!surveyData[questionId]) {
            console.log('Missing answer for question:', questionId);
            console.log('Current surveyData:', surveyData);
            return false;
        }
    }
    
    // Note: Demographic questions (q5b) are optional and don't block phase completion
    return true;
}

// Save answer
function saveAnswer(questionId, value) {
    surveyData[questionId] = value;
    saveSurveyData();
}

// Save survey data
function saveSurveyData() {
    const data = {
        timestamp: new Date().toISOString(),
        phase: currentPhase,
        data: surveyData
    };
    
    localStorage.setItem('jetlagpro_survey_data', JSON.stringify(data));
}

// Save survey progress
function saveSurveyProgress() {
    const progress = {
        currentQuestion: currentQuestion,
        currentPhase: currentPhase,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('jetlagpro_survey_progress', JSON.stringify(progress));
}

// Load survey progress
function loadSurveyProgress() {
    const progress = localStorage.getItem('jetlagpro_survey_progress');
    const data = localStorage.getItem('jetlagpro_survey_data');
    
    if (progress) {
        const progressData = JSON.parse(progress);
        currentQuestion = progressData.currentQuestion;
        currentPhase = progressData.currentPhase;
    }
    
    if (data) {
        const surveyDataObj = JSON.parse(data);
        surveyData = surveyDataObj.data || {};
        
        // Restore selected values
        restoreSelectedValues();
    }
}

// Restore selected values
function restoreSelectedValues() {
    // Restore slider values
    Object.keys(surveyData).forEach(questionId => {
        const value = surveyData[questionId];
        
        // Check if it's a slider
        const slider = document.getElementById(questionId);
        if (slider && slider.type === 'range') {
            slider.value = value;
            const valueDisplay = document.getElementById(questionId + 'Value');
            if (valueDisplay) {
                valueDisplay.textContent = value;
            }
        }
        
        // Check if it's an emoji option
        const emojiOption = document.querySelector(`[data-value="${value}"]`);
        if (emojiOption && emojiOption.classList.contains('emoji-option')) {
            emojiOption.classList.add('selected');
        }
        
        // Check if it's a button option
        const buttonOption = document.querySelector(`[data-value="${value}"]`);
        if (buttonOption && buttonOption.classList.contains('option-button')) {
            buttonOption.classList.add('selected');
        }
    });
}

// Update progress bar
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill && progressText) {
        const percentage = (currentQuestion / totalQuestions) * 100;
        progressFill.style.width = percentage + '%';
        progressText.textContent = `Step ${currentQuestion} of ${totalQuestions}`;
    }
}

// Export survey data (for research purposes)
function exportSurveyData() {
    const data = localStorage.getItem('jetlagpro_survey_data');
    if (data) {
        const surveyDataObj = JSON.parse(data);
        
        // Create downloadable file
        const blob = new Blob([JSON.stringify(surveyDataObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jetlagpro_survey_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Clear survey data (for testing)
function clearSurveyData() {
    localStorage.removeItem('jetlagpro_survey_progress');
    localStorage.removeItem('jetlagpro_survey_data');
    location.reload();
}

// Analytics tracking (optional)
function trackSurveyEvent(event, data) {
    // This could be integrated with Google Analytics or other tracking
    console.log('Survey Event:', event, data);
}

// Handle page visibility change (save progress when user leaves)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        saveSurveyProgress();
    }
});

// Handle beforeunload (save progress when user closes tab)
window.addEventListener('beforeunload', function() {
    saveSurveyProgress();
}); 