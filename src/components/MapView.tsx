import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface WorkerProfile {
  full_name: string;
  location?: string;
  // Support different location field names
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  location_lat?: number;
  location_lng?: number;
}

interface Worker {
  id: string;
  profile: WorkerProfile;
  headline?: string;
  hourly_rate: number;
  avg_rating: number;
}

interface MapViewProps {
  workers: Worker[];
  height?: string;
  center?: [number, number]; // [latitude, longitude]
  zoom?: number;
  onMarkerClick?: (worker: Worker) => void;
}

const MapView: React.FC<MapViewProps> = ({
  workers,
  height = '600px',
  center = [-1.2921, 36.8219], // Default to Nairobi, Kenya
  zoom = 12,
  onMarkerClick
}) => {
  // Fix for default marker icons in react-leaflet
  // This is needed because the webpack loader doesn't handle the relative paths in leaflet's CSS
  useEffect(() => {
    // Fix icon paths
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, []);
  // Create a custom icon for workers with ratings
  const createWorkerIcon = (rating: number) => {
    const ratingColor = rating >= 4.5 ? '#4CAF50' : // Green for high ratings
                        rating >= 3.5 ? '#FFC107' : // Yellow for medium ratings
                        '#F44336'; // Red for low ratings

    return L.divIcon({
      className: 'custom-worker-marker',
      html: `<div style="background-color: ${ratingColor}; width: 30px; height: 30px; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${rating.toFixed(1)}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {workers.map(worker => {
        // Check if profile exists
        if (!worker.profile) {
          return null;
        }

        // Get coordinates from any available location field
        const lat = worker.profile.latitude || worker.profile.lat || worker.profile.location_lat;
        const lng = worker.profile.longitude || worker.profile.lng || worker.profile.location_lng;

        // Only render marker if we have valid coordinates
        return lat && lng ? (
          <Marker
            key={worker.id}
            position={[lat, lng]}
            icon={createWorkerIcon(worker.avg_rating)}
            eventHandlers={{
              click: () => {
                if (onMarkerClick) {
                  onMarkerClick(worker);
                }
              }
            }}
          >
            <Popup>
              <div>
                <h3 className="font-bold">{worker.profile.full_name}</h3>
                <p className="text-sm">{worker.headline || 'Professional Worker'}</p>
                <p className="text-sm">Rating: {worker.avg_rating.toFixed(1)}/5</p>
                <p className="text-sm">Rate: KES {(worker.hourly_rate / 100).toFixed(2)}/hr</p>
                <p className="text-sm">{worker.profile.location}</p>
                <button
                  className="mt-2 bg-[#CC7357] text-white px-2 py-1 rounded text-xs"
                  onClick={() => onMarkerClick && onMarkerClick(worker)}
                >
                  View Profile
                </button>
              </div>
            </Popup>
          </Marker>
        ) : null;
      })}
    </MapContainer>
  );
};

export default MapView;
