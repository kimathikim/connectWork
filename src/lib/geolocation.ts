// Geolocation utilities for location-based search

// Earth radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return distance;
}

/**
 * Get current user location using browser geolocation API
 * @returns Promise with coordinates {latitude, longitude}
 */
export function getCurrentLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position.coords);
      },
      (error) => {
        // Provide more user-friendly error messages
        let errorMessage = "Unable to get your location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access was denied. Please enable location services in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable. Please try again later.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }

        const enhancedError = new Error(errorMessage);
        enhancedError.name = 'GeolocationError';
        reject(enhancedError);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 } // Increased timeout and cache time
    );
  });
}

/**
 * Convert a location string to coordinates using OpenStreetMap Nominatim API
 * @param location Location string (e.g., "Nairobi, Kenya")
 * @returns Promise with coordinates {lat, lon}
 */
export async function geocodeLocation(location: string): Promise<{ lat: number; lon: number }> {
  try {
    const encodedLocation = encodeURIComponent(location);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedLocation}&limit=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "ConnectWork App",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Geocoding failed");
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error("Location not found");
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    throw error;
  }
}

/**
 * Convert coordinates to an address using OpenStreetMap Nominatim API (reverse geocoding)
 * @param lat Latitude
 * @param lon Longitude
 * @returns Promise with address string
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "ConnectWork App",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Reverse geocoding failed");
    }

    const data = await response.json();

    if (!data || !data.display_name) {
      throw new Error("Location not found");
    }

    return data.display_name;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    throw error;
  }
}

/**
 * Find workers within a certain distance of a location
 * @param workers Array of worker profiles
 * @param targetLat Target latitude
 * @param targetLon Target longitude
 * @param maxDistance Maximum distance in kilometers
 * @returns Filtered array of workers with distance added
 */
export function filterWorkersByDistance(
  workers: any[],
  targetLat: number,
  targetLon: number,
  maxDistance: number
): any[] {
  return workers
    .filter((worker) => {
      // Skip workers without location coordinates
      if (!worker.profile?.latitude || !worker.profile?.longitude) {
        return false;
      }

      const distance = calculateDistance(
        targetLat,
        targetLon,
        worker.profile.latitude,
        worker.profile.longitude
      );

      // Add distance to worker object
      worker.distance = distance;

      // Filter by maximum distance
      return distance <= maxDistance;
    })
    .sort((a, b) => a.distance - b.distance); // Sort by distance
}
