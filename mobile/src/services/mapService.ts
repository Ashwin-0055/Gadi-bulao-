/**
 * OpenStreetMap Services
 * Free alternatives to Google Maps APIs
 * - Nominatim for geocoding and search
 * - OSRM for routing/directions
 */

import axios from 'axios';

// Nominatim API (OpenStreetMap search & geocoding)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// OSRM API (Open Source Routing Machine)
const OSRM_BASE_URL = 'https://router.project-osrm.org';

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface SearchResult {
  id: string;
  latitude: number;
  longitude: number;
  displayName: string;
  shortName: string;
}

interface RouteResult {
  coordinates: { latitude: number; longitude: number }[];
  distance: number; // in meters
  duration: number; // in seconds
}

/**
 * Search for places using Nominatim
 * @param query Search query
 * @param countryCode Country code (e.g., 'in' for India)
 */
export const searchPlaces = async (
  query: string,
  countryCode: string = 'in'
): Promise<SearchResult[]> => {
  try {
    const response = await axios.get<NominatimResult[]>(
      `${NOMINATIM_BASE_URL}/search`,
      {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 5,
          countrycodes: countryCode,
        },
        headers: {
          'User-Agent': 'GadiBulaoApp/1.0',
        },
      }
    );

    return response.data.map((result) => ({
      id: result.place_id.toString(),
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      shortName: formatShortName(result),
    }));
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
};

/**
 * Reverse geocode coordinates to address
 * @param lat Latitude
 * @param lon Longitude
 */
export const reverseGeocode = async (
  lat: number,
  lon: number
): Promise<string> => {
  try {
    const response = await axios.get<NominatimResult>(
      `${NOMINATIM_BASE_URL}/reverse`,
      {
        params: {
          lat,
          lon,
          format: 'json',
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'GadiBulaoApp/1.0',
        },
      }
    );

    if (response.data && response.data.display_name) {
      return formatShortName(response.data);
    }
    return 'Unknown location';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'Unknown location';
  }
};

/**
 * Get route between two points using OSRM
 * @param startLat Start latitude
 * @param startLon Start longitude
 * @param endLat End latitude
 * @param endLon End longitude
 */
export const getRoute = async (
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): Promise<RouteResult | null> => {
  try {
    const response = await axios.get(
      `${OSRM_BASE_URL}/route/v1/driving/${startLon},${startLat};${endLon},${endLat}`,
      {
        params: {
          overview: 'full',
          geometries: 'geojson',
        },
      }
    );

    if (response.data.code === 'Ok' && response.data.routes.length > 0) {
      const route = response.data.routes[0];

      // Convert GeoJSON coordinates to our format
      const coordinates = route.geometry.coordinates.map(
        (coord: [number, number]) => ({
          latitude: coord[1],
          longitude: coord[0],
        })
      );

      return {
        coordinates,
        distance: route.distance, // in meters
        duration: route.duration, // in seconds
      };
    }

    return null;
  } catch (error) {
    console.error('OSRM routing error:', error);
    return null;
  }
};

/**
 * Format address to shorter display name
 */
const formatShortName = (result: NominatimResult): string => {
  const { address, display_name } = result;

  if (address) {
    const parts = [];
    if (address.road) parts.push(address.road);
    if (address.suburb) parts.push(address.suburb);
    if (address.city) parts.push(address.city);

    if (parts.length > 0) {
      return parts.join(', ');
    }
  }

  // Fallback: take first 2-3 parts of display name
  const nameParts = display_name.split(', ');
  return nameParts.slice(0, 3).join(', ');
};

export default {
  searchPlaces,
  reverseGeocode,
  getRoute,
};
