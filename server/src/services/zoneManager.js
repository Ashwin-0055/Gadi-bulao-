const { encodeGeohash, getNeighborZones } = require('../utils/geospatial');

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
   * Includes the pickup zone + all 8 neighboring zones (to catch drivers near boundaries)
   * @param {object} pickupLocation - { latitude, longitude }
   * @returns {array} Array of zone strings
   */
  getRelevantZones(pickupLocation) {
    const { latitude, longitude } = pickupLocation;
    const precision = parseInt(process.env.ZONE_PRECISION) || 6;
    const centerZone = encodeGeohash(latitude, longitude, precision);

    // Get center + 8 neighbors
    const zones = getNeighborZones(centerZone);

    return zones.filter(zone => this.zoneDrivers.has(zone) && this.zoneDrivers.get(zone).size > 0);
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
