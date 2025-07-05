"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TreePine, Award, Calendar, CheckCircle } from "lucide-react"

interface UserProfileProps {
  treesPlanted: number
  nullifier: string
}

export function UserProfile({ treesPlanted, nullifier }: UserProfileProps) {
  const joinDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  })

  const getLevel = (trees: number) => {
    if (trees >= 100) return { name: "Forest Guardian", color: "bg-purple-100 text-purple-800", icon: "🌲" }
    if (trees >= 50) return { name: "Tree Champion", color: "bg-blue-100 text-blue-800", icon: "🏆" }
    if (trees >= 20) return { name: "Green Warrior", color: "bg-green-100 text-green-800", icon: "⚔️" }
    if (trees >= 10) return { name: "Eco Hero", color: "bg-emerald-100 text-emerald-800", icon: "🦸" }
    if (trees >= 5) return { name: "Tree Lover", color: "bg-teal-100 text-teal-800", icon: "💚" }
    return { name: "Seedling", color: "bg-lime-100 text-lime-800", icon: "🌱" }
  }

  const level = getLevel(treesPlanted)
  const shortNullifier = nullifier.slice(0, 8) + "..." + nullifier.slice(-4)

  return (
    <Card className="bg-white/70 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-2xl">
            {level.icon}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">Tree Planter</h3>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className={level.color}>
                <Award className="w-3 h-3 mr-1" />
                {level.name}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <TreePine className="w-3 h-3" />
                <span>{treesPlanted} trees</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Since {joinDate}</span>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-1">ID: {shortNullifier}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
