const geohash = require('ngeohash');

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Encode coordinates to geohash
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} precision - Default 6 (approx 1.2km x 0.6km area)
 * @returns {string} Geohash string
 */
const encodeGeohash = (latitude, longitude, precision = 6) => {
  return geohash.encode(latitude, longitude, precision);
};

/**
 * Decode geohash to coordinates
 * @param {string} hash
 * @returns {object} { latitude, longitude }
 */
const decodeGeohash = (hash) => {
  const coords = geohash.decode(hash);
  return {
    latitude: coords.latitude,
    longitude: coords.longitude
  };
};

/**
 * Get neighbor geohashes (8 surrounding zones + center)
 * This is critical for finding drivers near zone boundaries
 * @param {string} hash
 * @returns {array} Array of 9 geohashes (center + 8 neighbors)
 */
const getNeighborZones = (hash) => {
  const neighbors = geohash.neighbors(hash);
  return [
    hash, // center
    neighbors[0], // north
    neighbors[1], // south
    neighbors[2], // east
    neighbors[3], // west
    neighbors[4], // northeast
    neighbors[5], // northwest
    neighbors[6], // southeast
    neighbors[7]  // southwest
  ];
};

/**
 * Convert meters to kilometers
 */
const metersToKm = (meters) => {
  return meters / 1000;
};

/**
 * Convert kilometers to meters
 */
const kmToMeters = (km) => {
  return km * 1000;
};

/**
 * Check if a point is within radius of another point
 * @param {object} point1 - { latitude, longitude }
 * @param {object} point2 - { latitude, longitude }
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean}
 */
const isWithinRadius = (point1, point2, radiusKm) => {
  const distance = calculateDistance(
    point1.latitude,
    point1.longitude,
    point2.latitude,
    point2.longitude
  );
  return distance <= radiusKm;
};

module.exports = {
  calculateDistance,
  encodeGeohash,
  decodeGeohash,
  getNeighborZones,
  metersToKm,
  kmToMeters,
  isWithinRadius
};
