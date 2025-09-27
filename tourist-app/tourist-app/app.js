const safetyApp = {
    map: null,
    userMarker: null,
    userLocation: null,
    emergencies: [],
    watchId: null,
    locationAccessGranted: false,

    init() {
        this.initMap();
        this.setupEventListeners();
        
        // Try to get location automatically when page loads
        setTimeout(() => {
            this.getLocation();
        }, 1000);
        
        this.startMetricsUpdates();
    },

    initMap() {
        const defaultLocation = { lat: 11.166737, lng: 76.966926 };
        
        this.map = L.map('map').setView([defaultLocation.lat, defaultLocation.lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        
        this.userMarker = L.marker([defaultLocation.lat, defaultLocation.lng])
            .addTo(this.map)
            .bindPopup('Default location - Please enable location access')
            .openPopup();
            
        this.updateLocationStatus('warning', 'Location access required. Click "Update My Location" to enable.');
    },

    getLocation() {
        this.updateLocationStatus('updating', 'Requesting location access...');
        document.getElementById('permissionHelp').style.display = 'none';
        
        if (!navigator.geolocation) {
            this.updateLocationStatus('error', 'Geolocation is not supported by this browser.');
            this.showPermissionHelp();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => this.handleLocationSuccess(position),
            (error) => this.handleLocationError(error),
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    },

    handleLocationSuccess(position) {
        this.locationAccessGranted = true;
        this.userLocation = { 
            lat: position.coords.latitude, 
            lng: position.coords.longitude 
        };
        
        // Update map
        this.map.setView([this.userLocation.lat, this.userLocation.lng], 15);
        this.userMarker.setLatLng([this.userLocation.lat, this.userLocation.lng])
                     .setPopupContent('Your current location')
                     .openPopup();
        
        // Update display
        const accuracy = position.coords.accuracy ? ` (Accuracy: ${position.coords.accuracy.toFixed(1)}m)` : '';
        this.updateLocationStatus('success', 📍 Location access granted${accuracy});
        document.getElementById('locationCoordinates').textContent = 
            Latitude: ${this.userLocation.lat.toFixed(6)}, Longitude: ${this.userLocation.lng.toFixed(6)};
        
        if (position.coords.accuracy) {
            document.getElementById('locationAccuracy').textContent = 
                Accuracy: ±${position.coords.accuracy.toFixed(1)} meters;
        }
        
        // Hide SOS warning
        document.getElementById('sosWarning').style.display = 'none';
        
        // Start watching position
        this.startWatchingLocation();
    },

    handleLocationError(error) {
        this.locationAccessGranted = false;
        let errorMessage = 'Unknown error occurred';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = 'Location access denied. Please enable location permissions.';
                this.showPermissionHelp();
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable. Please check your connection.';
                break;
            case error.TIMEOUT:
                errorMessage = 'Location request timed out. Please try again.';
                break;
        }
        
        this.updateLocationStatus('error', errorMessage);
        document.getElementById('sosWarning').style.display = 'block';
    },

    startWatchingLocation() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.userLocation = { 
                    lat: position.coords.latitude, 
                    lng: position.coords.longitude 
                };
                this.userMarker.setLatLng([this.userLocation.lat, this.userLocation.lng]);
                
                if (position.coords.accuracy) {
                    document.getElementById('locationAccuracy').textContent = 
                        Accuracy: ±${position.coords.accuracy.toFixed(1)} meters;
                }
            },
            (error) => {
                console.warn('Location watch error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    },

    sendSOS(type) {
        if (!this.locationAccessGranted || !this.userLocation) {
            this.showModal(
                'Location Access Required',
                'Please enable location access first! Click "Update My Location" and allow location permissions.'
            );
            this.getLocation();
            return;
        }

        const emergencyTypes = {
            'VOICE_EMERGENCY': 'Voice Emergency', 
            'ONLINE_EMERGENCY': 'Online Emergency', 
            'MEDICAL_ASSISTANCE': 'Medical Assistance', 
            'POLICE_ASSISTANCE': 'Police Assistance'
        };

        const emergency = {
            id: Date.now(), 
            type: emergencyTypes[type],
            location: ${this.userLocation.lat.toFixed(6)}, ${this.userLocation.lng.toFixed(6)},
            timestamp: new Date().toLocaleString(), 
            status: 'PENDING'
        };

        this.emergencies.unshift(emergency);
        this.updateEmergencyHistory();

        // Show confirmation modal
        this.showModal(
            'EMERGENCY ALERT SENT!',
            Type: ${emergency.type}<br>Location: ${emergency.location}<br><br>Help is on the way!
        );

        document.getElementById('connectionStatus').innerHTML = '📡 Sending to emergency server...';
        
        // Simulate server communication
        this.simulateEmergencyResponse(emergency);
    },

    simulateEmergencyResponse(emergency) {
        setTimeout(() => {
            document.getElementById('connectionStatus').innerHTML = '✅ Emergency received by control room!';
            
            setTimeout(() => {
                emergency.status = 'ASSIGNED';
                emergency.responder = 'Responder_Unit_01';
                this.updateEmergencyHistory();
                
                // Update risk level
                document.querySelector('.risk-level').textContent = 'HIGH';
                document.querySelector('.risk-level').style.color = 'red';
            }, 2000);
        }, 1000);
    },

    updateEmergencyHistory() {
        const historyContainer = document.getElementById('emergencyHistory');
        if (this.emergencies.length === 0) {
            historyContainer.innerHTML = '<div class="emergency-item">No recent emergencies.</div>';
            return;
        }
        
        historyContainer.innerHTML = this.emergencies.map(emergency => `
            <div class="emergency-item">
                <strong>${emergency.type}</strong><br>
                <small>Location: ${emergency.location} | Time: ${emergency.timestamp}</small><br>
                <small>Status: <span style="color: ${emergency.status === 'PENDING' ? 'orange' : 'green'}">${emergency.status}</span></small>
                ${emergency.responder ? <br><small>Responder: ${emergency.responder}</small> : ''}
            </div>
        `).join('');
    },

    showModal(title, content) {
        document.getElementById('modalContent').innerHTML = `
            <h3>${title}</h3>
            <p>${content}</p>
        `;
        document.getElementById('emergencyModal').style.display = 'block';
    },

    closeModal() {
        document.getElementById('emergencyModal').style.display = 'none';
    },

    updateLocationStatus(status, message) {
        const statusElement = document.getElementById('locationStatus');
        const textElement = document.getElementById('locationText');
        
        statusElement.className = 'location-status';
        statusElement.classList.add(location-${status});
        textElement.textContent = message;
    },

    showPermissionHelp() {
        document.getElementById('permissionHelp').style.display = 'block';
    },

    testLocation() {
        this.getLocation();
    },

    setupEventListeners() {
        // Close modal when clicking X
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('emergencyModal');
            if (event.target === modal) {
                this.closeModal();
            }
        });

        // Refresh location when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.locationAccessGranted) {
                this.getLocation();
            }
        });
    },

    startMetricsUpdates() {
        setInterval(() => {
            document.getElementById('responseTime').textContent = 
                (1.5 + Math.random() * 2).toFixed(1) + 's';
            document.getElementById('activeResponders').textContent = 
                Math.floor(10 + Math.random() * 5);
        }, 5000);
    }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    safetyApp.init();
});
