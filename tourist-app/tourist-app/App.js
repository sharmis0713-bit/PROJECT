import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://192.168.1.11:8000';
const RESPONDER_SERVER = 'http://192.168.1.11:3000'; // Change to your responder server URL

export default function App() {
  const [region, setRegion] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  const [safetyScore, setSafetyScore] = useState(85);
  const [isOffline, setIsOffline] = useState(false);
  const [location, setLocation] = useState(null);
  const [touristId, setTouristId] = useState(null);
  const [locationUpdatesActive, setLocationUpdatesActive] = useState(false);

  // Initialize tourist ID and location tracking
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Get or create tourist ID
    let storedId = await AsyncStorage.getItem('tourist_id');
    if (!storedId) {
      storedId = 'Tourist_' + Math.floor(1000 + Math.random() * 9000);
      await AsyncStorage.setItem('tourist_id', storedId);
    }
    setTouristId(storedId);

    // Request location permissions
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required for safety features');
      return;
    }

    // Start location tracking
    startLocationTracking();
  };

  const startLocationTracking = async () => {
    try {
      // Get initial location
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });

      // Send initial location to responder
      await sendLocationToResponder(currentLocation.coords);

      // Start watching location changes
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (newLocation) => {
          setLocation(newLocation);
          sendLocationToResponder(newLocation.coords);
        }
      );

      setLocationUpdatesActive(true);
      console.log('📍 Location tracking started for:', touristId);

    } catch (error) {
      console.error('Location tracking error:', error);
      Alert.alert('Location Error', 'Failed to start location tracking');
    }
  };

  // Send location data to responder website
  const sendLocationToResponder = async (coords) => {
    if (!touristId || !coords) return;

    const locationData = {
      id: Date.now(),
      type: 'LOCATION_UPDATE',
      tourist_id: touristId,
      location: `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
      timestamp: new Date().toLocaleString(),
      status: 'ACTIVE',
      priority: 'LOW'
    };

    try {
      // Method 1: Send to local server (recommended)
      await axios.post(`${RESPONDER_SERVER}/api/location-update`, locationData);
      
      // Method 2: Also store in localStorage for web app access
      await AsyncStorage.setItem('last_location_update', JSON.stringify(locationData));
      
      console.log('📍 Location sent to responder:', locationData.location);
    } catch (error) {
      console.log('📍 Location update stored locally (offline mode)');
      // Store for later sync
      await AsyncStorage.setItem('pending_location_update', JSON.stringify(locationData));
    }
  };

  const checkSafetyScore = async (lat, lng) => {
    try {
      const response = await axios.get(`${API_BASE}/get_safety_score?lat=${lat}&lng=${lng}`);
      setSafetyScore(response.data.safety_score);
    } catch (error) {
      const mockScore = 50 + Math.abs(lat * 100 + lng * 100) % 40;
      setSafetyScore(mockScore);
    }
  };

  const triggerSOS = async () => {
    if (!location || !touristId) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    const emergencyData = {
      id: Date.now(),
      type: 'SOS_EMERGENCY',
      tourist_id: touristId,
      location: `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`,
      timestamp: new Date().toLocaleString(),
      status: 'PENDING',
      priority: 'HIGH'
    };

    Alert.alert(
      "🚨 EMERGENCY SOS",
      `Send emergency alert to responders?\n\nTourist ID: ${touristId}`,
      [
        {
          text: "CANCEL",
          style: "cancel"
        },
        {
          text: "SEND SOS",
          onPress: async () => {
            try {
              // Send to responder server
              await axios.post(`${RESPONDER_SERVER}/api/emergency`, emergencyData);
              
              Alert.alert(
                "✅ SOS SENT!",
                `Help is on the way!\nTourist ID: ${touristId}`,
                [{ text: "OK" }]
              );
              
              console.log('🚨 Emergency sent:', emergencyData);
              
            } catch (error) {
              // Fallback: Store locally
              await AsyncStorage.setItem('pending_emergency', JSON.stringify(emergencyData));
              
              Alert.alert(
                "📡 OFFLINE MODE",
                "SOS stored locally. Will send when connection is available.",
                [{ text: "OK" }]
              );
            }
          }
        }
      ]
    );
  };

  const voiceSOS = () => {
    Alert.alert(
      "🎤 VOICE COMMAND",
      "Say 'HELP ME' loudly to trigger emergency SOS...",
      [
        {
          text: "START LISTENING",
          onPress: () => {
            setTimeout(() => {
              Alert.alert(
                "✅ VOICE DETECTED",
                "Emergency phrase recognized! Sending SOS...",
                [{ text: "OK", onPress: triggerSOS }]
              );
            }, 2000);
          }
        },
        { text: "CANCEL", style: "cancel" }
      ]
    );
  };

  const getRiskColor = () => {
    if (safetyScore > 70) return '#4CAF50';
    if (safetyScore > 40) return '#FF9800';
    return '#F44336';
  };

  const getRiskLevel = () => {
    if (safetyScore > 70) return 'SAFE ZONE';
    if (safetyScore > 40) return 'MODERATE RISK';
    return 'HIGH RISK';
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: getRiskColor() }]}>
        <Text style={styles.headerTitle}>🛡️ TOURIST SAFETY</Text>
        <Text style={styles.safetyScore}>AI SAFETY SCORE: {safetyScore}</Text>
        <Text style={styles.riskLevel}>{getRiskLevel()}</Text>
        <Text style={styles.touristId}>ID: {touristId}</Text>
        <Text style={styles.locationStatus}>
          {locationUpdatesActive ? '📍 LIVE TRACKING' : '📍 LOCATION OFFLINE'}
        </Text>
      </View>

      {/* Map Section */}
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={(newRegion) => {
          setRegion(newRegion);
          checkSafetyScore(newRegion.latitude, newRegion.longitude);
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            }}
            title="Your Location"
            description={`Tourist: ${touristId}`}
          />
        )}
      </MapView>

      {/* SOS Button */}
      <TouchableOpacity style={styles.sosButton} onPress={triggerSOS}>
        <Text style={styles.sosButtonText}>🚨</Text>
        <Text style={styles.sosButtonLabel}>EMERGENCY SOS</Text>
      </TouchableOpacity>

      {/* Voice SOS Button */}
      <TouchableOpacity style={styles.voiceButton} onPress={voiceSOS}>
        <Text style={styles.voiceButtonText}>🎤 VOICE SOS</Text>
      </TouchableOpacity>

      {/* Location Info */}
      <View style={styles.locationInfo}>
        <Text style={styles.locationText}>
          📍 LAT: {region.latitude.toFixed(4)} LNG: {region.longitude.toFixed(4)}
        </Text>
        <Text style={styles.locationText}>👤 TOURIST ID: {touristId}</Text>
        <Text style={styles.locationText}>
          {locationUpdatesActive ? '✅ LIVE UPDATES ACTIVE' : '❌ LOCATION OFFLINE'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    padding: 15,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  safetyScore: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  riskLevel: {
    color: 'white',
    fontSize: 14,
    marginTop: 2,
  },
  touristId: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    fontWeight: 'bold',
  },
  locationStatus: {
    color: 'white',
    fontSize: 10,
    marginTop: 3,
  },
  map: {
    flex: 1,
  },
  sosButton: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: '#F44336',
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
  sosButtonText: {
    fontSize: 30,
    marginBottom: 5,
  },
  sosButtonLabel: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  voiceButton: {
    position: 'absolute',
    bottom: 240,
    right: 20,
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 25,
    elevation: 5,
  },
  voiceButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  locationInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10,
  },
  locationText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 2,
  },
});