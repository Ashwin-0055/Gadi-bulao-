import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Location } from '../../types';

interface DraggableMapProps {
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  onPickupChange: (location: Location) => void;
  route?: { latitude: number; longitude: number }[];
  currentLocation?: Location;
  driverLocation?: Location;
}

const DraggableMap: React.FC<DraggableMapProps> = ({
  pickupLocation,
  dropoffLocation,
  onPickupChange,
  route,
  currentLocation,
  driverLocation,
}) => {
  const webViewRef = useRef<WebView>(null);

  const center = pickupLocation || currentLocation || {
    latitude: 28.6139,
    longitude: 77.2090,
  };

  const routeCoords = route ? JSON.stringify(route.map(r => [r.latitude, r.longitude])) : '[]';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #map { width: 100%; height: 100%; }
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
        .driver-marker {
          background: #000;
          border: 3px solid white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        .leaflet-control-attribution { font-size: 8px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', {
          zoomControl: true,
          attributionControl: true
        }).setView([${center.latitude}, ${center.longitude}], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19
        }).addTo(map);

        // Handle map clicks for pickup selection
        const hasDropoff = ${dropoffLocation ? 'true' : 'false'};
        if (!hasDropoff) {
          map.on('click', function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'locationSelected',
              latitude: e.latlng.lat,
              longitude: e.latlng.lng
            }));
          });
        }

        // Pickup marker
        ${pickupLocation ? `
          const pickupIcon = L.divIcon({
            className: 'pickup-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          L.marker([${pickupLocation.latitude}, ${pickupLocation.longitude}], { icon: pickupIcon })
            .addTo(map)
            .bindPopup('Pickup');
        ` : ''}

        // Dropoff marker
        ${dropoffLocation ? `
          const dropoffIcon = L.divIcon({
            className: 'dropoff-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          L.marker([${dropoffLocation.latitude}, ${dropoffLocation.longitude}], { icon: dropoffIcon })
            .addTo(map)
            .bindPopup('Dropoff');
        ` : ''}

        // Driver marker
        ${driverLocation ? `
          const driverIcon = L.divIcon({
            className: 'driver-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          L.marker([${driverLocation.latitude}, ${driverLocation.longitude}], { icon: driverIcon })
            .addTo(map)
            .bindPopup('Driver');
        ` : ''}

        // Route polyline
        const routeCoords = ${routeCoords};
        if (routeCoords.length > 0) {
          L.polyline(routeCoords, {
            color: '#4285F4',
            weight: 4,
            opacity: 0.8
          }).addTo(map);

          // Fit map to show the entire route
          const bounds = L.latLngBounds(routeCoords);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelected') {
        onPickupChange({
          latitude: data.latitude,
          longitude: data.longitude,
          address: '',
        });
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.map}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        originWhitelist={['*']}
        onMessage={handleMessage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default DraggableMap;
