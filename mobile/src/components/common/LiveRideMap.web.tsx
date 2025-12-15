import React from 'react';
import { StyleSheet, View } from 'react-native';
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
  const center = driverLocation || pickupLocation || { latitude: 28.6139, longitude: 77.2090 };

  const markers: Array<{ lat: number; lng: number; type: string; title: string }> = [];
  if (pickupLocation) {
    markers.push({ lat: pickupLocation.latitude, lng: pickupLocation.longitude, type: 'pickup', title: 'Pickup' });
  }
  if (dropoffLocation && showDropoff) {
    markers.push({ lat: dropoffLocation.latitude, lng: dropoffLocation.longitude, type: 'dropoff', title: 'Dropoff' });
  }
  if (driverLocation) {
    markers.push({ lat: driverLocation.latitude, lng: driverLocation.longitude, type: 'driver', title: 'Driver' });
  }

  const markersJson = JSON.stringify(markers);
  const routeJson = JSON.stringify(route);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; }
        html, body, #map { width: 100%; height: 100%; }
        .pickup-marker { background: #4CAF50; border: 3px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
        .dropoff-marker { background: #F44336; border: 3px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
        .driver-marker { background: #000; border: 3px solid #FFD700; border-radius: 50%; width: 30px; height: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
        .driver-marker::after { content: '🚗'; font-size: 16px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${center.latitude}, ${center.longitude}], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

        const markers = ${markersJson};
        const bounds = [];

        markers.forEach(m => {
          const icon = L.divIcon({ className: m.type + '-marker', iconSize: m.type === 'driver' ? [30, 30] : [20, 20], iconAnchor: m.type === 'driver' ? [15, 15] : [10, 10] });
          L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(m.title);
          bounds.push([m.lat, m.lng]);
        });

        const routeData = ${routeJson};
        if (routeData && routeData.length > 0) {
          const latlngs = routeData.map(p => [p.latitude, p.longitude]);
          L.polyline(latlngs, { color: '#4285F4', weight: 4 }).addTo(map);
          latlngs.forEach(ll => bounds.push(ll));
        }

        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      </script>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  return (
    <View style={[styles.container, style]}>
      <iframe
        src={url}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Live Ride Map"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default LiveRideMap;
