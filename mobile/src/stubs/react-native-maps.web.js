/**
 * Stub for react-native-maps on web platform
 * react-native-maps doesn't support web, so we provide empty components
 */

import React from 'react';
import { View, Text } from 'react-native';

// Empty MapView component for web
const MapView = React.forwardRef((props, ref) => {
  return (
    <View
      ref={ref}
      style={[
        {
          backgroundColor: '#e0e0e0',
          justifyContent: 'center',
          alignItems: 'center'
        },
        props.style
      ]}
    >
      <Text style={{ color: '#666' }}>Map not available on web</Text>
      {props.children}
    </View>
  );
});

MapView.displayName = 'MapView';

// Empty Marker component
const Marker = (props) => null;

// Empty Polyline component
const Polyline = (props) => null;

// Empty Polygon component
const Polygon = (props) => null;

// Empty Circle component
const Circle = (props) => null;

// Empty Callout component
const Callout = (props) => props.children || null;

// Empty CalloutSubview component
const CalloutSubview = (props) => props.children || null;

// Empty Overlay component
const Overlay = (props) => null;

// Empty Heatmap component
const Heatmap = (props) => null;

// Empty Geojson component
const Geojson = (props) => null;

// Provider constants
export const PROVIDER_DEFAULT = null;
export const PROVIDER_GOOGLE = 'google';

// Map types
export const MAP_TYPES = {
  STANDARD: 'standard',
  SATELLITE: 'satellite',
  HYBRID: 'hybrid',
  TERRAIN: 'terrain',
  NONE: 'none',
  MUTEDSTANDARD: 'mutedStandard',
};

// Animated components
const AnimatedRegion = class {
  constructor(initialRegion) {
    this.latitude = initialRegion?.latitude || 0;
    this.longitude = initialRegion?.longitude || 0;
    this.latitudeDelta = initialRegion?.latitudeDelta || 0;
    this.longitudeDelta = initialRegion?.longitudeDelta || 0;
  }
  timing() { return { start: () => {} }; }
  spring() { return { start: () => {} }; }
  setValue() {}
};

// Export components
export {
  Marker,
  Polyline,
  Polygon,
  Circle,
  Callout,
  CalloutSubview,
  Overlay,
  Heatmap,
  Geojson,
  AnimatedRegion,
};

// Default export
export default MapView;
