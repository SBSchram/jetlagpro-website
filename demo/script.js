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
        const airport = this.airports.find(a => a.code === airportCode);
        if (!airport) return;

        this.selectedAirport = airport;
        this.displaySelectedAirport(airport);
        this.hideAirportResults();
        this.updateActivePoint();
        this.updatePointSchedule();
    }

    displaySelectedAirport(airport) {
        const selectedAirportDiv = document.getElementById('selectedAirport');
        const airportName = document.getElementById('airportName');
        const airportLocation = document.getElementById('airportLocation');
        const airportTimezone = document.getElementById('airportTimezone');

        airportName.textContent = `${airport.code} - ${airport.name}`;
        airportLocation.textContent = `${airport.city}, ${airport.country}`;
        airportTimezone.textContent = `Timezone: ${airport.timezone}`;

        selectedAirportDiv.style.display = 'block';
        selectedAirportDiv.classList.add('fade-in');
    }

    updateActivePoint() {
        if (!this.selectedAirport) return;

        const destinationTime = this.getDestinationTime();
        const hour = destinationTime.getHours();
        const pointId = this.hourToPointId[hour];
        const point = this.points.find(p => p.id === pointId);

        if (!point) return;

        this.currentPoint = point;
        this.displayActivePoint(point, destinationTime);
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
        document.getElementById('pointNumber').textContent = point.id;

        // Update point names
        document.getElementById('pointName').textContent = point.name;
        document.getElementById('pointChineseName').textContent = `${point.chineseName} (${point.chineseChars})`;

        // Update point details
        document.getElementById('pointLocation').textContent = point.pointLocation;
        document.getElementById('pointStimulation').textContent = point.stimulationMethod;
        document.getElementById('pointFunctions').textContent = point.functions;

        // Update point image
        const pointImage = document.getElementById('pointImage');
        pointImage.src = `assets/point-images/${point.imageName}.jpg`;
        pointImage.alt = `${point.name} location`;

        // Update point video
        const videoSource = document.getElementById('videoSource');
        videoSource.src = `assets/videos/${point.videoName}`;
        const pointVideo = document.getElementById('pointVideo');
        pointVideo.load(); // Reload video with new source

        // Show the active point section and expand it
        const activePointSection = document.getElementById('activePointSection');
        activePointSection.style.display = 'block';
        activePointSection.classList.add('fade-in');
        
        // Auto-expand the active point section
        const activePointContent = document.getElementById('activePointContent');
        const activePointChevron = document.getElementById('activePointChevron');
        activePointContent.style.display = 'block';
        activePointChevron.textContent = '▲';
    }

    updatePointSchedule() {
        if (!this.selectedAirport) return;

        const scheduleGrid = document.getElementById('pointSchedule');
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
        scheduleSection.style.display = 'block';
        scheduleSection.classList.add('fade-in');
        
        // Auto-expand the schedule section
        const scheduleContent = document.getElementById('pointScheduleContent');
        const scheduleChevron = document.getElementById('pointScheduleChevron');
        scheduleContent.style.display = 'block';
        scheduleChevron.textContent = '▲';
    }

    formatHour(hour) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:00 ${period}`;
    }

    startTimeUpdates() {
        // Update time every minute
        setInterval(() => {
            if (this.selectedAirport) {
                this.updateActivePoint();
                this.updatePointSchedule();
            }
        }, 60000); // 60 seconds
    }

    showDefaultSections() {
        // Show demo status and airport selection by default
        const demoStatusContent = document.getElementById('demoStatusContent');
        const demoStatusChevron = document.getElementById('demoStatusChevron');
        const airportSelectionContent = document.getElementById('airportSelectionContent');
        const airportSelectionChevron = document.getElementById('airportSelectionChevron');
        
        demoStatusContent.style.display = 'block';
        demoStatusChevron.textContent = '▲';
        airportSelectionContent.style.display = 'block';
        airportSelectionChevron.textContent = '▲';
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

// Add some utility functions for better user experience
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounce the airport search for better performance
// Note: This will be handled within the class method itself

// Add smooth scrolling for better UX
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading states
function showLoading(element) {
    element.classList.add('loading');
}

function hideLoading(element) {
    element.classList.remove('loading');
}

// Add keyboard navigation for airport search
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        demo.hideAirportResults();
    }
});

// Add touch support for mobile devices
if ('ontouchstart' in window) {
    document.addEventListener('touchstart', () => {}, {passive: true});
}

// Service worker registration removed for demo simplicity 