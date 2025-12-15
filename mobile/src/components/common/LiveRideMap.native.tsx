import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Location } from '../../types';

interface LiveRideMapProps {
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  driverLocation: Location | null;
  route: { latitude: number; longitude: number }[];
  showDropoff?: boolean;
  style?: object;
}

const LiveRideMap: React.FC<LiveRideMapProps> = ({
  pickupLocation,
  dropoffLocation,
  driverLocation,
  route,
  showDropoff = true,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);
  const center = driverLocation || pickupLocation || { latitude: 28.6139, longitude: 77.2090 };
  const routeCoords = route.length > 0 ? JSON.stringify(route.map(r => [r.latitude, r.longitude])) : '[]';

  // Update driver marker position in real-time
  useEffect(() => {
    if (webViewRef.current && driverLocation) {
      const updateScript = `
        if (window.driverMarker) {
          window.driverMarker.setLatLng([${driverLocation.latitude}, ${driverLocation.longitude}]);
          window.map.panTo([${driverLocation.latitude}, ${driverLocation.longitude}], { animate: true, duration: 0.5 });
        }
        true;
      `;
      webViewRef.current.injectJavaScript(updateScript);
    }
  }, [driverLocation?.latitude, driverLocation?.longitude]);

  // Update route in real-time
  useEffect(() => {
    if (webViewRef.current && route.length > 0) {
      const routeData = JSON.stringify(route.map(r => [r.latitude, r.longitude]));
      const updateScript = `
        if (window.routePolyline && window.map) {
          window.routePolyline.setLatLngs(${routeData});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(updateScript);
    }
  }, [route]);

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
          background: #4CAF50;
          border: 3px solid white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        .dropoff-marker {
          background: #F44336;
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
          width: 36px;
          height: 36px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
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
        }).setView([${center.latitude}, ${center.longitude}], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19
        }).addTo(map);

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
        ${dropoffLocation && showDropoff ? `
          const dropoffIcon = L.divIcon({
            className: 'dropoff-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          L.marker([${dropoffLocation.latitude}, ${dropoffLocation.longitude}], { icon: dropoffIcon })
            .addTo(map)
            .bindPopup('Dropoff');
        ` : ''}

        // Driver marker with car icon - store in window for real-time updates
        ${driverLocation ? `
          const driverIcon = L.divIcon({
            html: '<div class="driver-marker">🚗</div>',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            className: ''
          });
          window.driverMarker = L.marker([${driverLocation.latitude}, ${driverLocation.longitude}], { icon: driverIcon })
            .addTo(map)
            .bindPopup('Driver');
        ` : ''}

        // Route polyline - store in window for real-time updates
        const routeCoords = ${routeCoords};
        window.routePolyline = L.polyline(routeCoords, {
          color: '#4285F4',
          weight: 4,
          opacity: 0.8
        }).addTo(map);

        if (routeCoords.length > 0) {
          // Fit map to show the entire route
          const bounds = L.latLngBounds(routeCoords);
          map.fitBounds(bounds, { padding: [50, 50] });
        }

        // Store map reference for updates
        window.map = map;
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, style]}>
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

export default LiveRideMap;
