"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TreePine, MapPin, Calendar, X, Share2, Sparkles } from "lucide-react"

interface TreeCelebrationProps {
  tree: {
    id: string
    location: string
    species: string
    ngo: string
    plantedDate: string
    coordinates?: { lat: number; lng: number }
  }
  totalTrees: number
  onClose: () => void
}

export function TreePlantingCelebration({ tree, totalTrees, onClose }: TreeCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation after component mounts
    setTimeout(() => setIsVisible(true), 100)
  }, [])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "🌱 Tree Planted Successfully!",
          text: `I just planted a ${tree.species} in ${tree.location}! This is my ${totalTrees}${getOrdinalSuffix(totalTrees)} tree planted to fight climate change! 🌍`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    } else {
      navigator.clipboard.writeText(
        `🌱 I just planted a ${tree.species} in ${tree.location}! This is my ${totalTrees}${getOrdinalSuffix(totalTrees)} tree! Join me at ${window.location.href}`,
      )
      alert("Achievement copied to clipboard!")
    }
  }

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) return "st"
    if (j === 2 && k !== 12) return "nd"
    if (j === 3 && k !== 13) return "rd"
    return "th"
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`transform transition-all duration-500 ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        <Card className="w-full max-w-sm bg-white shadow-2xl border-0 overflow-hidden">
          {/* Header with close button */}
          <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Celebration Animation */}
            <div className="relative">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <TreePine className="w-10 h-10 text-white" />
              </div>

              {/* Sparkles Animation */}
              <div className="absolute inset-0 pointer-events-none">
                <Sparkles className="absolute top-2 left-8 w-4 h-4 text-yellow-300 animate-pulse" />
                <Sparkles className="absolute top-8 right-6 w-3 h-3 text-yellow-200 animate-pulse delay-300" />
                <Sparkles className="absolute bottom-4 left-12 w-5 h-5 text-yellow-400 animate-pulse delay-700" />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2">🎉 Tree Planted!</h2>
            <p className="text-green-100">
              Congratulations! Your {totalTrees}
              {getOrdinalSuffix(totalTrees)} tree is now growing!
            </p>
          </div>

          <CardContent className="p-6 space-y-4">
            {/* Tree Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <TreePine className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold text-gray-900">{tree.species}</div>
                  <div className="text-sm text-gray-600">Tree Species</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">{tree.location}</div>
                  <div className="text-sm text-gray-600">Planting Location</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="font-semibold text-gray-900">{tree.plantedDate}</div>
                  <div className="text-sm text-gray-600">Planted by {tree.ngo}</div>
                </div>
              </div>
            </div>

            {/* Impact Stats */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 text-center">Your Environmental Impact</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{totalTrees}</div>
                  <div className="text-xs text-gray-600">Trees Planted</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{Math.round(totalTrees * 22)}</div>
                  <div className="text-xs text-gray-600">kg CO₂ Offset/Year</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleShare} className="flex-1 bg-green-600 hover:bg-green-700">
                <Share2 className="w-4 h-4 mr-2" />
                Share Achievement
              </Button>
              <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
                Continue
              </Button>
            </div>

            {/* Tree ID */}
            <div className="text-center">
              <p className="text-xs text-gray-500">Tree ID: {tree.id}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
