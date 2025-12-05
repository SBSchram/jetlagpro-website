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
        this.currentTab = 'home';
        this.expandedPointId = null;
        this.completedPoints = new Set();
        this.recentDestinations = []; // Added for recent destinations
        this.maxRecentDestinations = CONSTANTS.MAX_RECENT_DESTINATIONS; // Use constant
        this.notificationSchedule = []; // Added for notification schedule
        this.timezoneOffset = 0; // Added for timezone offset
        
        // Phase 5: Image cycling system
        // Track cycle state per point: 0=original, 1=alternate, 2=mirror original, 3=mirror alternate
        this.pointCycleStates = new Map(); // Map<pointId, cycleState>
        this.videoObservers = new Map(); // Map<pointId, {video, observer}> for cleanup
        
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
    getImagePath(imageName) {
        return `${CONSTANTS.ASSET_PATHS.POINT_IMAGES}/${imageName}.jpg?v=${CONSTANTS.CACHE_VERSION}`;
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
                <div class="point-card ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${isPast ? 'past' : ''} ${isExpanded ? 'expanded' : ''}" data-point-id="${point.id}">
                    <div class="point-header" onclick="demo.togglePoint(${point.id})">
                        <div class="point-stimulation-text">${stimulationText}</div>
                        <div class="point-chevron">${isExpanded ? '▲' : '▼'}</div>
                    </div>
                    <div class="point-content">
                        <!-- Location section FIRST (match iOS) -->
                        <div class="point-detail-item">
                            <div class="point-detail-title">Location</div>
                            <div class="point-detail-content">${point.pointLocation}</div>
                        </div>
                        
                        <!-- Point Image and Video Layout (match iOS HStack) -->
                        <div class="point-media">
                            <div class="point-image-container">
                                <div class="point-image">
                                    <img src="${this.getImagePath(this.getImageNameForCycle(point))}" alt="${point.name} location" data-point-id="${point.id}">
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
                            <div class="point-detail-title">Stimulate</div>
                            <div class="point-detail-content">${point.stimulationMethod}</div>
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
            
            // Get points in sorted order
            let schedulePoints = sortedSchedule.map(item => item.point);
            
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
        
        const imageName = this.getImageNameForCycle(point);
        const imageElement = this.getPointElement(pointId, '.point-image img');
        if (imageElement) {
            // Update image source (changes between base and "a" variant)
            imageElement.src = this.getImagePath(imageName);
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