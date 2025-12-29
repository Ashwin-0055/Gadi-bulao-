const { encodeGeohash, getNeighborZones, calculateDistance } = require('../utils/geospatial');

/**
 * Zone Manager - Handles geohash-based zone subscriptions for drivers
 * This allows efficient broadcasting of ride requests to nearby drivers
 */
class ZoneManager {
  constructor() {
    // Map of socketId -> { userId, zone, location }
    this.driverSockets = new Map();

    // Map of zone -> Set of socketIds
    this.zoneDrivers = new Map();

    // ZoneManager initialized
  }

  /**
   * Subscribe a driver to a zone
   * @param {Socket} socket - Socket.io socket instance
   * @param {object} location - { latitude, longitude }
   * @param {string} vehicleType - Driver's vehicle type (bike, auto, cab)
   */
  subscribeToZone(socket, location, vehicleType = null) {
    try {
      const { latitude, longitude } = location;

      // Calculate geohash for the location
      const precision = parseInt(process.env.ZONE_PRECISION) || 6;
      const zone = encodeGeohash(latitude, longitude, precision);

      // Unsubscribe from previous zone if exists
      this.unsubscribeFromZone(socket);

      // Join the socket.io room
      socket.join(`zone:${zone}`);

      // Store driver socket info including vehicle type
      this.driverSockets.set(socket.id, {
        userId: socket.user.userId,
        zone,
        location: { latitude, longitude },
        vehicleType: vehicleType ? vehicleType.toLowerCase() : null
      });

      // Add driver to zone tracking
      if (!this.zoneDrivers.has(zone)) {
        this.zoneDrivers.set(zone, new Set());
      }
      this.zoneDrivers.get(zone).add(socket.id);

      console.log(`[Zone] Driver subscribed to ${zone}`);

      return {
        success: true,
        zone,
        driversInZone: this.zoneDrivers.get(zone).size
      };

    } catch (error) {
      console.error('[Error] Zone subscription:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unsubscribe a driver from their current zone
   * @param {Socket} socket
   */
  unsubscribeFromZone(socket) {
    try {
      const driverInfo = this.driverSockets.get(socket.id);

      if (driverInfo) {
        const { zone } = driverInfo;

        // Leave the socket.io room
        socket.leave(`zone:${zone}`);

        // Remove from zone tracking
        if (this.zoneDrivers.has(zone)) {
          this.zoneDrivers.get(zone).delete(socket.id);

          // Clean up empty zones
          if (this.zoneDrivers.get(zone).size === 0) {
            this.zoneDrivers.delete(zone);
          }
        }

        // Remove driver socket info
        this.driverSockets.delete(socket.id);

        // Driver unsubscribed from zone
      }

    } catch (error) {
      console.error('[Error] Zone unsubscription:', error.message);
    }
  }

  /**
   * Get all zones that should receive a ride request
   * Uses multiple precision levels to find drivers in a wider area
   * @param {object} pickupLocation - { latitude, longitude }
   * @returns {array} Array of zone strings
   */
  getRelevantZones(pickupLocation) {
    const { latitude, longitude } = pickupLocation;
    const allZones = new Set();

    // Try multiple precision levels to find drivers
    // Precision 6 = ~1.2km, 5 = ~5km, 4 = ~40km
    const precisions = [6, 5, 4];

    for (const precision of precisions) {
      const centerZone = encodeGeohash(latitude, longitude, precision);
      const neighbors = getNeighborZones(centerZone);

      neighbors.forEach(zone => {
        // Check if any drivers are in zones that start with this prefix
        this.zoneDrivers.forEach((drivers, driverZone) => {
          if (driverZone.startsWith(zone.substring(0, precision)) && drivers.size > 0) {
            allZones.add(driverZone);
          }
        });
      });

      // If we found drivers at this precision, no need to go wider
      if (allZones.size > 0) {
        break;
      }
    }

    return Array.from(allZones);
  }

  /**
   * Get socket IDs of drivers with specific vehicle type in given zones
   * @param {array} zones - Array of zone strings
   * @param {string} vehicleType - Required vehicle type (bike, auto, cab)
   * @returns {array} Array of socket IDs
   */
  getDriverSocketsByVehicleType(zones, vehicleType) {
    const matchingSocketIds = [];
    const normalizedVehicleType = vehicleType.toLowerCase();

    zones.forEach(zone => {
      const driversInZone = this.zoneDrivers.get(zone);
      if (driversInZone) {
        driversInZone.forEach(socketId => {
          const driverInfo = this.driverSockets.get(socketId);
          if (driverInfo && driverInfo.vehicleType === normalizedVehicleType) {
            matchingSocketIds.push(socketId);
          }
        });
      }
    });

    // Found matching drivers
    return matchingSocketIds;
  }

  /**
   * Get ALL online drivers with specific vehicle type within a radius
   * This is used as a fallback when zone-based matching doesn't find enough drivers
   * @param {object} pickupLocation - { latitude, longitude }
   * @param {string} vehicleType - Required vehicle type (bike, auto, cab)
   * @param {number} radiusKm - Search radius in kilometers (default: 50km)
   * @returns {array} Array of { socketId, distance } sorted by distance
   */
  getDriversWithinRadius(pickupLocation, vehicleType, radiusKm = 50) {
    const { latitude, longitude } = pickupLocation;
    const normalizedVehicleType = vehicleType.toLowerCase();
    const matchingDrivers = [];

    this.driverSockets.forEach((driverInfo, socketId) => {
      if (driverInfo.vehicleType === normalizedVehicleType && driverInfo.location) {
        const distance = calculateDistance(
          latitude,
          longitude,
          driverInfo.location.latitude,
          driverInfo.location.longitude
        );

        if (distance <= radiusKm) {
          matchingDrivers.push({ socketId, distance, driverInfo });
        }
      }
    });

    // Sort by distance (closest first)
    matchingDrivers.sort((a, b) => a.distance - b.distance);

    console.log(`[Zone] Found ${matchingDrivers.length} ${vehicleType} drivers within ${radiusKm}km`);
    return matchingDrivers;
  }

  /**
   * Get driver count in a specific zone
   * @param {string} zone - Geohash string
   * @returns {number}
   */
  getDriverCountInZone(zone) {
    return this.zoneDrivers.has(zone) ? this.zoneDrivers.get(zone).size : 0;
  }

  /**
   * Get total online drivers count
   * @returns {number}
   */
  getTotalOnlineDrivers() {
    return this.driverSockets.size;
  }

  /**
   * Get all zones with driver counts
   * @returns {object} Map of zone -> driver count
   */
  getAllZones() {
    const zones = {};
    this.zoneDrivers.forEach((drivers, zone) => {
      zones[zone] = drivers.size;
    });
    return zones;
  }

  /**
   * Get driver info by socket ID
   * @param {string} socketId
   * @returns {object|null}
   */
  getDriverInfo(socketId) {
    return this.driverSockets.get(socketId) || null;
  }

  /**
   * Clean up on socket disconnect
   * @param {Socket} socket
   */
  handleDisconnect(socket) {
    this.unsubscribeFromZone(socket);
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    return {
      totalDrivers: this.getTotalOnlineDrivers(),
      totalZones: this.zoneDrivers.size,
      zones: this.getAllZones()
    };
  }
}

// Singleton instance
const zoneManager = new ZoneManager();

module.exports = zoneManager;
