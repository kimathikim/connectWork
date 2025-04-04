import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Filter, Loader } from 'lucide-react';
import { searchWorkers } from '../lib/supabase';
import { useToast } from '../components/ui/toast';
import MapView from '../components/MapView';
import { getCurrentLocation } from '../lib/geolocation';

function WorkersMapPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [maxDistance, setMaxDistance] = useState(50);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lon: number} | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-1.2921, 36.8219]); // Default to Nairobi, Kenya
  const [mapZoom, setMapZoom] = useState(12);
  const [selectedService, setSelectedService] = useState('');
  const [services, setServices] = useState<any[]>([]);

  // Fetch workers on component mount
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        setLoading(true);
        const workersData = await searchWorkers({});
        
        // Filter out workers without location data
        const workersWithLocation = workersData.filter(
          worker => worker.profile?.latitude && worker.profile?.longitude
        );
        
        setWorkers(workersWithLocation);
        
        // If we have workers with location, center the map on the first one
        if (workersWithLocation.length > 0) {
          const firstWorker = workersWithLocation[0];
          setMapCenter([firstWorker.profile.latitude, firstWorker.profile.longitude]);
        }
      } catch (error) {
        console.error('Error fetching workers:', error);
        addToast('Failed to load workers. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, [addToast]);

  // Handle using current location
  const handleUseCurrentLocation = async () => {
    try {
      setUseCurrentLocation(true);
      
      // Get current location
      const coords = await getCurrentLocation();
      
      // Store coordinates for search
      const coordinates = {
        lat: coords.latitude,
        lon: coords.longitude
      };
      
      setUserCoordinates(coordinates);
      setMapCenter([coords.latitude, coords.longitude]);
      setMapZoom(14); // Zoom in when using current location
      
      // Search for workers near the current location
      setLoading(true);
      const workersData = await searchWorkers({
        maxDistance,
        coordinates
      });
      
      setWorkers(workersData);
      addToast('Showing workers near your current location', 'success');
    } catch (error: any) {
      console.error('Error getting location:', error);
      setUseCurrentLocation(false);
      setUserCoordinates(null);
      addToast(error.message || 'Unable to get your location. Please enter it manually.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle search form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const searchParams: any = {
        query: searchQuery,
        maxDistance: parseInt(maxDistance.toString()),
      };
      
      // Add coordinates if using current location
      if (useCurrentLocation && userCoordinates) {
        searchParams.coordinates = userCoordinates;
      } else if (location) {
        searchParams.location = location;
      }
      
      // Add service filter if selected
      if (selectedService) {
        searchParams.serviceId = selectedService;
      }
      
      const workersData = await searchWorkers(searchParams);
      setWorkers(workersData);
      
      // If we have search results with location, center the map on the first one
      if (workersData.length > 0 && workersData[0].profile?.latitude && workersData[0].profile?.longitude) {
        setMapCenter([workersData[0].profile.latitude, workersData[0].profile.longitude]);
      }
      
      addToast(`Found ${workersData.length} workers matching your criteria`, 'success');
    } catch (error) {
      console.error('Error searching workers:', error);
      addToast('Failed to search workers. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle marker click to navigate to worker profile
  const handleMarkerClick = (worker: any) => {
    navigate(`/worker-profile/${worker.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Find Workers Near You</h1>
      
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          {/* Search query input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search for workers by name or service..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Location input */}
          <div className="flex-1">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Location"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357]"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setUseCurrentLocation(false);
                  setUserCoordinates(null);
                }}
                disabled={useCurrentLocation}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#CC7357] text-xs"
                onClick={handleUseCurrentLocation}
              >
                {useCurrentLocation ? 'Change' : 'Current Location'}
              </button>
            </div>
          </div>
          
          {/* Distance input */}
          <div className="w-full md:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357]"
              value={maxDistance}
              onChange={(e) => setMaxDistance(parseInt(e.target.value))}
            >
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
              <option value="100">Within 100 km</option>
            </select>
          </div>
          
          {/* Search button */}
          <button
            type="submit"
            className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC7357]"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <Loader className="animate-spin mr-2" size={18} />
                Searching...
              </span>
            ) : (
              'Search'
            )}
          </button>
        </form>
      </div>
      
      {/* Map View */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-xl font-bold mb-4">Worker Locations</h2>
        
        {loading ? (
          <div className="flex justify-center items-center h-[600px]">
            <Loader className="animate-spin mr-2" size={24} />
            <span>Loading map...</span>
          </div>
        ) : workers.length > 0 ? (
          <MapView 
            workers={workers} 
            center={mapCenter}
            zoom={mapZoom}
            onMarkerClick={handleMarkerClick}
          />
        ) : (
          <div className="flex flex-col justify-center items-center h-[600px] bg-gray-100 rounded-lg">
            <MapPin size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No workers found with location data</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search criteria or location</p>
          </div>
        )}
      </div>
      
      {/* Worker List */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold mb-4">Workers ({workers.length})</h2>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader className="animate-spin mr-2" size={24} />
            <span>Loading workers...</span>
          </div>
        ) : workers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.map(worker => (
              <div 
                key={worker.id} 
                className="border rounded-lg p-4 hover:shadow-md cursor-pointer"
                onClick={() => navigate(`/worker-profile/${worker.id}`)}
              >
                <div className="flex items-start">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-4">
                    {worker.profile?.avatar_url ? (
                      <img
                        src={worker.profile.avatar_url}
                        alt={worker.profile.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500 text-xl">{worker.profile?.full_name?.charAt(0) || 'W'}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold">{worker.profile?.full_name}</h3>
                    <p className="text-sm text-gray-600">{worker.headline || 'Professional Worker'}</p>
                    <div className="flex items-center mt-1">
                      <div className="flex items-center">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm ml-1">{worker.avg_rating.toFixed(1)}</span>
                      </div>
                      <span className="mx-2">•</span>
                      <span className="text-sm">KES {(worker.hourly_rate / 100).toFixed(2)}/hr</span>
                    </div>
                    {worker.distance && (
                      <p className="text-xs text-gray-500 mt-1">
                        <MapPin size={12} className="inline mr-1" />
                        {worker.distance < 1 
                          ? `${(worker.distance * 1000).toFixed(0)} meters away` 
                          : `${worker.distance.toFixed(1)} km away`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No workers found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkersMapPage;
