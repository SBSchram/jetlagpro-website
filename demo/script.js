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
        this.updateAirportDisplay();
        this.updateActivePoint();
        this.updatePointSchedule();
        this.hideAirportResults();
        
        // Clear search input
        const searchInput = document.getElementById('airportSearch');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Switch to Journey tab to show the active point
        this.switchToTab('journey');
    }

    updateAirportDisplay() {
        if (!this.selectedAirport) return;

        const airportName = document.getElementById('airportName');
        const airportLocation = document.getElementById('airportLocation');
        const airportTimezone = document.getElementById('airportTimezone');
        const selectedAirportDiv = document.getElementById('selectedAirport');

        if (airportName) airportName.textContent = this.selectedAirport.name;
        if (airportLocation) airportLocation.textContent = `${this.selectedAirport.city}, ${this.selectedAirport.country}`;
        if (airportTimezone) airportTimezone.textContent = `Timezone: ${this.selectedAirport.timezone}`;
        if (selectedAirportDiv) selectedAirportDiv.style.display = 'block';
    }

    updateActivePoint() {
        if (!this.selectedAirport) return;

        const destinationTime = this.getDestinationTime();
        const currentHour = destinationTime.getHours();
        const pointId = this.hourToPointId[currentHour];
        const point = this.points.find(p => p.id === pointId);

        if (point) {
            this.currentPoint = point;
            this.displayActivePoint(point, destinationTime);
        }
    }

    getDestinationTime() {
        if (!this.selectedAirport) return new Date();

        // Get current time in destination timezone
        const now = new Date();
        const destinationTime = new Date(now.toLocaleString("en-US", {timeZone: this.selectedAirport.timezone}));
        return destinationTime;
    }

    displayActivePoint(point, destinationTime) {
        // Update point number
        const pointNumber = document.getElementById('pointNumber');
        if (pointNumber) pointNumber.textContent = point.id;

        // Update point names
        const pointName = document.getElementById('pointName');
        const pointChineseName = document.getElementById('pointChineseName');
        if (pointName) pointName.textContent = point.name;
        if (pointChineseName) pointChineseName.textContent = `${point.chineseName} (${point.chineseChars})`;

        // Update point details
        const pointLocation = document.getElementById('pointLocation');
        const pointStimulation = document.getElementById('pointStimulation');
        const pointFunctions = document.getElementById('pointFunctions');
        if (pointLocation) pointLocation.textContent = point.pointLocation;
        if (pointStimulation) pointStimulation.textContent = point.stimulationMethod;
        if (pointFunctions) pointFunctions.textContent = point.functions;

        // Update point image
        const pointImage = document.getElementById('pointImage');
        if (pointImage) {
            pointImage.src = `assets/point-images/${point.imageName}.jpg`;
            pointImage.alt = `${point.name} location`;
        }

        // Update point video
        const videoSource = document.getElementById('videoSource');
        const pointVideo = document.getElementById('pointVideo');
        if (videoSource && pointVideo) {
            videoSource.src = `assets/videos/${point.videoName}`;
            pointVideo.load(); // Reload video with new source
        }

        // Show the active point section and expand it
        const activePointSection = document.getElementById('activePointSection');
        if (activePointSection) {
            activePointSection.style.display = 'block';
            activePointSection.classList.add('fade-in');
            
            // Auto-expand the active point section
            const activePointContent = document.getElementById('activePointContent');
            const activePointChevron = document.getElementById('activePointChevron');
            if (activePointContent) activePointContent.style.display = 'block';
            if (activePointChevron) activePointChevron.textContent = '▲';
        }
    }

    updatePointSchedule() {
        if (!this.selectedAirport) return;

        const scheduleGrid = document.getElementById('pointSchedule');
        if (!scheduleGrid) return;

        const destinationTime = this.getDestinationTime();
        const currentHour = destinationTime.getHours();

        const scheduleHTML = this.hourToPointId.map((pointId, hour) => {
            const point = this.points.find(p => p.id === pointId);
            const isActive = hour === currentHour;
            const timeString = this.formatHour(hour);
            
            return `
                <div class="schedule-item ${isActive ? 'active' : ''}">
                    <div class="schedule-time">${timeString}</div>
                    <div class="schedule-point">${point ? point.name : 'Unknown'}</div>
                </div>
            `;
        }).join('');

        scheduleGrid.innerHTML = scheduleHTML;

        // Show the schedule section and expand it
        const scheduleSection = document.getElementById('pointScheduleSection');
        if (scheduleSection) {
            scheduleSection.style.display = 'block';
            scheduleSection.classList.add('fade-in');
            
            // Auto-expand the schedule section
            const scheduleContent = document.getElementById('pointScheduleContent');
            const scheduleChevron = document.getElementById('pointScheduleChevron');
            if (scheduleContent) scheduleContent.style.display = 'block';
            if (scheduleChevron) scheduleChevron.textContent = '▲';
        }
    }

    formatHour(hour) {
        return hour === 0 ? '12 AM' : 
               hour < 12 ? `${hour} AM` : 
               hour === 12 ? '12 PM' : 
               `${hour - 12} PM`;
    }

    startTimeUpdates() {
        // Update time every minute
        setInterval(() => {
            if (this.selectedAirport) {
                this.updateActivePoint();
                this.updatePointSchedule();
            }
        }, 60000);
    }

    showDefaultSections() {
        // Show demo status and instructions by default on home tab
        const demoStatusContent = document.getElementById('demoStatusContent');
        const demoStatusChevron = document.getElementById('demoStatusChevron');
        const instructionsContent = document.getElementById('instructionsContent');
        const instructionsChevron = document.getElementById('instructionsChevron');
        
        if (demoStatusContent) demoStatusContent.style.display = 'block';
        if (demoStatusChevron) demoStatusChevron.textContent = '▲';
        if (instructionsContent) instructionsContent.style.display = 'block';
        if (instructionsChevron) instructionsChevron.textContent = '▲';
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