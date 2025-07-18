// JetLagPro Demo - Interactive Horary Points System
console.log('JetLagPro Demo script loading...');

class JetLagProDemo {
    constructor() {
        console.log('JetLagPro Demo constructor called');
        this.airports = [];
        this.points = [];
        this.hourToPointId = [];
        this.selectedAirport = null;
        this.currentPoint = null;
        this.currentTab = 'home';
        this.expandedPointId = null;
        this.completedPoints = new Set();
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing JetLagPro Demo...');
            await this.loadData();
            this.setupEventListeners();
            this.startTimeUpdates();
            
            // Show default sections expanded
            this.showDefaultSections();
            
            // Generate initial points list
            this.generatePointsList();
            
            console.log('Demo initialized successfully');
        } catch (error) {
            console.error('Failed to initialize demo:', error);
            this.showError('Failed to load demo data. Please refresh the page.');
        }
    }

    async loadData() {
        try {
            // Load airports data
            const airportsResponse = await fetch('data/airports.json');
            const airportsData = await airportsResponse.json();
            this.airports = airportsData.airports;
            console.log('Loaded airports:', this.airports.length);

            // Load points data
            const pointsResponse = await fetch('data/points.json');
            const pointsData = await pointsResponse.json();
            this.points = pointsData.points;
            this.hourToPointId = pointsData.hourToPointId;
            console.log('Loaded points:', this.points.length);
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Airport search
        const searchInput = document.getElementById('airportSearch');
        console.log('Setting up event listeners for search input:', searchInput);
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleAirportSearch(e.target.value));
            searchInput.addEventListener('focus', () => this.showAirportResults());
            searchInput.addEventListener('blur', () => {
                // Delay hiding results to allow clicking
                setTimeout(() => this.hideAirportResults(), 200);
            });
        } else {
            console.error('Search input element not found!');
        }

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.airport-search')) {
                this.hideAirportResults();
            }
        });
    }

    handleAirportSearch(query) {
        console.log('Searching for:', query);
        if (!query.trim()) {
            this.hideAirportResults();
            return;
        }

        const results = this.searchAirports(query);
        console.log('Search results:', results);
        this.displayAirportResults(results);
    }

    searchAirports(query) {
        const searchTerm = query.toLowerCase();
        return this.airports.filter(airport => 
            airport.code.toLowerCase().includes(searchTerm) ||
            airport.name.toLowerCase().includes(searchTerm) ||
            airport.city.toLowerCase().includes(searchTerm) ||
            airport.country.toLowerCase().includes(searchTerm)
        ).slice(0, 10); // Limit to 10 results
    }

    displayAirportResults(results) {
        const resultsContainer = document.getElementById('airportResults');
        console.log('Displaying results in container:', resultsContainer);
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="airport-result">No airports found</div>';
        } else {
            resultsContainer.innerHTML = results.map(airport => `
                <div class="airport-result" onclick="demo.selectAirport('${airport.code}')">
                    <div class="airport-code">${airport.code}</div>
                    <div class="airport-details">${airport.name}, ${airport.city}, ${airport.country}</div>
                </div>
            `).join('');
        }
        
        this.showAirportResults();
    }

    showAirportResults() {
        const resultsContainer = document.getElementById('airportResults');
        console.log('Showing airport results');
        resultsContainer.style.display = 'block';
    }

    hideAirportResults() {
        const resultsContainer = document.getElementById('airportResults');
        console.log('Hiding airport results');
        resultsContainer.style.display = 'none';
    }

    selectAirport(airportCode) {
        console.log('Selecting airport:', airportCode);
        const airport = this.airports.find(a => a.code === airportCode);
        if (!airport) {
            console.error('Airport not found:', airportCode);
            return;
        }

        this.selectedAirport = airport;
        this.updateDestinationDisplay();
        this.updateActivePoint();
        this.generatePointsList();
        this.hideAirportResults();
        
        // Clear search input
        const searchInput = document.getElementById('airportSearch');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Switch to Journey tab to show the active point
        this.switchToTab('journey');
    }

    updateDestinationDisplay() {
        const destinationStatus = document.getElementById('destinationStatus');
        const destinationName = document.getElementById('destinationName');
        const endJourneyButton = document.getElementById('endJourneyButton');

        if (this.selectedAirport) {
            if (destinationStatus) {
                destinationStatus.innerHTML = `<span>Heading to ${this.selectedAirport.code} where it's <span id="destinationTime">${this.getDestinationTimeString()}</span></span>`;
            }
            if (destinationName) {
                destinationName.textContent = this.selectedAirport.name;
                destinationName.style.display = 'block';
            }
            if (endJourneyButton) {
                endJourneyButton.style.display = 'flex';
            }
        } else {
            if (destinationStatus) {
                destinationStatus.innerHTML = '<span>No Destination Yet</span>';
            }
            if (destinationName) {
                destinationName.style.display = 'none';
            }
            if (endJourneyButton) {
                endJourneyButton.style.display = 'none';
            }
        }
    }

    getDestinationTimeString() {
        if (!this.selectedAirport) return '';
        
        const now = new Date();
        const destinationTime = new Date(now.toLocaleString("en-US", {timeZone: this.selectedAirport.timezone}));
        return destinationTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }

    updateActivePoint() {
        if (!this.selectedAirport) return;

        const destinationTime = this.getDestinationTime();
        const currentHour = destinationTime.getHours();
        const pointId = this.hourToPointId[currentHour];
        const point = this.points.find(p => p.id === pointId);

        if (point) {
            this.currentPoint = point;
        }
    }

    getDestinationTime() {
        if (!this.selectedAirport) return new Date();

        // Get current time in destination timezone
        const now = new Date();
        const destinationTime = new Date(now.toLocaleString("en-US", {timeZone: this.selectedAirport.timezone}));
        return destinationTime;
    }

    generatePointsList() {
        const pointsList = document.getElementById('pointsList');
        if (!pointsList) return;

        const orderedPoints = this.getOrderedPoints();
        const currentPointId = this.currentPoint ? this.currentPoint.id : null;

        const pointsHTML = orderedPoints.map((point, index) => {
            const isCurrent = point.id === currentPointId;
            const isExpanded = this.expandedPointId === point.id;
            const isCompleted = this.completedPoints.has(point.id);
            const journeyOrder = index + 1;
            
            const stimulationText = this.formatStimulationText(point, journeyOrder, currentPointId);
            
            return `
                <div class="point-card ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${isExpanded ? 'expanded' : ''}" data-point-id="${point.id}">
                    <div class="point-header" onclick="demo.togglePoint(${point.id})">
                        <div class="point-stimulation-text">${stimulationText}</div>
                        <div class="point-chevron">${isExpanded ? '▲' : '▼'}</div>
                    </div>
                    <div class="point-content">
                        <div class="point-media">
                            <div class="point-image">
                                <img src="assets/point-images/${point.imageName}.jpg" alt="${point.name} location">
                            </div>
                            <div class="point-video">
                                <video controls preload="metadata">
                                    <source src="assets/videos/${point.videoName}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </div>
                        <div class="point-details">
                            <div class="point-detail-item">
                                <div class="point-detail-title">Location</div>
                                <div class="point-detail-content">${point.pointLocation}</div>
                            </div>
                            <div class="point-detail-item">
                                <div class="point-detail-title">Stimulate</div>
                                <div class="point-detail-content">${point.stimulationMethod}</div>
                            </div>
                            <div class="point-detail-item">
                                <div class="point-detail-title">Benefits</div>
                                <div class="point-detail-content">${point.functions}</div>
                            </div>
                        </div>
                        ${isCurrent && !isCompleted ? `
                            <div class="mark-stimulated-button">
                                <button class="mark-stimulated-btn" onclick="demo.markPointAsStimulated(${point.id})">
                                    <span>☐</span>
                                    <span>Mark as Stimulated</span>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${index < orderedPoints.length - 1 ? '<div class="point-divider"></div>' : ''}
            `;
        }).join('');

        pointsList.innerHTML = pointsHTML;
    }

    getOrderedPoints() {
        if (!this.selectedAirport) {
            // No destination case: order all points starting from current time
            const currentHour = new Date().getHours();
            const currentPointId = this.hourToPointId[currentHour];
            
            // Find the current point and order all points starting from it
            const orderedPoints = [];
            const seenPointIds = new Set();
            
            for (let i = 0; i < 24; i++) {
                const targetHour = (currentHour + i) % 24;
                const pointId = this.hourToPointId[targetHour];
                const point = this.points.find(p => p.id === pointId);
                
                if (point && !seenPointIds.has(point.id)) {
                    orderedPoints.push(point);
                    seenPointIds.add(point.id);
                }
            }
            
            return orderedPoints;
        } else {
            // Destination case: order points by notification schedule
            // For demo, we'll use the hour-to-point mapping
            const destinationTime = this.getDestinationTime();
            const currentHour = destinationTime.getHours();
            
            const orderedPoints = [];
            const seenPointIds = new Set();
            
            for (let i = 0; i < 24; i++) {
                const targetHour = (currentHour + i) % 24;
                const pointId = this.hourToPointId[targetHour];
                const point = this.points.find(p => p.id === pointId);
                
                if (point && !seenPointIds.has(point.id)) {
                    orderedPoints.push(point);
                    seenPointIds.add(point.id);
                }
            }
            
            return orderedPoints;
        }
    }

    formatStimulationText(point, journeyOrder, currentPointId) {
        const pointName = `${point.name} (${point.chineseChars})`;
        
        if (!this.selectedAirport) {
            // No destination case
            if (point.id === currentPointId) {
                return `${pointName} is active now`;
            } else {
                return `${pointName} will be active at ${this.getPointTimeString(point.id)}`;
            }
        } else {
            // Destination case
            if (point.id === currentPointId) {
                return `${pointName} tells your body it is ${this.selectedAirport.code} time`;
            } else {
                const isPast = this.isPastPoint(point.id, currentPointId);
                if (isPast) {
                    return `${pointName} is no longer active`;
                } else {
                    const destTime = this.getPointDestinationTime(point.id);
                    const localTime = this.getPointLocalTime(point.id);
                    return `Stimulate ${pointName} (${destTime}) at your ${localTime}`;
                }
            }
        }
    }

    getPointTimeString(pointId) {
        // Find the hour when this point is active
        const hour = this.hourToPointId.indexOf(pointId);
        if (hour === -1) return '';
        
        return hour === 0 ? '12 AM' : 
               hour < 12 ? `${hour} AM` : 
               hour === 12 ? '12 PM' : 
               `${hour - 12} PM`;
    }

    getPointDestinationTime(pointId) {
        if (!this.selectedAirport) return '';
        
        const hour = this.hourToPointId.indexOf(pointId);
        if (hour === -1) return '';
        
        const now = new Date();
        const destinationTime = new Date(now.toLocaleString("en-US", {timeZone: this.selectedAirport.timezone}));
        destinationTime.setHours(hour, 0, 0, 0);
        
        return destinationTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            hour12: true 
        });
    }

    getPointLocalTime(pointId) {
        const hour = this.hourToPointId.indexOf(pointId);
        if (hour === -1) return '';
        
        const now = new Date();
        now.setHours(hour, 0, 0, 0);
        
        return now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            hour12: true 
        });
    }

    isPastPoint(pointId, currentPointId) {
        if (!currentPointId) return false;
        
        const currentHour = this.hourToPointId.indexOf(currentPointId);
        const pointHour = this.hourToPointId.indexOf(pointId);
        
        if (currentHour === -1 || pointHour === -1) return false;
        
        return pointHour < currentHour;
    }

    togglePoint(pointId) {
        if (this.expandedPointId === pointId) {
            this.expandedPointId = null;
        } else {
            this.expandedPointId = pointId;
        }
        this.generatePointsList();
    }

    markPointAsStimulated(pointId) {
        this.completedPoints.add(pointId);
        this.generatePointsList();
        
        // Show completion feedback
        const button = document.querySelector(`[onclick="demo.markPointAsStimulated(${pointId})"]`);
        if (button) {
            button.innerHTML = '<span>☑</span><span>Completed</span>';
            button.classList.add('completed');
        }
    }

    endJourney() {
        this.selectedAirport = null;
        this.currentPoint = null;
        this.expandedPointId = null;
        this.completedPoints.clear();
        
        this.updateDestinationDisplay();
        this.generatePointsList();
    }

    startTimeUpdates() {
        // Update time every minute
        setInterval(() => {
            if (this.selectedAirport) {
                this.updateDestinationDisplay();
                this.updateActivePoint();
                this.generatePointsList();
            }
        }, 60000);
    }

    showDefaultSections() {
        // Start with all sections collapsed on home tab
        const notificationsContent = document.getElementById('notificationsContent');
        const notificationsChevron = document.getElementById('notificationsChevron');
        const stimulationContent = document.getElementById('stimulationContent');
        const stimulationChevron = document.getElementById('stimulationChevron');
        
        if (notificationsContent) notificationsContent.style.display = 'none';
        if (notificationsChevron) notificationsChevron.textContent = '▼';
        if (stimulationContent) stimulationContent.style.display = 'none';
        if (stimulationChevron) stimulationChevron.textContent = '▼';
    }

    switchToTab(tabName) {
        this.currentTab = tabName;
        
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Remove active class from all tab items
        const tabItems = document.querySelectorAll('.tab-item');
        tabItems.forEach(item => item.classList.remove('active'));
        
        // Show selected tab content
        const selectedTab = document.getElementById(tabName + 'Tab');
        if (selectedTab) selectedTab.classList.add('active');
        
        // Add active class to selected tab item
        const selectedTabItem = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
        if (selectedTabItem) selectedTabItem.classList.add('active');
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper error component
        console.error(message);
        alert(message);
    }
}

// Initialize the demo when the page loads
let demo;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - creating demo instance');
    demo = new JetLagProDemo();
});

// Global function for tab switching (called from HTML)
function switchTab(tabName) {
    if (demo) {
        demo.switchToTab(tabName);
    }
}

// Global function for section toggling (called from HTML)
function toggleSection(sectionId) {
    const content = document.getElementById(sectionId + 'Content');
    const chevron = document.getElementById(sectionId + 'Chevron');
    
    if (content && chevron) {
        if (content.style.display === 'none' || content.style.display === '') {
            content.style.display = 'block';
            chevron.textContent = '▲';
        } else {
            content.style.display = 'none';
            chevron.textContent = '▼';
        }
    }
}

// Add keyboard navigation for airport search
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (demo) demo.hideAirportResults();
    }
});

// Add touch support for mobile devices
if ('ontouchstart' in window) {
    document.addEventListener('touchstart', () => {}, {passive: true});
} 