import React, { useState, useEffect } from 'react';
import { Search, MapPin, Filter, X, ChevronDown, ChevronUp, Calendar, AlertCircle } from 'lucide-react';
import { getServices } from '../lib/supabase';
import { getCurrentLocation, reverseGeocode } from '../lib/geolocation';
import { useToast } from './ui/toast';

interface AdvancedJobSearchProps {
  onSearch: (params: any) => void;
  initialFilters?: any;
}

export default function AdvancedJobSearch({ onSearch, initialFilters = {} }: AdvancedJobSearchProps) {
  const { addToast } = useToast();
  const [query, setQuery] = useState(initialFilters.query || '');
  const [location, setLocation] = useState(initialFilters.location || '');
  const [maxDistance, setMaxDistance] = useState(initialFilters.maxDistance || 50);
  const [minBudget, setMinBudget] = useState(initialFilters.minBudget || '');
  const [maxBudget, setMaxBudget] = useState(initialFilters.maxBudget || '');
  const [selectedServices, setSelectedServices] = useState<string[]>(initialFilters.serviceIds || []);
  const [selectedUrgency, setSelectedUrgency] = useState<string[]>(initialFilters.urgency || []);
  const [datePosted, setDatePosted] = useState(initialFilters.datePosted || 'any');
  const [skills, setSkills] = useState<string[]>(initialFilters.requiredSkills || []);
  const [newSkill, setNewSkill] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lon: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || 'date');
  const [sortOrder, setSortOrder] = useState(initialFilters.sortOrder || 'desc');

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
      minBudget: minBudget ? parseInt(minBudget.toString()) : undefined,
      maxBudget: maxBudget ? parseInt(maxBudget.toString()) : undefined,
      serviceIds: selectedServices.length > 0 ? selectedServices : undefined,
      urgency: selectedUrgency.length > 0 ? selectedUrgency : undefined,
      datePosted: datePosted !== 'any' ? datePosted : undefined,
      requiredSkills: skills.length > 0 ? skills : undefined,
      sortBy,
      sortOrder,
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

  // Handle service selection
  const handleServiceToggle = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(id => id !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  // Handle urgency selection
  const handleUrgencyToggle = (urgency: string) => {
    if (selectedUrgency.includes(urgency)) {
      setSelectedUrgency(selectedUrgency.filter(u => u !== urgency));
    } else {
      setSelectedUrgency([...selectedUrgency, urgency]);
    }
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
                placeholder="Search for jobs by title, description, or keywords..."
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
          <div className="space-y-6">
            {/* Budget range filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range (KES)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357]"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                  min="0"
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357]"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  min={minBudget || 0}
                />
              </div>
            </div>

            {/* Services filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {services.map((service) => (
                  <div key={service.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`service-${service.id}`}
                      checked={selectedServices.includes(service.id)}
                      onChange={() => handleServiceToggle(service.id)}
                      className="mr-2 h-4 w-4 text-[#CC7357] focus:ring-[#CC7357] border-gray-300 rounded"
                    />
                    <label htmlFor={`service-${service.id}`} className="text-sm text-gray-700">
                      {service.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Urgency filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgency Level</label>
              <div className="flex flex-wrap gap-2">
                {['low', 'normal', 'high', 'emergency'].map((urgency) => (
                  <button
                    key={urgency}
                    type="button"
                    className={`px-4 py-2 rounded-md text-sm ${
                      selectedUrgency.includes(urgency)
                        ? 'bg-[#CC7357] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => handleUrgencyToggle(urgency)}
                  >
                    {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Date posted filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Date Posted
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'any', label: 'Any Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`px-4 py-2 rounded-md text-sm ${
                      datePosted === option.value
                        ? 'bg-[#CC7357] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => setDatePosted(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
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

            {/* Skills filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
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

            {/* Sort options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <div className="flex flex-wrap gap-2">
                <select
                  className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357]"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="date">Date Posted</option>
                  <option value="budget">Budget</option>
                  <option value="relevance">Relevance</option>
                </select>

                <select
                  className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC7357]"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
