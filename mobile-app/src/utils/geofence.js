// Simple geofence utilities for client-side checks
// Uses Haversine formula to compute distance between two lat/lng points.

const toRad = (value) => (value * Math.PI) / 180;

export const distanceInMeters = (from, to) => {
  if (!from || !to || from.latitude == null || to.latitude == null) {
    return Number.POSITIVE_INFINITY;
  }

  const R = 6371000; // metres
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);

  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const isWithinGeofence = (point, center, radiusMeters) => {
  const distance = distanceInMeters(point, center);
  return { allowed: distance <= radiusMeters, distance };
};
