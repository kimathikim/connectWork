"use client"
import { Star, MapPin } from "lucide-react"
import React from "react"
import { useNavigate } from "react-router-dom"

interface WorkerCardProps {
  name: string
  profession: string
  rating: number
  location: string
  hourlyRate: number
  imageUrl: string
  id?: string
}

export function WorkerCard({ name, profession, rating, location, hourlyRate, imageUrl, id }: WorkerCardProps) {
  const navigate = useNavigate()

  const handleBookNow = () => {
    navigate("/booking", {
      state: {
        worker: {
          name,
          profession,
          hourlyRate,
          imageUrl,
          id,
        },
      },
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative h-48">
        <img src={imageUrl || "/placeholder.svg"} alt={name} className="w-full h-full object-cover" />
        <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full flex items-center space-x-1">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="text-sm font-medium">{rating}</span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900">{name}</h3>
        <p className="text-[#6B8E23] font-medium">{profession}</p>

        <div className="mt-2 flex items-center text-gray-600 text-sm">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{location}</span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-gray-900 font-bold">KES {hourlyRate}/hr</span>
          <button
            onClick={handleBookNow}
            className="bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347] transition-colors"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  )
}

