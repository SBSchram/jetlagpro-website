// JetLagPro Demo - Interactive Horary Points System
console.log('JetLagPro Demo script loading...');

// Simple utilities to reduce code duplication (no architectural complexity)
const CONSTANTS = {
    UPDATE_INTERVAL: 60000,
    MAX_RECENT_DESTINATIONS: 3, // Match iOS: limit to 3 recent destinations
    SEARCH_RESULTS_LIMIT: 10,
    CACHE_VERSION: '2025-07-26-1430', // Cache busting version for assets
    ASSET_PATHS: {
        POINT_IMAGES: 'assets/point-images',
        VIDEOS: 'assets/videos'
    },
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
    },
    
    // iOS-compatible time formatting: "h a" when minutes are 0, "h:mm a" when minutes are not 0
    formatTimeIOS(date) {
        const minutes = date.getMinutes();
        const hours = date.getHours();
        
        // Format hour (1-12)
        const hour12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        // If minutes are 0, show "h a" (e.g., "3 PM")
        if (minutes === 0) {
            return `${hour12} ${ampm}`;
        }
        
        // If minutes are not 0, show "h:mm a" (e.g., "3:30 PM")
        const minutesStr = minutes.toString().padStart(2, '0');
        return `${hour12}:${minutesStr} ${ampm}`;
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
        this.currentTab = 'destination';
        this.expandedPointId = null;
        this.completedPoints = new Set();
        this.recentDestinations = []; // Added for recent destinations
        this.maxRecentDestinations = CONSTANTS.MAX_RECENT_DESTINATIONS; // Use constant
        this.notificationSchedule = []; // Added for notification schedule
        this.timezoneOffset = 0; // Added for timezone offset
        this.tripStartDate = null; // Track when trip started
        
        // Phase 5: Image cycling system
        // Track cycle state per point: 0=original, 1=alternate, 2=mirror original, 3=mirror alternate
        this.pointCycleStates = new Map(); // Map<pointId, cycleState>
        this.videoObservers = new Map(); // Map<pointId, {video, observer}> for cleanup
        
        // Trip tracking
        this.completedTrips = []; // Array of completed trip objects
        
        // Reward message tracking (matches iOS)
        this.currentStreak = 0; // Current consecutive streak
        this.lastCompletedPointId = null; // Last completed point ID for streak tracking
        this.encouragementMessageTimeout = null; // Timeout for auto-hiding messages
        
        // Timers removed per user request
        
        // Achievement tracking
        this.achievements = []; // Array of unlocked achievements
        this.achievementTimeout = null; // Timeout for auto-hiding achievement popup
        
        this.init();
    }

    // Helper methods to reduce code duplication
    
    /**
     * Find a point by its ID
     */
    findPointById(pointId) {
        return this.points.find(p => p.id === pointId);
    }
    
    /**
     * Find a schedule item by point ID
     */
    findScheduleItemByPointId(pointId) {
        return this.notificationSchedule.find(item => item.point.id === pointId);
    }
    
    /**
     * Get a DOM element within a point card
     */
    getPointElement(pointId, selector) {
        return document.querySelector(`[data-point-id="${pointId}"] ${selector}`);
    }
    
    /**
     * Apply mirror transform to an element
     */
    applyMirrorTransform(element, shouldMirror) {
        if (element) {
            element.style.transform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
        }
    }
    
    /**
     * Get image path with cache busting
     */
    getImagePath(imageName, cycleState = null) {
        const basePath = `${CONSTANTS.ASSET_PATHS.POINT_IMAGES}/${imageName}.jpg?v=${CONSTANTS.CACHE_VERSION}`;
        // Add cycle state to force reload when cycling between base and "a" variant
        if (cycleState !== null) {
            return `${basePath}&cycle=${cycleState}`;
        }
        return basePath;
    }
    
    /**
     * Get video path with cache busting
     */
    getVideoPath(videoName) {
        return `${CONSTANTS.ASSET_PATHS.VIDEOS}/${videoName}?v=${CONSTANTS.CACHE_VERSION}`;
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
                
                // iOS behavior: If destination is active, start on Points tab (journey tab)
                this.switchToTab('journey');
            } else {
                // No active destination: start on Destinations tab (match iOS default)
                this.switchToTab('destination');
            }
            
            // Show default sections expanded
            this.showDefaultSections();
            
            // Generate initial points list
            this.generatePointsList();
            
            // Load completed trips and update home screen
            this.loadCompletedTrips();
            // Home screen removed - no trip/achievement tracking in demo
            
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
        // Update displays based on search state
        const searchText = query.trim();
        if (searchText === '') {
            this.updateRecentDestinationsDisplay();
            this.updateEmptyState();
        }
        console.log('Searching for:', query);
        
        // Show/hide clear button
        const clearButton = document.getElementById('clearSearchButton');
        if (clearButton) {
            clearButton.style.display = query.trim() ? 'block' : 'none';
        }
        
        if (!query.trim()) {
            this.hideSearchResults();
            this.updateEmptyState();
            this.updateRecentDestinationsDisplay();
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
        // Update displays when search is cleared
        this.updateRecentDestinationsDisplay();
        this.updateEmptyState();
    }

    showEmptyState() {
        this.updateEmptyState();
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
        this.tripStartDate = new Date(); // Track trip start time
        
        this.updateDestinationDisplay();
        this.updateActivePoint();
        this.generatePointsList();
        this.hideSearchResults();
        
        // Clear search input
        DOM.setValue('airportSearch', '');
        
        // Update displays
        this.updateRecentDestinationsDisplay();
        this.updateEmptyState();
        
        // Switch to Journey tab (don't hide destination tab yet)
        this.switchToTab('journey');
        
        // Hide destination tab after switching
        setTimeout(() => {
            this.hideDestinationTab();
        }, 100);
    }

    updateDestinationDisplay() {
        if (this.selectedAirport) {
            const timeString = this.getDestinationTimeString();
            const airportName = this.selectedAirport.name;
            const airportCode = this.selectedAirport.code;
            const displayText = `${airportName} [${airportCode}]`; // Match iOS format: name [CODE]
            // Calculate dynamic font size based on airport name length (matching iOS logic)
            let fontSize = '20px'; // title2 default
            if (airportName.length > 20 && airportName.length <= 30) {
                fontSize = '18px'; // title3
            } else if (airportName.length > 30 && airportName.length <= 40) {
                fontSize = '16px'; // headline
            } else if (airportName.length > 40) {
                fontSize = '14px'; // subheadline
            }
            DOM.setHTML('destinationStatus', `<span class="airport-name-text" style="font-size: ${fontSize}; font-weight: 600;">${displayText}</span> <span class="destination-time" style="font-size: 14px; opacity: 0.8;">(<span id="destinationTime">${timeString}</span>)</span>`);
            DOM.hide('destinationName');
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
            this.currentPoint = this.findPointById(pointId);
        } else {
            // Destination case: find current point based on destination timezone
            const destinationTime = TimeUtils.toDestinationTime(this.selectedAirport.timezone);
            const destinationHour = destinationTime.getHours();
            const pointId = this.hourToPointId[destinationHour];
            this.currentPoint = this.findPointById(pointId);
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

        // Determine current journey order for isNextUp detection
        let currentJourneyOrder = null;
        if (this.selectedAirport && currentPointId && this.notificationSchedule.length > 0) {
            const currentScheduleItem = this.findScheduleItemByPointId(currentPointId);
            currentJourneyOrder = currentScheduleItem ? currentScheduleItem.transitionNumber : null;
        }
        
        // Check if current point is completed (for isNextUp logic)
        const isCurrentPointCompleted = currentPointId ? this.completedPoints.has(currentPointId) : false;
        
        const pointsHTML = orderedPoints.map((point, index) => {
            const isCurrent = point.id === currentPointId;
            const isExpanded = this.expandedPointId === point.id || isCurrent; // Auto-expand current point
            const isCompleted = this.completedPoints.has(point.id);
            
            // Get journeyOrder from transitionNumber in notification schedule
            // If no destination or schedule item not found, fall back to index + 1
            let journeyOrder;
            if (this.selectedAirport && this.notificationSchedule.length > 0) {
                const scheduleItem = this.findScheduleItemByPointId(point.id);
                journeyOrder = scheduleItem ? scheduleItem.transitionNumber : (index + 1);
            } else {
                // No destination case: use index + 1
                journeyOrder = index + 1;
            }
            
            // Determine if this is a past point (calculate once, reuse)
            const isPast = this.selectedAirport ? this.isPastPoint(point.id, currentPointId) : false;
            
            // Determine if this is the "next up" point
            // Next up = first future point after current point, only shown when current point is completed
            let isNextUp = false;
            if (this.selectedAirport && currentJourneyOrder !== null && !isCurrent) {
                if (!isPast && isCurrentPointCompleted) {
                    // This is a future point and current is completed
                    // Check if this is the first future point
                    const pointScheduleItem = this.findScheduleItemByPointId(point.id);
                    if (pointScheduleItem) {
                        const pointJourneyOrder = pointScheduleItem.transitionNumber;
                        // Check if this is the first point after current
                        const allFuturePoints = this.notificationSchedule
                            .filter(item => {
                                const itemIsPast = this.isPastPoint(item.point.id, currentPointId);
                                return !itemIsPast && item.point.id !== currentPointId;
                            })
                            .sort((a, b) => a.transitionNumber - b.transitionNumber);
                        
                        if (allFuturePoints.length > 0 && allFuturePoints[0].point.id === point.id) {
                            isNextUp = true;
                        }
                    }
                }
            }
            
            const stimulationText = this.formatStimulationText(point, journeyOrder, currentPointId, isNextUp);
            
            return `
                <div class="point-card ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${isPast ? 'past' : ''} ${isExpanded ? 'expanded' : ''} ${this.getBorderColorClass(point, isCurrent, isPast)}" data-point-id="${point.id}">
                    <div class="point-header" onclick="demo.togglePoint(${point.id})">
                        <div class="point-stimulation-text">${stimulationText}</div>
                        <div class="point-chevron">${isExpanded ? '▲' : '▼'}</div>
                    </div>
                    <div class="point-content">
                        <!-- Location section FIRST (match iOS) -->
                        <div class="point-detail-item">
                            <div class="point-detail-content"><strong>Locate the point</strong>: ${point.pointLocation}</div>
                        </div>
                        
                        <!-- Point Image and Video Layout (match iOS HStack) -->
                        <div class="point-media">
                            <div class="point-image-container">
                                <div class="point-image">
                                    <img src="${this.getImagePath(this.getImageNameForCycle(point), this.getCycleState(point.id))}" alt="${point.name} location" data-point-id="${point.id}">
                                </div>
                                <div class="point-left-right-label">${this.getLeftRightLabel(point)}</div>
                            </div>
                            <div class="point-video">
                                <video preload="metadata" autoplay muted playsinline data-point-id="${point.id}">
                                    <source src="${this.getVideoPath(point.videoName)}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </div>
                        
                        <!-- Stimulation section LAST (match iOS) -->
                        <div class="point-detail-item">
                            <div class="point-detail-content"><strong>Stimulate</strong>: ${point.stimulationMethod} ${this.getStimulationSuffix(point)}</div>
                        </div>
                    </div>
                </div>
                ${index < orderedPoints.length - 1 ? '<div class="point-divider"></div>' : ''}
            `;
        }).join('');

        DOM.setHTML('pointsList', pointsHTML);
        
        // Phase 5: Setup video loop observers and apply initial mirroring for all expanded points
        // Use setTimeout to ensure DOM is fully updated
        setTimeout(() => {
            orderedPoints.forEach(point => {
                const isExpanded = this.expandedPointId === point.id || point.id === currentPointId;
                if (isExpanded) {
                    // Initialize cycle state to 0 if not already set
                    if (!this.pointCycleStates.has(point.id)) {
                        this.setCycleState(point.id, 0);
                    }
                    // Apply initial mirroring based on current cycle state
                    this.applyInitialMirroring(point.id);
                    // Setup video loop observer
                    this.setupVideoLoopObserver(point.id);
                }
            });
        }, 100);
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
                const point = this.findPointById(pointId);
                
                if (point && !seenPointIds.has(point.id)) {
                    orderedPoints.push(point);
                    seenPointIds.add(point.id);
                }
            }
            
            return orderedPoints;
        } else {
            // Destination case: order points by transitionNumber from notification schedule
            const currentPointId = this.currentPoint ? this.currentPoint.id : null;
            
            // Sort notification schedule by transitionNumber (1-12)
            const sortedSchedule = [...this.notificationSchedule].sort((a, b) => {
                // Handle missing transitionNumber (fallback to current behavior)
                const aNum = a.transitionNumber || 999;
                const bNum = b.transitionNumber || 999;
                return aNum - bNum;
            });
            
            // Get points in sorted order - schedule is already sorted by transitionNumber (1-12)
            // transitionNumber 1 = current point (first point in journey), so no need to reorder
            let schedulePoints = sortedSchedule.map(item => item.point);
            
            // Add any missing points from the original list
            const missingPoints = this.points.filter(point => 
                !schedulePoints.some(schedulePoint => schedulePoint.id === point.id)
            );
            
            return schedulePoints.concat(missingPoints);
        }
    }

    formatStimulationText(point, journeyOrder, currentPointId, isNextUp = false) {
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
            const scheduleItem = this.findScheduleItemByPointId(point.id);
            if (!scheduleItem) {
                return `${pointName} is not yet ready to stimulate`;
            }
            
            if (point.id === currentPointId) {
                // Current point: check if completed
                if (this.completedPoints.has(point.id)) {
                    return `Massage ${pointName} Complete`;
                } else {
                    return `Massage ${pointName} now`;
                }
            } else {
                const isPast = this.isPastPoint(point.id, currentPointId);
                if (isPast) {
                    // Past point: just show point name (no additional text)
                    return pointName;
                } else {
                    // Future point: "Rub Point X at [local time]"
                    const localTime = this.formatTime(scheduleItem.localTime);
                    let text = `Rub ${pointName} at ${localTime}`;
                    
                    // Append "NEXT UP" if this is the next upcoming point
                    if (isNextUp) {
                        text += " NEXT UP";
                    }
                    
                    return text;
                }
            }
        }
    }

    formatTime(date) {
        // Use iOS-compatible formatter for point display
        return TimeUtils.formatTimeIOS(date);
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

    // Phase 5: Image Cycling System Methods
    
    /**
     * Get the current cycle state for a point (defaults to 0)
     * State 0: original image, State 1: "a" image, State 2: mirror original, State 3: mirror "a"
     */
    getCycleState(pointId) {
        return this.pointCycleStates.get(pointId) || 0;
    }
    
    /**
     * Set the cycle state for a point
     */
    setCycleState(pointId, state) {
        this.pointCycleStates.set(pointId, state % 4);
    }
    
    /**
     * Advance the cycle state for a point (0→1→2→3→0...)
     */
    advanceCycle(pointId) {
        const currentState = this.getCycleState(pointId);
        this.setCycleState(pointId, currentState + 1);
        // Update the image in the DOM if the point is expanded
        this.updatePointImage(pointId);
    }
    
    /**
     * Get the image name for the current cycle state
     * State 0,2: original image (e.g., "LU-8")
     * State 1,3: alternate image (e.g., "LU-8a")
     */
    getImageNameForCycle(point) {
        const cycleState = this.getCycleState(point.id);
        const useAlternate = (cycleState === 1 || cycleState === 3);
        return useAlternate ? point.imageName + "a" : point.imageName;
    }
    
    /**
     * Get the Left/Right label for the current cycle state
     * KI-3, LI-1, PC-8: States 0,1 = "Left"; States 2,3 = "Right"
     * All other points: States 0,1 = "Right"; States 2,3 = "Left"
     */
    getLeftRightLabel(point) {
        const cycleState = this.getCycleState(point.id);
        const specialPoints = ["KI-3", "LI-1", "PC-8"];
        
        if (specialPoints.includes(point.imageName)) {
            // KI-3, LI-1, PC-8: cycleState 0,1 = Left; 2,3 = Right
            return (cycleState < 2) ? "Left" : "Right";
        } else {
            // All other points: cycleState 0,1 = Right; 2,3 = Left
            return (cycleState < 2) ? "Right" : "Left";
        }
    }
    
    /**
     * Get the limb word for stimulation suffix (matches iOS logic)
     * Returns: "leg", "foot", "hand", "wrist", "forearm", or "arm"
     */
    getLimbWord(point) {
        switch (point.imageName) {
            case "ST-36":
                return "leg";
            case "SP-3":
            case "BL-66":
            case "KI-3":
            case "GB-41":
            case "LIV-1":
                return "foot";
            case "LI-1":
            case "PC-8":
            case "HT-8":
                return "hand";
            case "LU-8":
            case "SI-5":
                return "wrist";
            case "SJ-6":
                return "forearm";
            default:
                return "arm";
        }
    }
    
    /**
     * Get the stimulation suffix (matches iOS format)
     * Returns: "Work each [limb] for 30 seconds."
     */
    getStimulationSuffix(point) {
        const limbWord = this.getLimbWord(point);
        return `Work each ${limbWord} for 30 seconds.`;
    }
    
    /**
     * Check if the image should be mirrored (states 2 and 3)
     */
    isMirrored(pointId) {
        const cycleState = this.getCycleState(pointId);
        return cycleState >= 2;
    }
    
    /**
     * Apply initial mirroring transform to image and video based on current cycle state
     */
    applyInitialMirroring(pointId) {
        const imageElement = this.getPointElement(pointId, '.point-image img');
        if (imageElement) {
            this.updateImageMirroring(pointId, imageElement);
        }
        
        const videoElement = this.getPointElement(pointId, '.point-video video');
        if (videoElement) {
            this.updateVideoMirroring(pointId, videoElement);
        }
    }
    
    /**
     * Update the point image in the DOM when cycle state changes
     */
    updatePointImage(pointId) {
        const point = this.findPointById(pointId);
        if (!point) return;
        
        const cycleState = this.getCycleState(pointId);
        const imageName = this.getImageNameForCycle(point);
        const imageElement = this.getPointElement(pointId, '.point-image img');
        if (imageElement) {
            // Update image source (changes between base and "a" variant)
            // Include cycle state in path to force browser reload
            const newSrc = this.getImagePath(imageName, cycleState);
            // Always update src to ensure image reloads when cycling
            imageElement.src = newSrc;
            // Apply mirroring transform immediately (works even while image loads)
            this.updateImageMirroring(pointId, imageElement);
        }
        
        // Update video mirroring
        const videoElement = this.getPointElement(pointId, '.point-video video');
        if (videoElement) {
            this.updateVideoMirroring(pointId, videoElement);
        }
        
        // Update Left/Right label
        const labelElement = this.getPointElement(pointId, '.point-left-right-label');
        if (labelElement) {
            labelElement.textContent = this.getLeftRightLabel(point);
        }
    }
    
    /**
     * Update image mirroring based on cycle state
     */
    updateImageMirroring(pointId, imageElement) {
        if (!imageElement) return;
        const shouldMirror = this.isMirrored(pointId);
        imageElement.style.transform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
    }
    
    /**
     * Update video mirroring based on cycle state
     */
    updateVideoMirroring(pointId, videoElement) {
        if (!videoElement) return;
        const shouldMirror = this.isMirrored(pointId);
        videoElement.style.transform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
    }
    
    /**
     * Setup video loop observer for a point to advance cycle on each loop
     */
    setupVideoLoopObserver(pointId) {
        // Clean up any existing observer
        this.cleanupVideoObserver(pointId);
        
        const videoElement = this.getPointElement(pointId, '.point-video video');
        if (!videoElement) return;
        
        const point = this.findPointById(pointId);
        if (!point) return;
        
        // Initialize cycle state to 0 if not already set
        if (!this.pointCycleStates.has(pointId)) {
            this.setCycleState(pointId, 0);
        }
        
        // Add event listener for video loop completion
        // Since we removed the 'loop' attribute, we handle looping manually
        const handleLoop = () => {
            this.advanceCycle(pointId);
            // Restart video for next loop
            videoElement.currentTime = 0;
            videoElement.play();
        };
        
        videoElement.addEventListener('ended', handleLoop);
        
        // Store observer info for cleanup
        this.videoObservers.set(pointId, {
            video: videoElement,
            handler: handleLoop
        });
        
        // Start video playback
        videoElement.play().catch(err => {
            console.warn(`Failed to autoplay video for point ${pointId}:`, err);
        });
    }
    
    /**
     * Clean up video loop observer for a point
     */
    cleanupVideoObserver(pointId) {
        const observer = this.videoObservers.get(pointId);
        if (observer) {
            observer.video.removeEventListener('ended', observer.handler);
            this.videoObservers.delete(pointId);
        }
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
            // Collapsing: cleanup video observer
            this.cleanupVideoObserver(pointId);
            this.expandedPointId = null;
        } else {
            // Expanding: will setup observer in generatePointsList
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
        
        // Check for first point achievement
        this.checkFirstPointAchievement();
        
        // Check if this is the final point (12th point)
        if (this.completedPoints.size === 12) {
            this.showEncouragementMessage("You did it! You stimulated the last point 🎉 🎯");
            // Show trip completion alert after a delay
            setTimeout(() => {
                this.showTripCompletionAlert('point12Stimulated');
            }, 2000);
            return;
        }
        
        // Track streak and generate encouragement message
        const wasConsecutive = this.isConsecutivePoint(pointId);
        if (wasConsecutive && this.lastCompletedPointId !== null) {
            this.currentStreak += 1;
        } else {
            this.currentStreak = 1; // Reset streak but this point still counts as 1
        }
        
        // Generate encouraging message
        const message = this.generateEncouragementMessage(
            pointId,
            this.currentStreak,
            this.completedPoints.size,
            wasConsecutive
        );
        
        // Show encouragement message
        this.showEncouragementMessage(message);
        
        // Update last completed point
        this.lastCompletedPointId = pointId;
    }

    // MARK: - Bilateral Timers (Removed per user request)
    
    // MARK: - Border Color Logic
    
    getBorderColorClass(point, isCurrent, isPast) {
        if (isCurrent) {
            return 'border-green';
        } else if (isPast) {
            return 'border-black';
        } else {
            // Future point - check if notification is cancelled
            const scheduleItem = this.notificationSchedule.find(item => item.point.id === point.id);
            if (scheduleItem && scheduleItem.isCancelled) {
                return 'border-orange';
            }
            return 'border-blue';
        }
    }
    
    // MARK: - Achievement System
    
    checkFirstPointAchievement() {
        if (this.completedPoints.size === 1 && !this.achievements.includes('firstPoint')) {
            this.unlockAchievement('firstPoint');
        }
    }
    
    unlockAchievement(type) {
        if (this.achievements.includes(type)) return;
        
        this.achievements.push(type);
        
        const achievement = this.getAchievementData(type);
        if (achievement) {
            this.showAchievementPopup(achievement);
        }
    }
    
    getAchievementData(type) {
        const achievements = {
            firstPoint: {
                emoji: '🎯',
                title: 'First Point!',
                description: 'You\'ve completed your first pressure point. Keep going!'
            }
        };
        return achievements[type];
    }
    
    showAchievementPopup(achievement) {
        // Clear any existing timeout
        if (this.achievementTimeout) {
            clearTimeout(this.achievementTimeout);
        }
        
        const popup = document.getElementById('achievementPopup');
        if (!popup) return;
        
        popup.innerHTML = `
            <div class="achievement-emoji">${achievement.emoji}</div>
            <div class="achievement-title">${achievement.title}</div>
            <div class="achievement-description">${achievement.description}</div>
        `;
        
        popup.style.display = 'block';
        popup.classList.remove('show');
        
        // Force reflow
        popup.offsetHeight;
        
        // Animate in
        setTimeout(() => {
            popup.classList.add('show');
        }, 10);
        
        // Auto-hide after 3 seconds
        this.achievementTimeout = setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => {
                popup.style.display = 'none';
            }, 600);
        }, 3000);
    }
    
    // MARK: - End Journey Confirmation
    
    endJourney() {
        // Show confirmation alert
        if (confirm('Are you sure you want to end this trip?')) {
            this.confirmEndJourney();
        }
    }
    
    confirmEndJourney() {
        // Save completed trip before clearing
        if (this.selectedAirport && this.completedPoints.size > 0) {
            // Show trip completion alert
            this.showTripCompletionAlert('manualEndXButton');
            
            // Calculate timezone data
            const timezoneOffsetHours = this.timezoneOffset / 3600;
            const timezonesCount = Math.abs(Math.floor(timezoneOffsetHours));
            const travelDirection = timezoneOffsetHours > 0 ? 'west' : 'east';
            
            const trip = {
                tripId: `trip_${Date.now()}`,
                destinationCode: this.selectedAirport.code,
                startDate: this.tripStartDate ? this.tripStartDate.toISOString() : new Date().toISOString(),
                completedPoints: Array.from(this.completedPoints),
                timezonesCount: timezonesCount,
                travelDirection: travelDirection,
                timezoneOffset: this.timezoneOffset
            };
            this.completedTrips.push(trip);
            this.saveCompletedTrips();
        }
        
        this.selectedAirport = null;
        this.currentPoint = null;
        this.expandedPointId = null;
        this.completedPoints.clear();
        this.notificationSchedule = []; // Clear notification schedule
        this.timezoneOffset = 0; // Reset timezone offset
        this.tripStartDate = null; // Reset trip start date
        
        // Reset reward message tracking
        this.currentStreak = 0;
        this.lastCompletedPointId = null;
        if (this.encouragementMessageTimeout) {
            clearTimeout(this.encouragementMessageTimeout);
            this.encouragementMessageTimeout = null;
        }
        const messageElement = document.getElementById('encouragementMessage');
        if (messageElement) {
            messageElement.style.display = 'none';
            messageElement.classList.remove('show');
        }
        
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
        
        // Update home screen when switching to home tab
        // Home tab removed - no trip/achievement tracking in demo
    }
    
    // Home Screen Functions
    loadCompletedTrips() {
        const saved = Storage.load('completedTrips');
        if (saved && Array.isArray(saved)) {
            this.completedTrips = saved;
        }
    }
    
    saveCompletedTrips() {
        Storage.save('completedTrips', this.completedTrips);
    }
    
    updateHomeScreen() {
        this.updateTripManagement();
        this.updateStreakMastery();
    }
    
    updateTripManagement() {
        const container = DOM.get('tripManagementContent');
        if (!container) return;
        
        if (this.completedTrips.length === 0) {
            container.innerHTML = '<div class="no-trips-message">No completed trips</div>';
            return;
        }
        
        // Sort trips by start date (newest first)
        const sortedTrips = [...this.completedTrips].sort((a, b) => 
            new Date(b.startDate) - new Date(a.startDate)
        );
        
        const tripsHTML = sortedTrips.map(trip => {
            const startDate = new Date(trip.startDate);
            const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const pointsCount = trip.completedPoints ? trip.completedPoints.length : 0;
            const travelDirection = trip.travelDirection || 'east';
            const timezonesCount = trip.timezonesCount || 0;
            const detailsStr = `${pointsCount} points • ${travelDirection}ward • ${timezonesCount} Timezones`;
            
            return `
                <div class="trip-item">
                    <div class="trip-item-box">
                        <div class="trip-item-content">
                            <div class="trip-item-header">
                                <div class="trip-item-title">${trip.destinationCode} - ${dateStr}</div>
                            </div>
                            <div class="trip-item-details">${detailsStr}</div>
                        </div>
                    </div>
                    <button class="trip-item-delete" onclick="demo.deleteTrip('${trip.tripId}')" title="Delete">✕</button>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `<div class="trip-list">${tripsHTML}</div>`;
    }
    
    updateStreakMastery() {
        const container = DOM.get('streakMasteryContent');
        if (!container) return;
        
        // For now, show basic structure - will add calculations later
        container.innerHTML = `
            <div class="streak-table">
                <div class="streak-table-header">
                    <div class="streak-table-header-col length">Length</div>
                    <div class="streak-table-header-col current">Current</div>
                    <div class="streak-table-header-col all">All (${this.completedTrips.length})</div>
                </div>
                <div style="height: 1px; background: #d1d1d6; margin: 4px 20px;"></div>
                <div class="streak-table-row">
                    <div class="streak-table-row-label">1 point</div>
                    <div class="streak-table-row-value">0</div>
                    <div class="streak-table-row-value">0</div>
                </div>
                <div class="streak-table-row">
                    <div class="streak-table-row-label">2 points</div>
                    <div class="streak-table-row-value">0</div>
                    <div class="streak-table-row-value">0</div>
                </div>
                <div class="streak-table-row">
                    <div class="streak-table-row-label">3 points</div>
                    <div class="streak-table-row-value">0</div>
                    <div class="streak-table-row-value">0</div>
                </div>
                <div class="streak-table-row">
                    <div class="streak-table-row-label">4 points</div>
                    <div class="streak-table-row-value">0</div>
                    <div class="streak-table-row-value">0</div>
                </div>
                <div class="streak-table-row">
                    <div class="streak-table-row-label">5 points</div>
                    <div class="streak-table-row-value">0</div>
                    <div class="streak-table-row-value">0</div>
                </div>
                <div class="streak-table-row">
                    <div class="streak-table-row-label">6 points</div>
                    <div class="streak-table-row-value">0</div>
                    <div class="streak-table-row-value">0</div>
                </div>
                <div class="streak-table-row">
                    <div class="streak-table-row-label">7-9 points</div>
                    <div class="streak-table-row-value">0</div>
                    <div class="streak-table-row-value">0</div>
                </div>
                <div class="streak-table-row">
                    <div class="streak-table-row-label">10-12 points</div>
                    <div class="streak-table-row-value">0</div>
                    <div class="streak-table-row-value">0</div>
                </div>
                <div class="streak-table-row">
                    <div class="streak-table-row-label">Points per trip</div>
                    <div class="streak-table-row-value">0</div>
                    <div class="streak-table-row-value">0.0</div>
                </div>
            </div>
        `;
    }
    
    deleteTrip(tripId) {
        this.completedTrips = this.completedTrips.filter(trip => trip.tripId !== tripId);
        this.saveCompletedTrips();
        this.updateHomeScreen();
    }
    
    showMasteryInfo() {
        alert('Mastery levels info - to be implemented');
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper error component
        console.error(message);
        alert(message);
    }
    
    // MARK: - Reward Messages (matches iOS)
    
    /**
     * Checks if the completed point is consecutive to the last completed point
     * @param {number} pointId - The ID of the point that was just completed
     * @returns {boolean} True if consecutive, false if there was a gap or this is the first point
     */
    isConsecutivePoint(pointId) {
        if (this.lastCompletedPointId === null) {
            return true; // First point is always considered consecutive
        }
        
        // Get ordered point sequence from notification schedule
        const orderedPointIds = this.getOrderedPointIds();
        
        const lastIndex = orderedPointIds.indexOf(this.lastCompletedPointId);
        const currentIndex = orderedPointIds.indexOf(pointId);
        
        if (lastIndex === -1 || currentIndex === -1) {
            return false;
        }
        
        // Check if current point is the next one in sequence
        return currentIndex === lastIndex + 1;
    }
    
    /**
     * Gets ordered point IDs from notification schedule
     * @returns {Array<number>} Array of point IDs in journey order
     */
    getOrderedPointIds() {
        if (!this.selectedAirport || this.notificationSchedule.length === 0) {
            return [];
        }
        
        return [...this.notificationSchedule]
            .sort((a, b) => a.transitionNumber - b.transitionNumber)
            .map(item => item.point.id);
    }
    
    /**
     * Generates an encouraging message based on completion context (matches iOS)
     * @param {number} pointId - The completed point ID
     * @param {number} streak - Current consecutive streak
     * @param {number} totalCompleted - Total points completed in journey
     * @param {boolean} wasConsecutive - Whether this point was consecutive
     * @returns {string} Encouraging message string
     */
    generateEncouragementMessage(pointId, streak, totalCompleted, wasConsecutive) {
        let baseMessage;
        
        // Progress milestone messages (take priority)
        if (totalCompleted === 3) {
            baseMessage = "Quarter way there! 💪";
        } else if (totalCompleted === 6) {
            baseMessage = "Halfway champion! 🎯";
        } else if (totalCompleted === 9) {
            baseMessage = "Almost there! 🚀";
        } else if (totalCompleted === 12) {
            baseMessage = "Journey complete! 🏆";
        }
        // Streak-based messages
        else if (wasConsecutive && streak >= 2) {
            switch (streak) {
                case 2:
                    baseMessage = "Keep it up! 🔥";
                    break;
                case 3:
                    baseMessage = "You're on fire! 🔥🔥";
                    break;
                case 4:
                    baseMessage = "Way to go! Amazing! 🔥🔥🔥";
                    break;
                case 5:
                    baseMessage = "Five in a row! You're rocking it! 🔥🔥🔥🔥";
                    break;
                case 6:
                    baseMessage = "Fabulous dedication! ⭐";
                    break;
                case 7:
                    baseMessage = "Your body will thank you for this! ⭐⭐";
                    break;
                case 8:
                    baseMessage = "Your work is truly impressive!! ⭐⭐⭐";
                    break;
                case 9:
                case 10:
                case 11:
                    baseMessage = "Journey master! 🏆";
                    break;
                default:
                    baseMessage = "Incredible focus! 🌟";
            }
        }
        // Resumption encouragement (after missed points)
        else if (!wasConsecutive && totalCompleted > 1) {
            baseMessage = "Welcome back! Keep going! 💪";
        }
        // First point - dynamic message with hours until next point
        else if (totalCompleted === 1) {
            return this.generateFirstPointMessage(pointId);
        }
        // Default single completion (fallback)
        else {
            baseMessage = "Good Start! Now keep it up! 🎯";
        }
        
        // Append "next up" timing to all messages (except final point which is handled separately)
        const nextUpSuffix = this.getNextPointTimingSuffix(pointId);
        if (nextUpSuffix) {
            return `${baseMessage} ${nextUpSuffix}`;
        }
        
        return baseMessage;
    }
    
    /**
     * Generates the "next up" timing suffix for any point (matches iOS)
     * @param {number} pointId - The ID of the point that was just completed
     * @returns {string} Formatted "next up" string, or empty string if no next point
     */
    getNextPointTimingSuffix(pointId) {
        if (!this.selectedAirport || this.notificationSchedule.length === 0) {
            return "";
        }
        
        // Find the current point's transition number
        const currentPoint = this.notificationSchedule.find(item => item.point.id === pointId);
        if (!currentPoint || currentPoint.transitionNumber >= 12) {
            // No next point (this is the final point)
            return "";
        }
        
        // Find the next point (transition number + 1)
        const nextTransitionNumber = currentPoint.transitionNumber + 1;
        const nextPoint = this.notificationSchedule.find(item => item.transitionNumber === nextTransitionNumber);
        if (!nextPoint) {
            return "";
        }
        
        // Calculate time from now to next point's local time
        const now = new Date();
        const timeInterval = nextPoint.localTime.getTime() - now.getTime();
        const totalMinutes = Math.max(1, Math.round(timeInterval / 60000));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        // Format the "next up" suffix based on whether there are remaining minutes
        if (hours > 0 && minutes > 0) {
            // Hours and minutes - use singular "hour" for 1, plural for 2+
            if (hours === 1) {
                return `Next up ${hours} hour ${minutes} minutes.`;
            } else {
                return `Next up ${hours} hours ${minutes} minutes.`;
            }
        } else if (hours > 0) {
            // Just hours
            return `Next up ${hours} hours.`;
        } else {
            // Just minutes (less than an hour)
            return `Next up ${minutes} minutes.`;
        }
    }
    
    /**
     * Generates the first point message with hours until next point (matches iOS)
     * @param {number} pointId - The ID of the point that was just completed
     * @returns {string} Formatted message with hours until next point
     */
    generateFirstPointMessage(pointId) {
        const baseMessage = "Great start, you just earned your first pressure point,";
        const nextUpSuffix = this.getNextPointTimingSuffix(pointId);
        
        if (!nextUpSuffix) {
            return "Good Start! Now keep it up! 🎯";
        }
        
        return `${baseMessage} ${nextUpSuffix}`;
    }
    
    /**
     * Shows encouragement message to user (matches iOS timing: 0.5s delay, 6s display, 0.6s animation)
     * @param {string} message - The message to display
     */
    // MARK: - Trip Completion Alerts
    
    showTripCompletionAlert(method) {
        const pointsCount = this.completedPoints.size;
        const tripScore = this.calculateTripScore(pointsCount);
        const longestStreak = this.calculateLongestStreak();
        
        let title = 'Trip Completed!';
        let message = '';
        
        // Add method badge
        if (method === 'point12Stimulated') {
            message += '24-hour cycle completed!\n\n';
        } else if (method === 'manualEndXButton') {
            message += 'Trip ended manually.\n\n';
        } else if (method === 'timeout24Hours') {
            message += `Your trip to ${this.selectedAirport?.code || 'destination'} has ended after 24 hours.\n\n`;
        }
        
        // Add performance tier
        const tier = this.getPerformanceTier(pointsCount);
        message += `${tier.emoji} ${tier.label}\n`;
        message += `${pointsCount} points completed\n`;
        if (longestStreak > 1) {
            message += `Longest streak: ${longestStreak} points\n`;
        }
        message += `Trip score: ${tripScore}\n\n`;
        message += tier.encouragement;
        
        alert(`${title}\n\n${message}`);
    }
    
    calculateTripScore(pointsCount) {
        // Simplified scoring: 6 points per completed point (max 72)
        return pointsCount * 6;
    }
    
    calculateLongestStreak() {
        // Calculate longest consecutive streak from completed points
        const orderedIds = this.getOrderedPointIds();
        let maxStreak = 0;
        let currentStreak = 0;
        
        for (const pointId of orderedIds) {
            if (this.completedPoints.has(pointId)) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }
        
        return maxStreak;
    }
    
    getPerformanceTier(pointsCount) {
        if (pointsCount === 0) {
            return { emoji: '🌱', label: 'Journey Started', encouragement: 'Every journey begins with a single step!' };
        } else if (pointsCount >= 1 && pointsCount <= 3) {
            return { emoji: '🌱', label: 'Every Point Counts', encouragement: 'Keep going, you\'re making progress!' };
        } else if (pointsCount >= 4 && pointsCount <= 6) {
            return { emoji: '💪', label: 'Good Effort', encouragement: 'You\'re doing great! Keep it up!' };
        } else if (pointsCount >= 7 && pointsCount <= 9) {
            return { emoji: '⭐', label: 'Great Work', encouragement: 'Excellent progress! You\'re almost there!' };
        } else if (pointsCount >= 10 && pointsCount <= 11) {
            return { emoji: '🏆', label: 'Outstanding', encouragement: 'Amazing dedication! Just a bit more!' };
        } else if (pointsCount === 12) {
            return { emoji: '🏆', label: 'Perfect Journey', encouragement: 'Perfect! You completed all 12 points!' };
        } else {
            return { emoji: '🌱', label: 'Journey Complete', encouragement: 'Well done on completing your journey!' };
        }
    }
    
    showEncouragementMessage(message) {
        // Add "on target" emoji to the end of the message
        const fullMessage = `${message} 🎯`;
        
        // Clear any existing timeout
        if (this.encouragementMessageTimeout) {
            clearTimeout(this.encouragementMessageTimeout);
        }
        
        const messageElement = document.getElementById('encouragementMessage');
        if (!messageElement) return;
        
        // Hide message immediately if it's already showing
        messageElement.style.display = 'none';
        messageElement.classList.remove('show');
        
        // Delay showing the message by 0.5 seconds after point completion
        setTimeout(() => {
            messageElement.textContent = fullMessage;
            messageElement.style.display = 'block';
            
            // Force reflow to ensure display change is applied
            messageElement.offsetHeight;
            
            // Animate in
            setTimeout(() => {
                messageElement.classList.add('show');
            }, 10);
            
            // Auto-hide after 6 seconds of display (0.5 delay + 6 display + 0.6 animation = 7.1 seconds total)
            this.encouragementMessageTimeout = setTimeout(() => {
                // Animate the message out (slide up and fade)
                messageElement.classList.remove('show');
                
                // Hide after animation completes
                setTimeout(() => {
                    messageElement.style.display = 'none';
                }, 600); // 0.6s animation duration
            }, 6000); // 6 seconds display time
        }, 500); // 0.5 second delay
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

    // Removed clearRecentDestinations() - iOS uses individual delete icons only

    updateRecentDestinationsDisplay() {
        const recentList = DOM.get('recentList');
        const recentDestinations = DOM.get('recentDestinations');
        const searchText = DOM.getValue('airportSearch') || '';
        
        if (!recentList || !recentDestinations) return;
        
        // Only show recent destinations when search is empty
        if (searchText.trim() !== '') {
            DOM.hide('recentDestinations');
            return;
        }
        
        // Limit to 3 destinations (matching iOS)
        const limitedDestinations = this.recentDestinations.slice(0, 3);
        
        if (limitedDestinations.length === 0) {
            DOM.hide('recentDestinations');
            return;
        }
        
        // Generate HTML matching iOS DestinationItemView structure
        const recentHTML = limitedDestinations.map(airport => `
            <div class="destination-item-wrapper">
                <div class="destination-item-box" onclick="demo.selectAirport('${airport.code}')" data-airport-code="${airport.code}">
                    <div class="destination-item-content">
                        <span class="destination-item-name">${airport.name}</span>
                        <span class="destination-item-code">[${airport.code}]</span>
                    </div>
                </div>
                <button class="destination-item-delete" onclick="event.stopPropagation(); demo.removeRecentDestination('${airport.code}')" title="Delete">
                    <span class="delete-icon">✕</span>
                </button>
            </div>
        `).join('');
        
        DOM.setHTML('recentList', recentHTML);
        DOM.show('recentDestinations');
        DOM.hide('emptyState');
    }
    
    removeRecentDestination(airportCode) {
        this.recentDestinations = this.recentDestinations.filter(dest => dest.code !== airportCode);
        this.saveRecentDestinations();
        this.updateRecentDestinationsDisplay();
        this.updateEmptyState();
    }
    
    updateEmptyState() {
        const searchText = DOM.getValue('airportSearch') || '';
        const hasRecentDestinations = this.recentDestinations.length > 0;
        
        // Only show empty state when search is empty AND no recent destinations
        if (searchText.trim() === '' && !hasRecentDestinations) {
            DOM.showFlex('emptyState');
        } else {
            DOM.hide('emptyState');
        }
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
        
        // First, add the current point's transition time (current odd hour) - MATCH iOS
        // This ensures transitionNumber 1 = current point (first point in journey)
        const currentOddHour = currentHour % 2 === 0 ? currentHour - 1 : currentHour;
        const adjustedCurrentHour = currentOddHour < 0 ? 23 : currentOddHour;
        
        // Create transition time for current point
        const currentTransitionTime = new Date(now);
        currentTransitionTime.setHours(adjustedCurrentHour, 0, 0, 0);
        currentTransitionTime.setMinutes(0, 0, 0);
        
        // If current point's transition time has passed today, it's still the current point (use today)
        transitionTimes.push(currentTransitionTime);
        
        // Find the next odd hour from current time (for remaining 11 transitions)
        let nextOddHour = currentHour;
        if (nextOddHour % 2 === 0) {
            nextOddHour += 1; // If even, go to next odd hour
        } else {
            nextOddHour += 2; // If odd, go to next odd hour
        }
        if (nextOddHour > 23) {
            nextOddHour = 1; // Wrap around to 1 AM
        }
        
        // Calculate the next 11 odd-hour transitions (we already have 1, so we need 11 more) - MATCH iOS
        for (let i = 0; i < 11; i++) {
            let targetHour = nextOddHour + (i * 2);
            if (targetHour > 23) {
                targetHour = targetHour - 24;
            }
            
            const transitionTime = new Date(now);
            transitionTime.setHours(targetHour, 0, 0, 0);
            transitionTime.setMinutes(0, 0, 0);
            
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
        return this.findPointById(pointId) || this.points[0];
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