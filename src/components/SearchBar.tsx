"use client"

import React from "react"
import { useState } from "react"
import { Search, MapPin } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { SearchButton } from "./SearchButton";

interface SearchBarProps {
  onSearch?: (query: string, location: string) => void
  className?: string
}

export function SearchBar({ onSearch, className = "" }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (onSearch) {
      onSearch(query, location)
    } else {
      // If no onSearch prop, navigate to search page with query params
      const params = new URLSearchParams()
      if (query) params.set("q", query)
      if (location) params.set("location", location)
      navigate(`/search?${params.toString()}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${className}`}>
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="What service do you need?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
          />
        </div>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
          />
        </div>
        <SearchButton 
          onClick={() => handleSubmit} 
          className="bg-[#CC7357] text-white px-6 py-3 rounded-md hover:bg-[#B66347] transition-colors"
        />
      </div>
    </form>
  )
}

