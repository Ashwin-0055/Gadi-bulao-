import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Location } from '../../types';

interface RiderMapProps {
  currentLocation: Location | null;
  isOnDuty: boolean;
  style?: object;
}

const RiderMap: React.FC<RiderMapProps> = ({
  currentLocation,
  isOnDuty,
  style,
}) => {
  const center = currentLocation || {
    latitude: 28.6139,
    longitude: 77.2090,
  };

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
        .driver-marker {
          background: #4CAF50;
          border: 4px solid white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${center.latitude}, ${center.longitude}], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        ${isOnDuty ? `
          // Driver marker
          const driverIcon = L.divIcon({
            className: 'driver-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          L.marker([${center.latitude}, ${center.longitude}], { icon: driverIcon }).addTo(map).bindPopup('You');

          // Coverage circle (5km)
          L.circle([${center.latitude}, ${center.longitude}], {
            radius: 5000,
            color: 'rgba(76, 175, 80, 0.3)',
            fillColor: 'rgba(76, 175, 80, 0.1)',
            fillOpacity: 0.5
          }).addTo(map);
        ` : ''}
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
        title="Rider Map"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default RiderMap;
