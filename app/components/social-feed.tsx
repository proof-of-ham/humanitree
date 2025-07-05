"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TreePine, MapPin, Heart, MessageCircle, Users } from "lucide-react"

export function SocialFeed() {
  // Mock social feed data
  const feedItems = [
    {
      id: 1,
      user: "EcoWarrior",
      avatar: "🌿",
      action: "planted a Mahogany tree",
      location: "Amazon Rainforest, Brazil",
      time: "2 hours ago",
      likes: 24,
      comments: 5,
      ngo: "Amazon Conservation",
    },
    {
      id: 2,
      user: "GreenThumb",
      avatar: "🌱",
      action: "planted an Oak tree",
      location: "Yellowstone, USA",
      time: "4 hours ago",
      likes: 18,
      comments: 3,
      ngo: "Forest Restoration Fund",
    },
    {
      id: 3,
      user: "TreeLover",
      avatar: "🌳",
      action: "planted a Baobab tree",
      location: "Madagascar",
      time: "6 hours ago",
      likes: 31,
      comments: 8,
      ngo: "Madagascar Green",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Users className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Community Activity</h3>
      </div>

      {feedItems.map((item) => (
        <Card key={item.id} className="bg-white/70 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* User Avatar */}
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-lg">
                {item.avatar}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{item.user}</span>
                  <span className="text-gray-600">{item.action}</span>
                </div>

                <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>{item.location}</span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">
                    {item.ngo}
                  </Badge>
                  <span className="text-xs text-gray-500">{item.time}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                    <Heart className="w-4 h-4" />
                    <span>{item.likes}</span>
                  </button>
                  <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span>{item.comments}</span>
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-gradient-to-r from-green-100 to-emerald-100 border-green-200">
        <CardContent className="p-4 text-center">
          <TreePine className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm text-green-800 font-medium">Join the movement! Plant your tree and inspire others.</p>
        </CardContent>
      </Card>
    </div>
  )
}
