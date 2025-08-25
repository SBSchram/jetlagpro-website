// JetLagPro Demo - Interactive Horary Points System
console.log('JetLagPro Demo script loading...');

// Simple utilities to reduce code duplication (no architectural complexity)
const CONSTANTS = {
    UPDATE_INTERVAL: 60000,
    MAX_RECENT_DESTINATIONS: 5,
    SEARCH_RESULTS_LIMIT: 10,
    STORAGE_KEYS: {
        SELECTED_AIRPORT: 'jetlagpro_selected_airport',
        RECENT_DESTINATIONS: 'recentDestinations'
    }
};

const Storage = {
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
        }
    },
    
    load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
            return null;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing ${key}:`, error);
        }
    }
};

const DOM = {
    // Get element safely (with null check and warning)
    get(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
        }
        return element;
    },
    
    // Show/hide elements
    show(id) {
        const element = this.get(id);
        if (element) element.style.display = 'block';
    },
    
    hide(id) {
        const element = this.get(id);
        if (element) element.style.display = 'none';
    },
    
    showFlex(id) {
        const element = this.get(id);
        if (element) element.style.display = 'flex';
    },
    
    // Update content
    setText(id, text) {
        const element = this.get(id);
        if (element) element.textContent = text;
    },
    
    setHTML(id, html) {
        const element = this.get(id);
        if (element) element.innerHTML = html;
    },
    
    // Set value (for inputs)
    setValue(id, value) {
        const element = this.get(id);
        if (element) element.value = value;
    },
    
    // Get value (for inputs)
    getValue(id) {
        const element = this.get(id);
        return element ? element.value : '';
    },
    
    // Add/remove classes
    addClass(id, className) {
        const element = this.get(id);
        if (element) element.classList.add(className);
    },
    
    removeClass(id, className) {
        const element = this.get(id);
        if (element) element.classList.remove(className);
    }
};

// Simple time utilities to reduce repetitive code
const TimeUtils = {
    // Convert local time to destination timezone
    toDestinationTime(timezone) {
        const now = new Date();
        return new Date(now.toLocaleString("en-US", {timeZone: timezone}));
    },
    
    // Calculate timezone offset in seconds (simpler method)
    getTimezoneOffset(timezone) {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const destination = new Date(utc + (this.getTimezoneOffsetMinutes(timezone) * 60000));
        return (now.getTime() - destination.getTime()) / 1000;
    },
    
    // Get timezone offset in minutes (helper for above)
    getTimezoneOffsetMinutes(timezone) {
        const now = new Date();
        const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
        const destination = new Date(utc.toLocaleString("en-US", {timeZone: timezone}));
        return (destination.getTime() - utc.getTime()) / 60000;
    },
    
    // Single time formatting method
    formatTime(date, options = {}) {
        const defaultOptions = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        return date.toLocaleTimeString('en-US', { ...defaultOptions, ...options });
    }
};

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
        this.recentDestinations = []; // Added for recent destinations
        this.maxRecentDestinations = CONSTANTS.MAX_RECENT_DESTINATIONS; // Use constant
        this.notificationSchedule = []; // Added for notification schedule
        this.timezoneOffset = 0; // Added for timezone offset
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing JetLagPro Demo...');
            await this.loadData();
            this.loadRecentDestinations();
            this.setupEventListeners();
            this.startTimeUpdates();
            
            // Load saved airport if exists
            const savedAirport = this.loadSelectedAirport();
            if (savedAirport) {
                console.log('Restoring saved airport:', savedAirport.code);
                this.selectedAirport = savedAirport;
                this.calculateTimezoneOffset(savedAirport);
                this.generateNotificationSchedule(savedAirport);
                this.updateDestinationDisplay();
                this.updateActivePoint();
                this.generatePointsList();
                this.hideDestinationTab();
            }
            
            // Always start with home tab
            this.switchToTab('home');
            
            // Show default sections expanded
            this.showDefaultSections();
            
            // Generate initial points list
            this.generatePointsList();
            
            // Show empty state for destination tab
            this.showEmptyState();
            
            console.log('Demo initialized successfully');
            
            // Debug: Check search bar styles after initialization
            setTimeout(() => {
                this.debugSearchBarStyles();
            }, 1000);
        } catch (error) {
            console.error('Failed to initialize demo:', error);
            this.showError('Failed to load demo data. Please refresh the page.');
        }
    }

    async loadData() {
        try {
            // Load airports data
            const airportsResponse = await fetch('airports.json');
            const airportsData = await airportsResponse.json();
            this.airports = airportsData.airports;
            console.log('Loaded airports:', this.airports.length);

            // Load points data
            const pointsResponse = await fetch('points.json');
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
            searchInput.addEventListener('focus', () => this.showSearchResults());
            searchInput.addEventListener('blur', () => {
                // Delay hiding results to allow clicking
                setTimeout(() => this.hideSearchResults(), 200);
            });
        } else {
            console.error('Search input element not found!');
        }

        // Simple approach: Only hide results when clicking on tab bar or other non-search areas
        document.addEventListener('click', (e) => {
            const target = e.target;
            const isInTabBar = target.closest('.tab-bar');
            const isInSearchArea = target.closest('#destinationTab');
            
            // Only hide if clicking on tab bar (switching tabs)
            if (isInTabBar) {
                this.hideSearchResults();
            }
        });
    }

    handleAirportSearch(query) {
        console.log('Searching for:', query);
        
        // Show/hide clear button
        const clearButton = document.getElementById('clearSearchButton');
        if (clearButton) {
            clearButton.style.display = query.trim() ? 'block' : 'none';
        }
        
        if (!query.trim()) {
            this.hideSearchResults();
            this.showEmptyState();
            return;
        }

        const results = this.searchAirports(query);
        console.log('Search results:', results);
        this.displaySearchResults(results);
    }

    searchAirports(query) {
        const searchTerm = query.toLowerCase();
        
        // First filter airports using iOS-style priority matching
        const filtered = this.airports.filter(airport => {
            const code = airport.code.toLowerCase();
            const city = airport.city.toLowerCase();
            const country = airport.country.toLowerCase();
            const name = airport.name.toLowerCase();
            
            // Priority 1: Exact airport code match
            if (code === searchTerm) return true;
            
            // Priority 2: Airport code starts with
            if (code.startsWith(searchTerm)) return true;
            
            // Priority 3: City name starts with
            if (city.startsWith(searchTerm)) return true;
            
            // Priority 4: Country name starts with
            if (country.startsWith(searchTerm)) return true;
            
            // Priority 5: Airport name starts with
            if (name.startsWith(searchTerm)) return true;
            
            return false;
        });
        
        // Then sort by priority (same logic as iOS app)
        const sorted = filtered.sort((airport1, airport2) => {
            const priority1 = this.getPriorityLevel(airport1, searchTerm);
            const priority2 = this.getPriorityLevel(airport2, searchTerm);
            
            // If priorities are different, sort by priority
            if (priority1 !== priority2) {
                return priority1 - priority2;
            }
            
            // If same priority, sort alphabetically by city
            return airport1.city.localeCompare(airport2.city);
        });
        
        return sorted.slice(0, CONSTANTS.SEARCH_RESULTS_LIMIT); // Limit to 10 results
    }
    
    getPriorityLevel(airport, searchText) {
        const code = airport.code.toLowerCase();
        const city = airport.city.toLowerCase();
        const country = airport.country.toLowerCase();
        const name = airport.name.toLowerCase();
        
        // Priority 1: Exact airport code match
        if (code === searchText) return 1;
        
        // Priority 2: Airport code starts with
        if (code.startsWith(searchText)) return 2;
        
        // Priority 3: City name starts with
        if (city.startsWith(searchText)) return 3;
        
        // Priority 4: Country name starts with
        if (country.startsWith(searchText)) return 4;
        
        // Priority 5: Airport name starts with
        if (name.startsWith(searchText)) return 5;
        
        return 6; // Should never reach here due to filter
    }

    displaySearchResults(results) {
        if (results.length === 0) {
            DOM.setHTML('searchResults', '<div class="airport-result"><div class="airport-info"><div class="airport-name">No airports found</div></div></div>');
        } else {
            const resultsHTML = results.map(airport => `
                <div class="airport-result" onclick="demo.selectAirport('${airport.code}')" data-airport-code="${airport.code}">
                    <div class="airport-info">
                        <div class="airport-name">${airport.name}</div>
                        <div class="airport-location">${airport.city}, ${airport.country}</div>
                    </div>
                    <div class="airport-code">${airport.code}</div>
                </div>
            `).join('');
            
            DOM.setHTML('searchResults', resultsHTML);
            
            // Add event listeners for cross-platform compatibility
            const resultsContainer = DOM.get('searchResults');
            if (resultsContainer) {
                const airportResults = resultsContainer.querySelectorAll('.airport-result');
                airportResults.forEach((element) => {
                    const airportCode = element.getAttribute('data-airport-code');
                    
                    // Add pointerdown event listener for cross-platform compatibility
                    element.addEventListener('pointerdown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.selectAirport(airportCode);
                    });
                    
                    // Also keep click as fallback
                    element.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.selectAirport(airportCode);
                    });
                });
            }
        }
        
        this.showSearchResults();
    }

    showSearchResults() {
        console.log('Showing search results');
        DOM.show('searchResults');
        DOM.hide('emptyState');
        DOM.hide('recentDestinations');
    }

    hideSearchResults() {
        console.log('Hiding search results');
        DOM.hide('searchResults');
    }

    showEmptyState() {
        DOM.showFlex('emptyState');
        this.updateRecentDestinationsDisplay();
    }

    clearSearch() {
        DOM.setValue('airportSearch', '');
        this.handleAirportSearch('');
    }

    selectAirport(airportCode) {
        const airport = this.airports.find(a => a.code === airportCode);
        if (!airport) {
            console.error('Airport not found:', airportCode);
            return;
        }

        this.selectedAirport = airport;
        this.saveSelectedAirport(airport); // Save to localStorage
        this.addRecentDestination(airport); // Add to recent destinations
        
        // Calculate timezone offset and generate notification schedule
        this.calculateTimezoneOffset(airport);
        this.generateNotificationSchedule(airport);
        
        this.updateDestinationDisplay();
        this.updateActivePoint();
        this.generatePointsList();
        this.hideSearchResults();
        
        // Clear search input
        DOM.setValue('airportSearch', '');
        
        // Switch to Journey tab (don't hide destination tab yet)
        this.switchToTab('journey');
        
        // Hide destination tab after switching
        setTimeout(() => {
            this.hideDestinationTab();
        }, 100);
    }

    updateDestinationDisplay() {
        if (this.selectedAirport) {
            DOM.setHTML('destinationStatus', `<span>Heading to ${this.selectedAirport.code} where it's <span id="destinationTime">${this.getDestinationTimeString()}</span></span>`);
            DOM.setText('destinationName', this.selectedAirport.name);
            DOM.show('destinationName');
            DOM.showFlex('endJourneyButton');
        } else {
            DOM.setHTML('destinationStatus', '<span>No Destination Yet</span>');
            DOM.hide('destinationName');
            DOM.hide('endJourneyButton');
        }
    }

        getDestinationTimeString() {
        if (!this.selectedAirport) return '';
        return TimeUtils.formatTime(TimeUtils.toDestinationTime(this.selectedAirport.timezone));
    }

    updateActivePoint() {
        if (!this.selectedAirport) {
            // No destination case: calculate based on local time
            const currentHour = new Date().getHours();
            const pointId = this.hourToPointId[currentHour];
            this.currentPoint = this.points.find(p => p.id === pointId);
        } else {
            // Destination case: find current point based on destination timezone
            const destinationTime = TimeUtils.toDestinationTime(this.selectedAirport.timezone);
            const destinationHour = destinationTime.getHours();
            const pointId = this.hourToPointId[destinationHour];
            this.currentPoint = this.points.find(p => p.id === pointId);
        }
    }

    getDestinationTime() {
        if (!this.selectedAirport) return new Date();
        return TimeUtils.toDestinationTime(this.selectedAirport.timezone);
    }

    generatePointsList() {
        const pointsList = DOM.get('pointsList');
        if (!pointsList) return;

        const orderedPoints = this.getOrderedPoints();
        const currentPointId = this.currentPoint ? this.currentPoint.id : null;

        const pointsHTML = orderedPoints.map((point, index) => {
            const isCurrent = point.id === currentPointId;
            const isExpanded = this.expandedPointId === point.id || isCurrent; // Auto-expand current point
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
                                <img src="assets/point-images/${point.imageName}.jpg?v=2025-07-26-1430" alt="${point.name} location">
                            </div>
                            <div class="point-video">
                                <video preload="metadata" autoplay loop muted playsinline>
                                    <source src="assets/videos/${point.videoName}?v=2025-07-26-1430" type="video/mp4">
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

        DOM.setHTML('pointsList', pointsHTML);
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
            // Destination case: order points by notification schedule, with current point at top
            const currentPointId = this.currentPoint ? this.currentPoint.id : null;
            
            // Get all points from notification schedule
            const schedulePoints = this.notificationSchedule.map(item => item.point);
            
            if (currentPointId) {
                // Find the current point in the schedule and move it to the front
                const currentPointIndex = schedulePoints.findIndex(p => p.id === currentPointId);
                if (currentPointIndex !== -1) {
                    const currentPoint = schedulePoints.splice(currentPointIndex, 1)[0];
                    schedulePoints.unshift(currentPoint);
                }
            }
            
            // Add any missing points from the original list
            const missingPoints = this.points.filter(point => 
                !schedulePoints.some(schedulePoint => schedulePoint.id === point.id)
            );
            
            return schedulePoints.concat(missingPoints);
        }
    }

    formatStimulationText(point, journeyOrder, currentPointId) {
        // Use ordinal number (journeyOrder) instead of point.id
        const pointName = `Point ${journeyOrder}`;
        
        if (!this.selectedAirport) {
            // No destination case
            if (point.id === currentPointId) {
                return `${pointName} is active now`;
            } else {
                return `${pointName} will be active at ${this.getPointTimeString(point.id)}`;
            }
        } else {
            // Destination case - use stored notification schedule
            const scheduleItem = this.notificationSchedule.find(item => item.point.id === point.id);
            if (!scheduleItem) {
                return `${pointName} - schedule not available`;
            }
            
            if (point.id === currentPointId) {
                return `${pointName} tells your body it is ${this.selectedAirport.code} time`;
            } else {
                const isPast = this.isPastPoint(point.id, currentPointId);
                if (isPast) {
                    return `${pointName} is no longer active`;
                } else {
                    const destTime = this.formatTime(scheduleItem.destinationTime);
                    const localTime = this.formatTime(scheduleItem.localTime);
                    return `Do ${pointName.toLowerCase()} (${destTime}) at your ${localTime}`;
                }
            }
        }
    }

    formatTime(date) {
        return TimeUtils.formatTime(date);
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
        
        const destinationTime = TimeUtils.toDestinationTime(this.selectedAirport.timezone);
        destinationTime.setHours(hour, 0, 0, 0);
        
        return TimeUtils.formatTime(destinationTime);
    }

    getPointLocalTime(pointId) {
        const hour = this.hourToPointId.indexOf(pointId);
        if (hour === -1) return '';
        
        const now = new Date();
        now.setHours(hour, 0, 0, 0);
        
        return TimeUtils.formatTime(now);
    }

    isPastPoint(pointId, currentPointId) {
        if (!currentPointId) return false;
        
        if (!this.selectedAirport) {
            // No destination case: compare based on hour order
            const currentHour = this.hourToPointId.indexOf(currentPointId);
            const pointHour = this.hourToPointId.indexOf(pointId);
            
            if (currentHour === -1 || pointHour === -1) return false;
            
            return pointHour < currentHour;
        } else {
            // Destination case: compare based on journey order (like Swift app)
            const orderedPoints = this.getOrderedPoints();
            const currentPointIndex = orderedPoints.findIndex(p => p.id === currentPointId);
            const pointIndex = orderedPoints.findIndex(p => p.id === pointId);
            
            if (currentPointIndex === -1 || pointIndex === -1) return false;
            
            // A point is past if it comes before the current point in the ordered list
            return pointIndex < currentPointIndex;
        }
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
        this.notificationSchedule = []; // Clear notification schedule
        this.timezoneOffset = 0; // Reset timezone offset
        
        // Clear localStorage
        this.clearSelectedAirport();
        
        // Clear search results and show recent destinations
        this.hideSearchResults();
        this.clearSearch();
        this.updateRecentDestinationsDisplay();
        
        this.updateDestinationDisplay();
        this.generatePointsList();
        this.showDestinationTab(); // Show destination tab when journey ends
        this.switchToTab('destination');
    }
    
    saveSelectedAirport(airport) {
        Storage.save(CONSTANTS.STORAGE_KEYS.SELECTED_AIRPORT, airport);
    }
    
    loadSelectedAirport() {
        return Storage.load(CONSTANTS.STORAGE_KEYS.SELECTED_AIRPORT);
    }
    
    clearSelectedAirport() {
        Storage.remove(CONSTANTS.STORAGE_KEYS.SELECTED_AIRPORT);
    }

    startTimeUpdates() {
        // Update time every minute
        setInterval(() => {
            if (this.selectedAirport) {
                this.updateDestinationDisplay();
                this.updateActivePoint();
                this.generatePointsList();
            }
        }, CONSTANTS.UPDATE_INTERVAL);
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
        const selectedTab = DOM.get(tabName + 'Tab');
        if (selectedTab) {
            selectedTab.classList.add('active');
        } else {
            console.error('Tab content not found:', tabName + 'Tab');
        }
        
        // Add active class to selected tab item
        const selectedTabItem = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
        if (selectedTabItem) {
            selectedTabItem.classList.add('active');
        } else {
            console.error('Tab item not found for:', tabName);
        }
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper error component
        console.error(message);
        alert(message);
    }

    addRecentDestination(airport) {
        // Remove if already exists
        this.recentDestinations = this.recentDestinations.filter(dest => dest.code !== airport.code);
        
        // Add to beginning
        this.recentDestinations.unshift(airport);
        
        // Keep only max number
        if (this.recentDestinations.length > this.maxRecentDestinations) {
            this.recentDestinations = this.recentDestinations.slice(0, this.maxRecentDestinations);
        }
        
        // Save to localStorage
        this.saveRecentDestinations();
        
        // Update display
        this.updateRecentDestinationsDisplay();
    }

    loadRecentDestinations() {
        const saved = Storage.load(CONSTANTS.STORAGE_KEYS.RECENT_DESTINATIONS);
        this.recentDestinations = saved || [];
    }

    saveRecentDestinations() {
        Storage.save(CONSTANTS.STORAGE_KEYS.RECENT_DESTINATIONS, this.recentDestinations);
    }

    clearRecentDestinations() {
        console.log('clearRecentDestinations called');
        this.recentDestinations = [];
        this.saveRecentDestinations();
        this.updateRecentDestinationsDisplay();
    }

    updateRecentDestinationsDisplay() {
        const recentList = DOM.get('recentList');
        const recentDestinations = DOM.get('recentDestinations');
        
        if (!recentList || !recentDestinations) return;
        
        console.log('updateRecentDestinationsDisplay called, length:', this.recentDestinations.length);
        
        if (this.recentDestinations.length === 0) {
            console.log('No recent destinations, hiding section');
            DOM.hide('recentDestinations');
            return;
        }
        
        console.log('Has recent destinations, showing section');
        const recentHTML = this.recentDestinations.map(airport => `
            <div class="airport-result" onclick="demo.selectAirport('${airport.code}')" data-airport-code="${airport.code}">
                <div class="airport-info">
                    <div class="airport-name">${airport.name}</div>
                    <div class="airport-location">${airport.city}, ${airport.country}</div>
                </div>
                <div class="airport-code">${airport.code}</div>
            </div>
        `).join('');
        
        DOM.setHTML('recentList', recentHTML);
        DOM.show('recentDestinations');
        DOM.hide('emptyState');
    }

    hideDestinationTab() {
        const destinationTab = document.querySelector('.tab-item[onclick="switchTab(\'destination\')"]');
        if (destinationTab) {
            destinationTab.style.display = 'none';
        }
    }

    showDestinationTab() {
        const destinationTab = document.querySelector('.tab-item[onclick="switchTab(\'destination\')"]');
        if (destinationTab) {
            destinationTab.style.display = 'flex';
        }
    }

    calculateTimezoneOffset(airport) {
        try {
            // Get destination timezone offset
            const destinationDate = new Date();
            const destinationTime = new Date(destinationDate.toLocaleString("en-US", {timeZone: airport.timezone}));
            const localTime = new Date();
            
            // Calculate offset in seconds (local - destination)
            this.timezoneOffset = (localTime.getTime() - destinationTime.getTime()) / 1000;
            
            const hoursDiff = Math.round(this.timezoneOffset / 3600);
            console.log(`Timezone offset: ${hoursDiff > 0 ? '+' : ''}${hoursDiff} hours`);
        } catch (error) {
            console.error('Error calculating timezone offset:', error);
            this.timezoneOffset = 0;
        }
    }

    generateNotificationSchedule(airport) {
        console.log('Generating notification schedule for:', airport.code);
        this.notificationSchedule = [];
        
        try {
            // Get current time in destination timezone
            const now = new Date();
            const destinationTime = new Date(now.toLocaleString("en-US", {timeZone: airport.timezone}));
            const currentHour = destinationTime.getHours();
            
            // Calculate next 12 odd-hour transitions
            const transitionTimes = this.calculateNextTransitionTimes(currentHour, destinationTime);
            
            // Create schedule items
            for (let i = 0; i < transitionTimes.length; i++) {
                const transitionTime = transitionTimes[i];
                const point = this.getPointForHour(transitionTime.getHours());
                
                // Convert destination time to local time
                const localTime = new Date(transitionTime.getTime() + this.timezoneOffset * 1000);
                
                const scheduleItem = {
                    point: point,
                    destinationTime: transitionTime,
                    localTime: localTime,
                    transitionNumber: i + 1,
                    destinationCode: airport.code,
                    destinationTimezone: airport.timezone
                };
                
                this.notificationSchedule.push(scheduleItem);
            }
            
            console.log(`Generated ${this.notificationSchedule.length} schedule items`);
        } catch (error) {
            console.error('Error generating notification schedule:', error);
        }
    }

    calculateNextTransitionTimes(currentHour, now) {
        const transitionTimes = [];
        
        // Find the next odd hour from current time
        let nextOddHour = currentHour;
        if (nextOddHour % 2 === 0) {
            nextOddHour += 1; // If even, go to next odd hour
        } else {
            nextOddHour += 2; // If odd, go to next odd hour
        }
        if (nextOddHour > 23) {
            nextOddHour = 1; // Wrap around to 1 AM
        }
        
        // Calculate 12 transition times (odd hours)
        for (let i = 0; i < 12; i++) {
            const targetHour = (nextOddHour + i * 2) % 24;
            if (targetHour === 0) targetHour = 24; // Handle midnight
            
            const transitionTime = new Date(now);
            transitionTime.setHours(targetHour, 0, 0, 0);
            
            // If this time has already passed today, move to tomorrow
            if (transitionTime <= now) {
                transitionTime.setDate(transitionTime.getDate() + 1);
            }
            
            transitionTimes.push(transitionTime);
        }
        
        return transitionTimes;
    }

    getPointForHour(hour) {
        const pointId = this.hourToPointId[hour];
        return this.points.find(p => p.id === pointId) || this.points[0];
    }
    
    debugSearchBarStyles() {
        console.log('=== SEARCH BAR DEBUG ===');
        
        const searchBar = document.querySelector('.search-bar');
        const searchInputWrapper = document.querySelector('.search-input-wrapper');
        const searchInput = document.getElementById('airportSearch');
        const destinationHeaderContent = document.querySelector('.destination-header-content');
        
        if (searchBar) {
            const computedStyle = window.getComputedStyle(searchBar);
            console.log('Search bar padding:', computedStyle.padding);
            console.log('Search bar width:', computedStyle.width);
            console.log('Search bar max-width:', computedStyle.maxWidth);
            console.log('Search bar display:', computedStyle.display);
        }
        
        if (searchInputWrapper) {
            const computedStyle = window.getComputedStyle(searchInputWrapper);
            console.log('Search input wrapper padding:', computedStyle.padding);
            console.log('Search input wrapper width:', computedStyle.width);
            console.log('Search input wrapper max-width:', computedStyle.maxWidth);
            console.log('Search input wrapper display:', computedStyle.display);
            console.log('Search input wrapper flex:', computedStyle.flex);
        }
        
        if (searchInput) {
            const computedStyle = window.getComputedStyle(searchInput);
            console.log('Search input width:', computedStyle.width);
            console.log('Search input padding:', computedStyle.padding);
            console.log('Search input placeholder:', searchInput.placeholder);
            console.log('Search input flex:', computedStyle.flex);
        }
        
        if (destinationHeaderContent) {
            const computedStyle = window.getComputedStyle(destinationHeaderContent);
            console.log('Destination header content padding:', computedStyle.padding);
            console.log('Destination header content width:', computedStyle.width);
            console.log('Destination header content display:', computedStyle.display);
        }
        
        console.log('=== END DEBUG ===');
    }
}

// Initialize the demo immediately when script loads
let demo = new JetLagProDemo();

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
        const isExpanded = content.style.display === 'block';
        content.style.display = isExpanded ? 'none' : 'block';
        chevron.textContent = isExpanded ? '▼' : '▲';
    }
}

// Copy survey code to clipboard
function copySurveyCode() {
    const surveyCode = 'JLP-A7B3C9D2';
    
    // Try to use the modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(surveyCode).then(() => {
            showCopySuccess();
        }).catch(err => {
            console.error('Failed to copy: ', err);
            fallbackCopyTextToClipboard(surveyCode);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyTextToClipboard(surveyCode);
    }
}

// Fallback copy function for older browsers
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess();
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        showCopyError();
    }
    
    document.body.removeChild(textArea);
}

// Show copy success message
function showCopySuccess() {
    const copyButton = document.querySelector('.copy-button');
    if (copyButton) {
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        copyButton.style.background = '#4CAF50';
        
        setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.style.background = '#007AFF';
        }, 2000);
    }
}

// Show copy error message
function showCopyError() {
    const copyButton = document.querySelector('.copy-button');
    if (copyButton) {
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Failed';
        copyButton.style.background = '#f44336';
        
        setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.style.background = '#007AFF';
        }, 2000);
    }
}

// Add keyboard navigation for airport search
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (demo) demo.hideSearchResults();
    }
});

// Add touch support for mobile devices
if ('ontouchstart' in window) {
    document.addEventListener('touchstart', () => {}, {passive: true});
} 