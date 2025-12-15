/**
 * Vehicle type rate configuration
 */
const VEHICLE_RATES = {
  bike: {
    perKm: parseFloat(process.env.BIKE_RATE_PER_KM) || 10,
    baseFare: parseFloat(process.env.BASE_FARE) || 5,
    displayName: 'Bike'
  },
  auto: {
    perKm: parseFloat(process.env.AUTO_RATE_PER_KM) || 15,
    baseFare: parseFloat(process.env.BASE_FARE) || 5,
    displayName: 'Auto'
  },
  cab: {
    perKm: parseFloat(process.env.CAB_RATE_PER_KM) || 20,
    baseFare: parseFloat(process.env.BASE_FARE) || 5,
    displayName: 'Cab'
  }
};

/**
 * Calculate fare for a ride
 * @param {string} vehicleType - 'bike', 'auto', or 'cab'
 * @param {number} distanceKm - Distance in kilometers
 * @returns {object} Fare breakdown
 */
const calculateFare = (vehicleType, distanceKm) => {
  const vehicleConfig = VEHICLE_RATES[vehicleType.toLowerCase()];

  if (!vehicleConfig) {
    throw new Error(`Invalid vehicle type: ${vehicleType}`);
  }

  const baseFare = vehicleConfig.baseFare;
  const perKmCharge = vehicleConfig.perKm * distanceKm;
  const totalAmount = baseFare + perKmCharge;

  return {
    vehicleType: vehicleType.toLowerCase(),
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    baseFare,
    pricePerKm: vehicleConfig.perKm,
    perKmCharge: parseFloat(perKmCharge.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    currency: 'USD'
  };
};

/**
 * Calculate fare estimates for all vehicle types
 * @param {number} distanceKm - Distance in kilometers
 * @returns {array} Array of fare objects for each vehicle type
 */
const calculateAllFares = (distanceKm) => {
  return Object.keys(VEHICLE_RATES).map(vehicleType => {
    const fare = calculateFare(vehicleType, distanceKm);
    return {
      ...fare,
      displayName: VEHICLE_RATES[vehicleType].displayName
    };
  });
};

/**
 * Get vehicle rate configuration
 * @param {string} vehicleType
 * @returns {object} Vehicle rate config
 */
const getVehicleRate = (vehicleType) => {
  return VEHICLE_RATES[vehicleType.toLowerCase()] || null;
};

/**
 * Validate vehicle type
 * @param {string} vehicleType
 * @returns {boolean}
 */
const isValidVehicleType = (vehicleType) => {
  return Object.keys(VEHICLE_RATES).includes(vehicleType.toLowerCase());
};

module.exports = {
  calculateFare,
  calculateAllFares,
  getVehicleRate,
  isValidVehicleType,
  VEHICLE_RATES
};
