"use server"

export type PlantTreeReply = {
  success: boolean
  tree?: {
    id: string
    location: string
    species: string
    ngo: string
    plantedDate: string
    coordinates?: { lat: number; lng: number }
  }
  error?: string
}

// Mock NGO API endpoints - replace with real NGO APIs
const NGO_APIS = [
  {
    name: "One Tree Planted",
    endpoint: "https://api.onetreeplanted.org/plant",
    regions: ["Amazon Rainforest, Brazil", "California, USA", "Indonesia"],
  },
  {
    name: "Trees for the Future",
    endpoint: "https://api.trees.org/plant",
    regions: ["Kenya", "Senegal", "Guatemala"],
  },
  {
    name: "Eden Reforestation",
    endpoint: "https://api.edenprojects.org/plant",
    regions: ["Madagascar", "Haiti", "Nepal"],
  },
]

const TREE_SPECIES = [
  "Oak",
  "Pine",
  "Mahogany",
  "Cedar",
  "Baobab",
  "Eucalyptus",
  "Maple",
  "Birch",
  "Mangrove",
  "Acacia",
  "Teak",
  "Bamboo",
]

export async function plantTree(userNullifier: string): Promise<PlantTreeReply> {
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Select random NGO and location
    const selectedNGO = NGO_APIS[Math.floor(Math.random() * NGO_APIS.length)]
    const selectedLocation = selectedNGO.regions[Math.floor(Math.random() * selectedNGO.regions.length)]
    const selectedSpecies = TREE_SPECIES[Math.floor(Math.random() * TREE_SPECIES.length)]

    // Generate unique tree ID
    const treeId = `TREE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Mock API call to NGO
    const mockApiCall = async () => {
      // In a real implementation, you would call the actual NGO API here
      // const response = await fetch(selectedNGO.endpoint, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${process.env.NGO_API_KEY}`
      //   },
      //   body: JSON.stringify({
      //     user_id: userNullifier,
      //     location: selectedLocation,
      //     species: selectedSpecies
      //   })
      // })

      // For demo purposes, we'll simulate a successful response
      return {
        success: true,
        tree_id: treeId,
        planted_date: new Date().toLocaleDateString(),
        coordinates: {
          lat: Math.random() * 180 - 90,
          lng: Math.random() * 360 - 180,
        },
      }
    }

    const apiResponse = await mockApiCall()

    if (apiResponse.success) {
      console.log(`🌱 Tree planted successfully via ${selectedNGO.name}`)

      return {
        success: true,
        tree: {
          id: treeId,
          location: selectedLocation,
          species: selectedSpecies,
          ngo: selectedNGO.name,
          plantedDate: apiResponse.planted_date,
          coordinates: apiResponse.coordinates,
        },
      }
    } else {
      throw new Error("NGO API call failed")
    }
  } catch (error) {
    console.error("❌ Tree planting failed:", error)
    return {
      success: false,
      error: "Failed to plant tree. Please try again.",
    }
  }
}
