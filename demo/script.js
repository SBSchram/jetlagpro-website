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
        this.recentDestinations = []; // Added for recent destinations
        this.maxRecentDestinations = 5; // Added for recent destinations
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
            
            // Show default sections expanded
            this.showDefaultSections();
            
            // Generate initial points list
            this.generatePointsList();
            
            // Show empty state for destination tab
            this.showEmptyState();
            
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
                console.log('🔍 [DOCUMENT_CLICK] Clicking on tab bar, hiding results');
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
        
        return sorted.slice(0, 10); // Limit to 10 results
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
        const resultsContainer = document.getElementById('searchResults');
        console.log('🔍 [displaySearchResults] Displaying results in container:', resultsContainer);
        
        // OS Detection
        const isWindows = navigator.platform.indexOf('Win') !== -1;
        const isMac = navigator.platform.indexOf('Mac') !== -1;
        console.log(`🔍 [OS] Platform: ${navigator.platform}, Windows: ${isWindows}, Mac: ${isMac}`);
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="airport-result"><div class="airport-info"><div class="airport-name">No airports found</div></div></div>';
        } else {
            resultsContainer.innerHTML = results.map(airport => `
                <div class="airport-result" onclick="console.log('🔍 [ONCLICK] Inline onclick fired for ${airport.code}'); demo.selectAirport('${airport.code}')" data-airport-code="${airport.code}">
                    <div class="airport-info">
                        <div class="airport-name">${airport.name}</div>
                        <div class="airport-location">${airport.city}, ${airport.country}</div>
                    </div>
                    <div class="airport-code">${airport.code}</div>
                </div>
            `).join('');
            
            // Add click event debugging to each airport result
            const airportResults = resultsContainer.querySelectorAll('.airport-result');
            airportResults.forEach((element, index) => {
                const airportCode = element.getAttribute('data-airport-code');
                console.log(`🔍 [DOM] Airport result ${index}:`, airportCode, 'Element found:', !!element);
                console.log(`🔍 [DOM] Airport result ${index} dimensions:`, element.getBoundingClientRect());
                console.log(`🔍 [DOM] Airport result ${index} display:`, getComputedStyle(element).display);
                console.log(`🔍 [DOM] Airport result ${index} onclick:`, element.onclick);
                console.log(`🔍 [DOM] Airport result ${index} pointer-events:`, getComputedStyle(element).pointerEvents);
                console.log(`🔍 [DOM] Airport result ${index} cursor:`, getComputedStyle(element).cursor);
                console.log(`🔍 [DOM] Airport result ${index} position:`, getComputedStyle(element).position);
                console.log(`🔍 [DOM] Airport result ${index} z-index:`, getComputedStyle(element).zIndex);
                
                // Add pointerdown event listener for cross-platform compatibility
                element.addEventListener('pointerdown', (e) => {
                    console.log(`🔍 [POINTERDOWN] Pointerdown event fired for ${airportCode}`);
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectAirport(airportCode);
                });
                
                // Also keep click as fallback
                element.addEventListener('click', (e) => {
                    console.log(`🔍 [CLICK] Direct click event fired for ${airportCode}`);
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectAirport(airportCode);
                });
                
                // Also add mousedown and mouseup for debugging
                element.addEventListener('mousedown', (e) => {
                    console.log(`🔍 [MOUSEDOWN] Mousedown event fired for ${airportCode}`);
                });
                
                element.addEventListener('mouseup', (e) => {
                    console.log(`🔍 [MOUSEUP] Mouseup event fired for ${airportCode}`);
                });
            });
        }
        
        this.showSearchResults();
    }

    showSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        const emptyState = document.getElementById('emptyState');
        const recentDestinations = document.getElementById('recentDestinations');
        
        console.log('Showing search results');
        if (resultsContainer) resultsContainer.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        if (recentDestinations) recentDestinations.style.display = 'none';
    }

    hideSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        console.log('Hiding search results');
        if (resultsContainer) resultsContainer.style.display = 'none';
    }

    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const recentDestinations = document.getElementById('recentDestinations');
        
        if (emptyState) emptyState.style.display = 'flex';
        if (recentDestinations) {
            recentDestinations.style.display = this.recentDestinations.length > 0 ? 'block' : 'none';
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('airportSearch');
        if (searchInput) {
            searchInput.value = '';
            this.handleAirportSearch('');
        }
    }

    selectAirport(airportCode) {
        console.log('🔍 [selectAirport] Selecting airport:', airportCode);
        
        // OS Detection
        const isWindows = navigator.platform.indexOf('Win') !== -1;
        const isMac = navigator.platform.indexOf('Mac') !== -1;
        console.log(`🔍 [OS] Platform: ${navigator.platform}, Windows: ${isWindows}, Mac: ${isMac}`);
        
        const airport = this.airports.find(a => a.code === airportCode);
        if (!airport) {
            console.error('🔍 [selectAirport] Airport not found:', airportCode);
            return;
        }
        
        console.log('🔍 [STEP] Airport found:', airport.name);

        this.selectedAirport = airport;
        this.addRecentDestination(airport); // Add to recent destinations
        
        console.log('🔍 [STEP] Recent destination added');
        
        // Calculate timezone offset and generate notification schedule
        this.calculateTimezoneOffset(airport);
        this.generateNotificationSchedule(airport);
        
        console.log('🔍 [STEP] Timezone calculations completed');
        
        this.updateDestinationDisplay();
        this.updateActivePoint();
        this.generatePointsList();
        this.hideSearchResults();
        
        console.log('🔍 [STEP] UI updates completed');
        
        // Clear search input
        const searchInput = document.getElementById('airportSearch');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Switch to Journey tab (don't hide destination tab yet)
        console.log('🔍 [selectAirport] Switching to journey tab...');
        this.switchToTab('journey');
        
        // Hide destination tab after switching
        setTimeout(() => {
            console.log('🔍 [selectAirport] Hiding destination tab...');
            this.hideDestinationTab();
        }, 100);
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
        if (!this.selectedAirport) {
            // No destination case: calculate based on local time
            const currentHour = new Date().getHours();
            const pointId = this.hourToPointId[currentHour];
            this.currentPoint = this.points.find(p => p.id === pointId);
            console.log('🔍 [updateActivePoint] No destination - Current hour:', currentHour, 'Point ID:', pointId, 'Current point:', this.currentPoint?.id);
        } else {
            // Destination case: find current point based on destination timezone
            const now = new Date();
            const destinationTime = new Date(now.toLocaleString("en-US", {timeZone: this.selectedAirport.timezone}));
            const destinationHour = destinationTime.getHours();
            const pointId = this.hourToPointId[destinationHour];
            this.currentPoint = this.points.find(p => p.id === pointId);
            
            console.log('🔍 [updateActivePoint] With destination - Local time:', now.toLocaleString());
            console.log('🔍 [updateActivePoint] Destination time:', destinationTime.toLocaleString());
            console.log('🔍 [updateActivePoint] Destination hour:', destinationHour, 'Point ID:', pointId, 'Current point:', this.currentPoint?.id);
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
        
        console.log('🔍 [generatePointsList] Current point ID:', currentPointId);
        console.log('🔍 [generatePointsList] Expanded point ID:', this.expandedPointId);

        const pointsHTML = orderedPoints.map((point, index) => {
            const isCurrent = point.id === currentPointId;
            const isExpanded = this.expandedPointId === point.id || isCurrent; // Auto-expand current point
            const isCompleted = this.completedPoints.has(point.id);
            const journeyOrder = index + 1;
            
            console.log(`🔍 [generatePointsList] Point ${point.id}: isCurrent=${isCurrent}, isExpanded=${isExpanded}`);
            
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
                    return `Stimulate ${pointName} (${destTime}) at your ${localTime}`;
                }
            }
        }
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            hour12: true 
        });
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
        
        this.updateDestinationDisplay();
        this.generatePointsList();
        this.showDestinationTab(); // Show destination tab when journey ends
        this.switchToTab('destination');
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
        console.log('🔍 [switchToTab] Switching to tab:', tabName);
        
        // OS Detection
        const isWindows = navigator.platform.indexOf('Win') !== -1;
        const isMac = navigator.platform.indexOf('Mac') !== -1;
        console.log(`🔍 [OS] Platform: ${navigator.platform}, Windows: ${isWindows}, Mac: ${isMac}`);
        
        this.currentTab = tabName;
        
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        console.log('🔍 [DOM] Found tab contents:', tabContents.length);
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Remove active class from all tab items
        const tabItems = document.querySelectorAll('.tab-item');
        console.log('🔍 [DOM] Found tab items:', tabItems.length);
        tabItems.forEach(item => item.classList.remove('active'));
        
        // Show selected tab content
        const selectedTab = document.getElementById(tabName + 'Tab');
        if (selectedTab) {
            selectedTab.classList.add('active');
            console.log('🔍 [switchToTab] Activated tab content:', tabName + 'Tab');
            console.log('🔍 [DOM] Tab content display:', getComputedStyle(selectedTab).display);
        } else {
            console.error('🔍 [switchToTab] Tab content not found:', tabName + 'Tab');
        }
        
        // Add active class to selected tab item
        const selectedTabItem = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
        if (selectedTabItem) {
            selectedTabItem.classList.add('active');
            console.log('🔍 [switchToTab] Activated tab item for:', tabName);
            console.log('🔍 [DOM] Tab item display:', getComputedStyle(selectedTabItem).display);
        } else {
            console.error('🔍 [switchToTab] Tab item not found for:', tabName);
        }
        
        // CSS Grid debugging
        const pointMedia = document.querySelector('.point-media');
        if (pointMedia) {
            console.log('🔍 [CSS] Grid support:', CSS.supports('display', 'grid'));
            console.log('🔍 [CSS] Point media display:', getComputedStyle(pointMedia).display);
            console.log('🔍 [CSS] Point media dimensions:', pointMedia.getBoundingClientRect());
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
        try {
            const saved = localStorage.getItem('recentDestinations');
            if (saved) {
                this.recentDestinations = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading recent destinations:', error);
            this.recentDestinations = [];
        }
    }

    saveRecentDestinations() {
        try {
            localStorage.setItem('recentDestinations', JSON.stringify(this.recentDestinations));
        } catch (error) {
            console.error('Error saving recent destinations:', error);
        }
    }

    clearRecentDestinations() {
        this.recentDestinations = [];
        this.saveRecentDestinations();
        this.updateRecentDestinationsDisplay();
    }

    updateRecentDestinationsDisplay() {
        const recentList = document.getElementById('recentList');
        const recentDestinations = document.getElementById('recentDestinations');
        
        if (!recentList || !recentDestinations) return;
        
        if (this.recentDestinations.length === 0) {
            recentDestinations.style.display = 'none';
            return;
        }
        
        recentList.innerHTML = this.recentDestinations.map(airport => `
            <div class="airport-result" onclick="demo.selectAirport('${airport.code}')" data-airport-code="${airport.code}">
                <div class="airport-info">
                    <div class="airport-name">${airport.name}</div>
                    <div class="airport-location">${airport.city}, ${airport.country}</div>
                </div>
                <div class="airport-code">${airport.code}</div>
            </div>
        `).join('');
        
        // Add click event debugging to recent destinations
        const recentAirportResults = recentList.querySelectorAll('.airport-result');
        recentAirportResults.forEach((element, index) => {
            const airportCode = element.getAttribute('data-airport-code');
            console.log(`🔍 [DOM] Recent airport result ${index}:`, airportCode, 'Element found:', !!element);
            console.log(`🔍 [DOM] Recent airport result ${index} dimensions:`, element.getBoundingClientRect());
            console.log(`🔍 [DOM] Recent airport result ${index} display:`, getComputedStyle(element).display);
            
            // Add additional click event listener for debugging
            element.addEventListener('click', (e) => {
                console.log(`🔍 [CLICK] Recent click event fired for ${airportCode}`);
                console.log(`🔍 [CLICK] Target:`, e.target);
                console.log(`🔍 [CLICK] Coordinates:`, e.clientX, e.clientY);
                console.log(`🔍 [CLICK] Event type:`, e.type);
            });
        });
        
        recentDestinations.style.display = 'block';
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
        if (demo) demo.hideSearchResults();
    }
});

// Add touch support for mobile devices
if ('ontouchstart' in window) {
    document.addEventListener('touchstart', () => {}, {passive: true});
} 