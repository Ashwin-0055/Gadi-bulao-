/**
 * Admin Panel - Driver Simulation Control
 * Allows manual control of driver location for testing
 * Works on both Web and Mobile using OpenStreetMap
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Platform,
  Pressable,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { API_URL } from '../../src/config/environment';
import { useSocket } from '../../src/context/WSProvider';
import { getRoute } from '../../src/services/mapService';
import { Location } from '../../src/types';

const Button = Platform.OS === 'web' ? Pressable : TouchableOpacity;

interface ActiveRide {
  rideId: string;
  customerId: string;
  customerName: string;
  pickup: Location;
  dropoff: Location;
  status: string;
  driverLocation: Location | null;
}

export default function AdminPanel() {
  const router = useRouter();
  const { socket: socketService } = useSocket();
  const webViewRef = useRef<WebView>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [activeRides, setActiveRides] = useState<ActiveRide[]>([]);
  const [selectedRide, setSelectedRide] = useState<ActiveRide | null>(null);
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1000);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [mapKey, setMapKey] = useState(0); // For forcing map refresh

  // Manual coordinate input
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  // Fetch active rides on mount
  useEffect(() => {
    fetchActiveRides();
    const interval = setInterval(fetchActiveRides, 5000);
    return () => {
      clearInterval(interval);
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  // Update route when ride is selected
  useEffect(() => {
    if (selectedRide) {
      const startLocation = driverLocation || selectedRide.pickup;
      const endLocation = selectedRide.status === 'STARTED'
        ? selectedRide.dropoff
        : selectedRide.pickup;

      fetchRoute(startLocation, endLocation);
    }
  }, [selectedRide?.rideId, selectedRide?.status]);

  // Refresh map when locations change
  useEffect(() => {
    setMapKey(prev => prev + 1);
  }, [driverLocation, selectedRide, route]);

  const fetchActiveRides = async () => {
    try {
      const response = await fetch(`${API_URL}/api/rides/active`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setActiveRides(data.data);
        }
      }
    } catch (error) {
      console.log('Error fetching rides:', error);
    }
  };

  const fetchRoute = async (start: Location, end: Location) => {
    try {
      const result = await getRoute(
        start.latitude,
        start.longitude,
        end.latitude,
        end.longitude
      );

      if (result) {
        setRoute(result.coordinates);
        setCurrentRouteIndex(0);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const handleSelectRide = (ride: ActiveRide) => {
    setSelectedRide(ride);
    setDriverLocation(ride.driverLocation || ride.pickup);
    setIsSimulating(false);
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
  };

  const sendDriverLocation = (location: Location) => {
    if (!socketService || !selectedRide) return;

    // Emit driver location update
    socketService.emit('admin:updateDriverLocation', {
      rideId: selectedRide.rideId,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || '',
      },
    });

    setDriverLocation(location);
    console.log('📍 Admin sent driver location:', location);
  };

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent?.data || event.data);
      if (data.type === 'mapClick') {
        if (!selectedRide) {
          if (Platform.OS === 'web') {
            alert('Select a ride first');
          } else {
            Alert.alert('Select a ride first', 'Please select an active ride to control');
          }
          return;
        }

        const newLocation: Location = {
          latitude: data.latitude,
          longitude: data.longitude,
          address: '',
        };

        sendDriverLocation(newLocation);
      }
    } catch (e) {
      console.error('Error parsing map message:', e);
    }
  };

  const handleManualLocationSubmit = () => {
    if (!selectedRide) {
      if (Platform.OS === 'web') {
        alert('Select a ride first');
      } else {
        Alert.alert('Select a ride first', 'Please select an active ride to control');
      }
      return;
    }

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      if (Platform.OS === 'web') {
        alert('Invalid coordinates');
      } else {
        Alert.alert('Invalid coordinates', 'Please enter valid latitude and longitude');
      }
      return;
    }

    const newLocation: Location = {
      latitude: lat,
      longitude: lng,
      address: '',
    };

    sendDriverLocation(newLocation);
    setManualLat('');
    setManualLng('');
  };

  const startSimulation = () => {
    if (!selectedRide || route.length === 0) {
      if (Platform.OS === 'web') {
        alert('Cannot start simulation - select a ride with a valid route');
      } else {
        Alert.alert('Cannot start simulation', 'Please select a ride with a valid route');
      }
      return;
    }

    setIsSimulating(true);
    let index = currentRouteIndex;

    simulationIntervalRef.current = setInterval(() => {
      if (index >= route.length) {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
        }
        setIsSimulating(false);
        if (Platform.OS === 'web') {
          alert('Simulation Complete - Driver has reached the destination');
        } else {
          Alert.alert('Simulation Complete', 'Driver has reached the destination');
        }
        return;
      }

      const point = route[index];
      const newLocation: Location = {
        latitude: point.latitude,
        longitude: point.longitude,
        address: '',
      };

      sendDriverLocation(newLocation);
      setCurrentRouteIndex(index);
      index++;
    }, simulationSpeed);
  };

  const stopSimulation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    setIsSimulating(false);
  };

  const handleStatusChange = (newStatus: string) => {
    if (!socketService || !selectedRide) return;

    socketService.emit('admin:updateRideStatus', {
      rideId: selectedRide.rideId,
      status: newStatus,
    });

    setSelectedRide({ ...selectedRide, status: newStatus });

    if (newStatus === 'STARTED' && driverLocation) {
      fetchRoute(driverLocation, selectedRide.dropoff);
    }

    if (Platform.OS === 'web') {
      alert(`Status Updated to ${newStatus}`);
    } else {
      Alert.alert('Status Updated', `Ride status changed to ${newStatus}`);
    }
  };

  const moveDriverStep = (direction: 'forward' | 'backward') => {
    if (route.length === 0) return;

    let newIndex = direction === 'forward'
      ? Math.min(currentRouteIndex + 1, route.length - 1)
      : Math.max(currentRouteIndex - 1, 0);

    const point = route[newIndex];
    const newLocation: Location = {
      latitude: point.latitude,
      longitude: point.longitude,
      address: '',
    };

    sendDriverLocation(newLocation);
    setCurrentRouteIndex(newIndex);
  };

  // Generate map HTML
  const getMapHtml = () => {
    const center = driverLocation || selectedRide?.pickup || { latitude: 28.6139, longitude: 77.2090 };
    const routeCoords = route.length > 0 ? JSON.stringify(route.map(r => [r.latitude, r.longitude])) : '[]';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; }
          .driver-marker {
            background: #4CAF50;
            border: 3px solid white;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          }
          .pickup-marker {
            background: #22c55e;
            border: 3px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          }
          .dropoff-marker {
            background: #ef4444;
            border: 3px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          }
          .leaflet-control-attribution { font-size: 8px; }
          .instruction-overlay {
            position: absolute;
            bottom: 10px;
            left: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 8px;
            text-align: center;
            font-size: 12px;
            z-index: 1000;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div class="instruction-overlay">Tap on map to move driver location</div>
        <script>
          const map = L.map('map', {
            zoomControl: true,
            attributionControl: true
          }).setView([${center.latitude}, ${center.longitude}], 14);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
          }).addTo(map);

          // Handle map clicks
          map.on('click', function(e) {
            const message = JSON.stringify({
              type: 'mapClick',
              latitude: e.latlng.lat,
              longitude: e.latlng.lng
            });
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(message);
            } else {
              window.parent.postMessage(message, '*');
            }
          });

          // Driver marker
          ${driverLocation ? `
            const driverIcon = L.divIcon({
              html: '<div class="driver-marker">🚗</div>',
              iconSize: [30, 30],
              iconAnchor: [15, 15],
              className: ''
            });
            L.marker([${driverLocation.latitude}, ${driverLocation.longitude}], { icon: driverIcon })
              .addTo(map)
              .bindPopup('Driver Location');
          ` : ''}

          // Pickup marker
          ${selectedRide ? `
            const pickupIcon = L.divIcon({
              className: 'pickup-marker',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            L.marker([${selectedRide.pickup.latitude}, ${selectedRide.pickup.longitude}], { icon: pickupIcon })
              .addTo(map)
              .bindPopup('Pickup: ${selectedRide.pickup.address || 'Pickup Location'}');
          ` : ''}

          // Dropoff marker
          ${selectedRide ? `
            const dropoffIcon = L.divIcon({
              className: 'dropoff-marker',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            L.marker([${selectedRide.dropoff.latitude}, ${selectedRide.dropoff.longitude}], { icon: dropoffIcon })
              .addTo(map)
              .bindPopup('Dropoff: ${selectedRide.dropoff.address || 'Dropoff Location'}');
          ` : ''}

          // Route polyline
          const routeCoords = ${routeCoords};
          if (routeCoords.length > 0) {
            L.polyline(routeCoords, {
              color: '#2196F3',
              weight: 4,
              opacity: 0.8
            }).addTo(map);
          }
        </script>
      </body>
      </html>
    `;
  };

  // For web, handle messages differently
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'mapClick') {
            handleMapMessage({ data: event.data });
          }
        } catch (e) {}
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [selectedRide, socketService]);

  const renderMap = () => {
    if (Platform.OS === 'web') {
      return (
        <iframe
          key={mapKey}
          srcDoc={getMapHtml()}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Admin Map"
        />
      );
    }

    return (
      <WebView
        key={mapKey}
        ref={webViewRef}
        source={{ html: getMapHtml() }}
        style={styles.map}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        originWhitelist={['*']}
        onMessage={handleMapMessage}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Button style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Button>
        <Text style={styles.headerTitle}>🛠️ Admin Panel - Driver Simulator</Text>
      </View>

      <View style={styles.content}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          {renderMap()}
        </View>

        {/* Controls Section */}
        <ScrollView style={styles.controlsContainer}>
          {/* Active Rides */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Active Rides</Text>
            {activeRides.length === 0 ? (
              <Text style={styles.emptyText}>No active rides - Book a ride from customer app to test</Text>
            ) : (
              activeRides.map((ride) => (
                <Button
                  key={ride.rideId}
                  style={[
                    styles.rideCard,
                    selectedRide?.rideId === ride.rideId && styles.rideCardSelected,
                  ]}
                  onPress={() => handleSelectRide(ride)}
                >
                  <View style={styles.rideInfo}>
                    <Text style={styles.rideId}>
                      Ride: {ride.rideId.substring(0, 8)}...
                    </Text>
                    <Text style={styles.rideCustomer}>
                      Customer: {ride.customerName}
                    </Text>
                    <Text style={[styles.rideStatus, { color: getStatusColor(ride.status) }]}>
                      Status: {ride.status}
                    </Text>
                  </View>
                  <Ionicons
                    name={selectedRide?.rideId === ride.rideId ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={selectedRide?.rideId === ride.rideId ? '#4CAF50' : '#ccc'}
                  />
                </Button>
              ))
            )}
            <Button style={styles.refreshButton} onPress={fetchActiveRides}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.refreshButtonText}>Refresh Rides</Text>
            </Button>
          </View>

          {/* Driver Controls */}
          {selectedRide && (
            <>
              {/* Status Controls */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔄 Change Ride Status</Text>
                <View style={styles.statusButtons}>
                  <Button
                    style={[styles.statusButton, selectedRide.status === 'ARRIVED' && styles.statusButtonActive]}
                    onPress={() => handleStatusChange('ARRIVED')}
                  >
                    <Text style={[styles.statusButtonText, selectedRide.status === 'ARRIVED' && styles.statusButtonTextActive]}>ARRIVED</Text>
                  </Button>
                  <Button
                    style={[styles.statusButton, selectedRide.status === 'STARTED' && styles.statusButtonActive]}
                    onPress={() => handleStatusChange('STARTED')}
                  >
                    <Text style={[styles.statusButtonText, selectedRide.status === 'STARTED' && styles.statusButtonTextActive]}>STARTED</Text>
                  </Button>
                  <Button
                    style={[styles.statusButton, selectedRide.status === 'COMPLETED' && styles.statusButtonActive]}
                    onPress={() => handleStatusChange('COMPLETED')}
                  >
                    <Text style={[styles.statusButtonText, selectedRide.status === 'COMPLETED' && styles.statusButtonTextActive]}>COMPLETED</Text>
                  </Button>
                </View>
              </View>

              {/* Simulation Controls */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🚗 Route Simulation</Text>
                <Text style={styles.routeInfo}>
                  Route points: {route.length} | Current: {currentRouteIndex + 1}
                </Text>

                <View style={styles.simulationControls}>
                  <Button
                    style={styles.stepButton}
                    onPress={() => moveDriverStep('backward')}
                  >
                    <Ionicons name="play-back" size={24} color="#fff" />
                  </Button>

                  {isSimulating ? (
                    <Button style={styles.stopButton} onPress={stopSimulation}>
                      <Ionicons name="pause" size={24} color="#fff" />
                      <Text style={styles.buttonText}>Stop</Text>
                    </Button>
                  ) : (
                    <Button style={styles.playButton} onPress={startSimulation}>
                      <Ionicons name="play" size={24} color="#fff" />
                      <Text style={styles.buttonText}>Simulate</Text>
                    </Button>
                  )}

                  <Button
                    style={styles.stepButton}
                    onPress={() => moveDriverStep('forward')}
                  >
                    <Ionicons name="play-forward" size={24} color="#fff" />
                  </Button>
                </View>

                {/* Speed Control */}
                <View style={styles.speedControl}>
                  <Text style={styles.speedLabel}>Speed: {simulationSpeed}ms between updates</Text>
                  <View style={styles.speedButtons}>
                    <Button
                      style={styles.speedButton}
                      onPress={() => setSimulationSpeed(Math.max(100, simulationSpeed - 200))}
                    >
                      <Text style={styles.speedButtonText}>⚡ Faster</Text>
                    </Button>
                    <Button
                      style={styles.speedButton}
                      onPress={() => setSimulationSpeed(simulationSpeed + 200)}
                    >
                      <Text style={styles.speedButtonText}>🐢 Slower</Text>
                    </Button>
                  </View>
                </View>
              </View>

              {/* Manual Coordinates */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📍 Manual Coordinates</Text>
                <View style={styles.coordInputs}>
                  <TextInput
                    style={styles.coordInput}
                    placeholder="Latitude"
                    placeholderTextColor="#999"
                    value={manualLat}
                    onChangeText={setManualLat}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.coordInput}
                    placeholder="Longitude"
                    placeholderTextColor="#999"
                    value={manualLng}
                    onChangeText={setManualLng}
                    keyboardType="numeric"
                  />
                </View>
                <Button style={styles.setLocationButton} onPress={handleManualLocationSubmit}>
                  <Text style={styles.setLocationButtonText}>Set Driver Location</Text>
                </Button>
              </View>

              {/* Current Location Display */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📌 Current Driver Location</Text>
                {driverLocation ? (
                  <View style={styles.locationDisplay}>
                    <Text style={styles.locationText}>
                      Lat: {driverLocation.latitude.toFixed(6)}
                    </Text>
                    <Text style={styles.locationText}>
                      Lng: {driverLocation.longitude.toFixed(6)}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No location set</Text>
                )}
              </View>
            </>
          )}

          {/* Instructions */}
          <View style={[styles.section, styles.instructionsSection]}>
            <Text style={styles.sectionTitle}>ℹ️ How to Use</Text>
            <Text style={styles.instructionItem}>1. Book a ride from the Customer app</Text>
            <Text style={styles.instructionItem}>2. Accept the ride from Driver app (or wait for simulation)</Text>
            <Text style={styles.instructionItem}>3. Select the ride here in Admin Panel</Text>
            <Text style={styles.instructionItem}>4. Tap on map or use controls to move driver</Text>
            <Text style={styles.instructionItem}>5. Change status: ARRIVED → STARTED → COMPLETED</Text>
            <Text style={styles.instructionItem}>6. Customer app will update in real-time!</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'ACCEPTED':
      return '#FF9800';
    case 'ARRIVED':
      return '#4CAF50';
    case 'STARTED':
      return '#2196F3';
    case 'COMPLETED':
      return '#9E9E9E';
    default:
      return '#666';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
    cursor: 'pointer' as any,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  content: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
  },
  mapContainer: {
    flex: 1,
    minHeight: 300,
  },
  map: {
    flex: 1,
  },
  controlsContainer: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 380 : undefined,
    maxWidth: Platform.OS === 'web' ? 420 : undefined,
    backgroundColor: '#fff',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    fontSize: 13,
  },
  rideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    cursor: 'pointer' as any,
  },
  rideCardSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  rideInfo: {
    flex: 1,
  },
  rideId: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  rideCustomer: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  rideStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    cursor: 'pointer' as any,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  statusButtonActive: {
    backgroundColor: '#4CAF50',
  },
  statusButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  simulationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  stepButton: {
    width: 50,
    height: 50,
    backgroundColor: '#666',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    cursor: 'pointer' as any,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    cursor: 'pointer' as any,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  routeInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  speedControl: {
    marginTop: 16,
    alignItems: 'center',
  },
  speedLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  speedButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  speedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  speedButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  coordInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  coordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  setLocationButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    cursor: 'pointer' as any,
  },
  setLocationButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  locationDisplay: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    marginBottom: 4,
  },
  instructionsSection: {
    backgroundColor: '#FFF8E1',
  },
  instructionItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    paddingLeft: 8,
  },
});
