import { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { createClient } from '@supabase/supabase-js';

// ⚠️ DIRECT SUPABASE SETUP - ADD YOUR ACTUAL CREDENTIALS HERE
const supabaseUrl = 'https://kcqvcnqanaermhircipk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_KEY_HERE';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔗 Supabase initialized directly');

export default function HomeScreen() {
  const [location, setLocation] = useState({ latitude: 11.166737, longitude: 76.966926 });

  useEffect(() => {
    getLiveLocation();
  }, []);

  const getLiveLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    let currentLocation = await Location.getCurrentPositionAsync({});
    setLocation({
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    });
  };

  const sendSOS = async (type: string) => {
    console.log('🚨 SOS button pressed');
    
    try {
      const emergencyData = {
        type: type,
        location: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        tourist_id: 'tourist_' + Math.floor(1000 + Math.random() * 9000),
        status: 'PENDING'
      };

      console.log('📦 Data to send:', emergencyData);

      // Test the connection first
      console.log('🔗 Testing Supabase connection...');
      const testResult = await supabase.from('emergencies').select('*').limit(1);
      console.log('Connection test result:', testResult);

      // Send the SOS
      console.log('📤 Sending SOS to database...');
      const { data, error } = await supabase
        .from('emergencies')
        .insert([emergencyData])
        .select();

      if (error) {
        console.log('❌ Database error:', error);
        Alert.alert('Database Error', error.message);
        return;
      }

      console.log('✅ SOS saved successfully!', data);
      Alert.alert('🚨 SOS SENT!', `Emergency #${data[0].id} saved to database!`);

    } catch (error) {
      console.log('💥 Unexpected error:', error);
      Alert.alert('Error', 'Failed to send SOS: ' + error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tourist Safety App</Text>
        <Text style={styles.subtitle}>Direct Supabase Test</Text>
      </View>

      <View style={styles.mapContainer}>
        <Text style={styles.mapTitle}>Your Location</Text>
        <MapView 
          style={styles.map} 
          region={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          }}
        >
          <Marker coordinate={location} title="You are here" pinColor="red" />
        </MapView>
      </View>

      <View style={styles.locationInfo}>
        <Text>Lat: {location.latitude.toFixed(6)}</Text>
        <Text>Lng: {location.longitude.toFixed(6)}</Text>
      </View>

      <TouchableOpacity style={styles.sosButton} onPress={() => sendSOS('Voice Emergency')}>
        <Text style={styles.sosButtonText}>🚨 TEST SOS CONNECTION</Text>
      </TouchableOpacity>

      <Text style={styles.note}>Make sure to replace supabaseKey with your actual key!</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { alignItems: 'center', marginTop: 50, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 5 },
  mapContainer: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15 },
  mapTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  map: { height: 200, borderRadius: 8 },
  locationInfo: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, alignItems: 'center' },
  sosButton: { backgroundColor: '#ff4444', padding: 20, borderRadius: 10, alignItems: 'center' },
  sosButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  note: { textAlign: 'center', marginTop: 10, fontSize: 12, color: '#666' }
});