import React, { useState, useEffect } from 'react';
import { Search, MapPin, Filter, X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { getServices } from '../lib/supabase';
import { getCurrentLocation, reverseGeocode } from '../lib/geolocation';
import { useToast } from './ui/toast';

interface AdvancedWorkerSearchProps {
  onSearch: (params: any) => void;
  initialFilters?: any;
}

export default function AdvancedWorkerSearch({ onSearch, initialFilters = {} }: AdvancedWorkerSearchProps) {
  const { addToast } = useToast();
  const [query, setQuery] = useState(initialFilters.query || '');
  const [location, setLocation] = useState(initialFilters.location || '');
  const [maxDistance, setMaxDistance] = useState(initialFilters.maxDistance || 50);
  const [minRating, setMinRating] = useState(initialFilters.minRating || 0);
  const [minRate, setMinRate] = useState(initialFilters.minRate || 0);
  const [maxRate, setMaxRate] = useState(initialFilters.maxRate || '');
  const [selectedService, setSelectedService] = useState(initialFilters.serviceId || '');
  const [skills, setSkills] = useState<string[]>(initialFilters.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lon: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Fetch services on component mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        const servicesData = await getServices();
        setServices(servicesData);
      } catch (error) {
        console.error('Error loading services:', error);
      }
    };

    loadServices();
  }, []);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const searchParams = {
      query,
      location: useCurrentLocation ? 'current' : location,
      maxDistance: parseInt(maxDistance.toString()),
      minRating: parseInt(minRating.toString()),
      minRate: parseInt(minRate.toString()),
      maxRate: maxRate ? parseInt(maxRate.toString()) : undefined,
      serviceId: selectedService || undefined,
      skills: skills.length > 0 ? skills : undefined,
      // Include coordinates if using current location
      coordinates: useCurrentLocation && userCoordinates ? userCoordinates : undefined,
    };

    onSearch(searchParams);
  };

  // Handle adding a new skill
  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  // Handle removing a skill
  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  // Handle using current location
  const handleUseCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      setUseCurrentLocation(true);

      // Get current location using our utility function
      const coords = await getCurrentLocation();

      // Store coordinates for use in search
      setUserCoordinates({
        lat: coords.latitude,
        lon: coords.longitude
      });

      // Try to get a readable address from the coordinates
      try {
        const address = await reverseGeocode(coords.latitude, coords.longitude);
        setLocation(`${address} (Current Location)`);
      } catch (geocodeError) {
        // If reverse geocoding fails, just show generic text
        setLocation('Using Current Location');
      }

      addToast('Using your current location', 'success');
    } catch (error: any) {
      console.error('Error getting location:', error);
      setUseCurrentLocation(false);
      setUserCoordinates(null);
      addToast(error.message || 'Unable to get your location. Please enter it manually.', 'error');
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search query input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search for workers by name, profession, or service..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357]"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357] ${locationLoading ? 'bg-gray-100' : ''}`}
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setUseCurrentLocation(false);
                  setUserCoordinates(null);
                }}
                disabled={useCurrentLocation || locationLoading}
              />
              <button
                type="button"
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${locationLoading ? 'text-gray-400' : 'text-[#CC7357]'}`}
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? 'Loading...' : useCurrentLocation ? 'Change' : 'Current Location'}
              </button>
            </div>
            {userCoordinates && (
              <p className="text-xs text-gray-500 mt-1">
                Using coordinates: {userCoordinates.lat.toFixed(4)}, {userCoordinates.lon.toFixed(4)}
              </p>
            )}
          </div>

          {/* Search button */}
          <button
            type="submit"
            className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
          >
            Search
          </button>
        </div>

        {/* Advanced filters toggle */}
        <div className="flex items-center mb-4">
          <button
            type="button"
            className="flex items-center text-[#CC7357] text-sm font-medium"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter size={16} className="mr-1" />
            Advanced Filters
            {showAdvanced ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
          </button>
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {/* Service filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357]"
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
              >
                <option value="">All Services</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Distance filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Distance (km): {maxDistance}
              </label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                className="w-full"
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseInt(e.target.value))}
              />
            </div>

            {/* Rating filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Rating: {minRating} stars
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                className="w-full"
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
              />
            </div>

            {/* Price range filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range (KES)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357]"
                  value={minRate}
                  onChange={(e) => setMinRate(e.target.value === '' ? 0 : parseInt(e.target.value))}
                  min="0"
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357]"
                  value={maxRate}
                  onChange={(e) => setMaxRate(e.target.value)}
                  min={minRate}
                />
              </div>
            </div>

            {/* Skills filter */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a skill"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357]"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
                <button
                  type="button"
                  className="bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347] transition-colors"
                  onClick={handleAddSkill}
                >
                  Add
                </button>
              </div>

              {/* Skills tags */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((skill) => (
                    <div
                      key={skill}
                      className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full flex items-center"
                    >
                      <span className="text-sm">{skill}</span>
                      <button
                        type="button"
                        className="ml-1 text-gray-500 hover:text-gray-700"
                        onClick={() => handleRemoveSkill(skill)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
