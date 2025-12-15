import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
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
  const [mapKey, setMapKey] = useState(0);

  // Determine center - prioritize current location if no pickup set
  const center = useMemo(() => {
    if (pickupLocation) return pickupLocation;
    if (currentLocation) return currentLocation;
    return { latitude: 28.6139, longitude: 77.2090 }; // Default Delhi
  }, [pickupLocation, currentLocation]);

  // Build markers array
  const markers = useMemo(() => {
    const result: Array<{ id: string; latitude: number; longitude: number; title: string; type: string }> = [];

    if (currentLocation && !pickupLocation) {
      result.push({
        id: 'current',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        title: 'Your Location',
        type: 'current',
      });
    }
    if (pickupLocation) {
      result.push({
        id: 'pickup',
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
        title: 'Pickup',
        type: 'pickup',
      });
    }
    if (dropoffLocation) {
      result.push({
        id: 'dropoff',
        latitude: dropoffLocation.latitude,
        longitude: dropoffLocation.longitude,
        title: 'Dropoff',
        type: 'dropoff',
      });
    }
    if (driverLocation) {
      result.push({
        id: 'driver',
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        title: 'Driver',
        type: 'driver',
      });
    }
    return result;
  }, [pickupLocation, dropoffLocation, driverLocation, currentLocation]);

  const markersJson = JSON.stringify(markers);
  const routeJson = route ? JSON.stringify(route) : 'null';

  // Handle messages from iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      if (typeof event.data !== 'string') return;
      const data = JSON.parse(event.data);
      if (data.type === 'mapClick' && !dropoffLocation) {
        onPickupChange({ latitude: data.lat, longitude: data.lng, address: '' });
      }
    } catch (e) {
      // Ignore parse errors from other messages
    }
  }, [onPickupChange, dropoffLocation]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Force re-render when markers or route change significantly
  useEffect(() => {
    setMapKey(prev => prev + 1);
  }, [markersJson, routeJson, center.latitude, center.longitude]);

  const htmlContent = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        #map { width: 100%; height: 100%; }
        .current-marker {
          background: #2196F3;
          border: 3px solid white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          box-shadow: 0 2px 8px rgba(33,150,243,0.5);
        }
        .pickup-marker {
          background: #4CAF50;
          border: 3px solid white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        .dropoff-marker {
          background: #F44336;
          border: 3px solid white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        .driver-marker {
          background: #000;
          border: 3px solid #FFD700;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        .leaflet-control-attribution { font-size: 10px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        try {
          const map = L.map('map', {
            zoomControl: true,
            attributionControl: true
          }).setView([${center.latitude}, ${center.longitude}], 15);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19
          }).addTo(map);

          const markers = ${markersJson};
          const markerLayers = [];

          markers.forEach(m => {
            const iconClass = m.type + '-marker';
            const size = m.type === 'driver' ? [24, 24] : (m.type === 'current' ? [16, 16] : [20, 20]);
            const icon = L.divIcon({
              className: iconClass,
              iconSize: size,
              iconAnchor: [size[0]/2, size[1]/2]
            });
            const marker = L.marker([m.latitude, m.longitude], { icon }).addTo(map);
            marker.bindPopup(m.title);
            markerLayers.push(marker);
          });

          const routeData = ${routeJson};
          if (routeData && routeData.length > 0) {
            const latlngs = routeData.map(p => [p.latitude, p.longitude]);
            const polyline = L.polyline(latlngs, {
              color: '#4285F4',
              weight: 5,
              opacity: 0.8
            }).addTo(map);

            // Fit bounds to show the route
            if (latlngs.length > 1) {
              map.fitBounds(latlngs, { padding: [50, 50] });
            }
          } else if (markerLayers.length > 1) {
            // Fit bounds to markers if no route
            const group = new L.featureGroup(markerLayers);
            map.fitBounds(group.getBounds(), { padding: [50, 50] });
          }

          // Handle map clicks
          map.on('click', function(e) {
            window.parent.postMessage(JSON.stringify({
              type: 'mapClick',
              lat: e.latlng.lat,
              lng: e.latlng.lng
            }), '*');
          });

          // Resize handler
          window.addEventListener('resize', function() {
            map.invalidateSize();
          });

          // Signal that map is ready
          setTimeout(function() {
            map.invalidateSize();
          }, 100);

        } catch (err) {
          document.body.innerHTML = '<div style="padding:20px;color:red;">Map Error: ' + err.message + '</div>';
        }
      </script>
    </body>
    </html>
  `, [center.latitude, center.longitude, markersJson, routeJson]);

  return (
    <View style={styles.container}>
      <iframe
        key={mapKey}
        srcDoc={htmlContent}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        title="Customer Map"
        sandbox="allow-scripts allow-same-origin"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8e8e8',
  },
});

export default DraggableMap;
