"use client"

import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from "@worldcoin/minikit-js"
import { IDKitWidget, VerificationLevel as IDKitVerificationLevel, type ISuccessResult as IDKitSuccessResult } from "@worldcoin/idkit"
import { plantTree } from "./actions/plant-tree"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, TreePine, Users, Share2, Heart, Leaf, Globe, Sparkles } from "lucide-react"
import { TreePlantingCelebration } from "./components/tree-celebration"
import { SocialFeed } from "./components/social-feed"
import { UserProfile } from "./components/user-profile"

export default function TreePlanterApp() {
  const [isVerified, setIsVerified] = useState(false)
  const [isPlanting, setIsPlanting] = useState(false)
  const [treesPlanted, setTreesPlanted] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)
  const [userNullifier, setUserNullifier] = useState<string>("")
  const [lastPlantedTree, setLastPlantedTree] = useState<any>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isInWorldApp, setIsInWorldApp] = useState(false)
  const [showIDKitWidget, setShowIDKitWidget] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  // Load user data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem("treePlanter_userData")
    if (savedData) {
      const userData = JSON.parse(savedData)
      setIsVerified(userData.isVerified)
      setTreesPlanted(userData.treesPlanted || 0)
      setUserNullifier(userData.nullifier || "")
    }

    // Check if we're in World App environment
    const checkWorldAppEnvironment = () => {
      // Check for World App Mini App specific indicators
      const isInWorldApp = MiniKit.isInstalled() || 
                          window.location.href.includes('worldapp') ||
                          window.location.href.includes('world.co') ||
                          navigator.userAgent.includes('WorldApp') ||
                          window.location.href.includes('miniapp') ||
                          document.referrer.includes('worldapp') ||
                          window.parent !== window // Check if we're in an iframe (common for Mini Apps)
      
      setIsInWorldApp(isInWorldApp)
      
      // Log environment details for debugging
      console.log("Environment check:", {
        url: window.location.href,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        isInIframe: window.parent !== window,
        miniKitInstalled: MiniKit.isInstalled(),
        isInWorldApp: isInWorldApp
      })
    }

    checkWorldAppEnvironment()
  }, [])

  const saveUserData = (data: any) => {
    localStorage.setItem("treePlanter_userData", JSON.stringify(data))
  }

  // IDKit verification (fallback for external browser)
  const onIDKitSuccess = (result: IDKitSuccessResult) => {
    setIsVerified(true)
    setUserNullifier(result.nullifier_hash)
    const userData = {
      isVerified: true,
      nullifier: result.nullifier_hash,
      treesPlanted: treesPlanted,
    }
    saveUserData(userData)
    setShowIDKitWidget(false)
    
    // Show success message
    setShowSuccessMessage(true)
    setTimeout(() => {
      setShowSuccessMessage(false)
    }, 3000)
  }

  const handleIDKitProof = async (result: IDKitSuccessResult) => {
    console.log("Proof received from IDKit:\n", JSON.stringify(result))
    
    // Send proof to backend for verification
    const verifyResponse = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: result,
        action: "plant-tree",
        signal: undefined,
      }),
    })
    
    const verifyResponseJson = await verifyResponse.json()
    if (verifyResponseJson.status === 200) {
      console.log("Successful response from backend:\n", JSON.stringify(verifyResponseJson))
    } else {
      throw new Error(`Verification failed: ${verifyResponseJson.verifyRes?.detail || 'Unknown error'}`)
    }
  }

  // MiniKit verification for Mini App inside World App
  const handleVerify = async () => {
    setIsVerifying(true)

    try {
      // Try MiniKit first (for World App environment)
      if (MiniKit.isInstalled()) {
        console.log("Using MiniKit for verification inside World App...")
        
        const verifyPayload: VerifyCommandInput = {
          action: "plant-tree", // This should match your action ID from the Developer Portal
          verification_level: VerificationLevel.Orb,
        }

        const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)
        
        if (finalPayload.status === "error") {
          console.log("Error payload", finalPayload)
          alert("Verification failed. Please try again.")
          setIsVerifying(false)
          return
        }

        console.log("Verification successful, sending to backend...")
        // Send proof to backend for verification
        const verifyResponse = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: finalPayload as ISuccessResult,
            action: "plant-tree",
            signal: undefined,
          }),
        })
        
        const verifyResponseJson = await verifyResponse.json()
        if (verifyResponseJson.status === 200) {
          // Success! Update state and show success message
          setIsVerified(true)
          setUserNullifier(finalPayload.nullifier_hash)
          const userData = {
            isVerified: true,
            nullifier: finalPayload.nullifier_hash,
            treesPlanted: treesPlanted,
          }
          saveUserData(userData)
          
          // Show success message
          setShowSuccessMessage(true)
          setTimeout(() => {
            setShowSuccessMessage(false)
          }, 3000)
          
          console.log("Verification success! User can now plant trees.")
        } else {
          alert("Verification failed on backend. Please try again.")
        }
      } else {
        // Fallback: Open IDKitWidget for external browser
        console.log("MiniKit not available, opening IDKitWidget...")
        setShowIDKitWidget(true)
      }
    } catch (error) {
      console.error("Verification error:", error)
      // Fallback to IDKitWidget
      setShowIDKitWidget(true)
    } finally {
      setIsVerifying(false)
    }
  }

  const handlePlantTree = async () => {
    if (!isVerified) return

    setIsPlanting(true)
    try {
      const result = await plantTree(userNullifier)
      if (result.success) {
        const newTreeCount = treesPlanted + 1
        setTreesPlanted(newTreeCount)
        setLastPlantedTree(result.tree)
        setShowCelebration(true)

        // Save updated data
        const userData = {
          isVerified: true,
          nullifier: userNullifier,
          treesPlanted: newTreeCount,
        }
        saveUserData(userData)

        // Hide celebration after 4 seconds
        setTimeout(() => setShowCelebration(false), 4000)
      }
    } catch (error) {
      console.error("Failed to plant tree:", error)
    } finally {
      setIsPlanting(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "🌱 I just planted a tree!",
          text: `I've planted ${treesPlanted} trees to help fight climate change! Join me in making a difference. 🌍`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(
        `🌱 I just planted ${treesPlanted} trees to help fight climate change! Join me at ${window.location.href}`,
      )
      alert("Link copied to clipboard!")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Celebration Overlay */}
      {showCelebration && (
        <TreePlantingCelebration
          tree={lastPlantedTree}
          totalTrees={treesPlanted}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {/* Success Message Overlay */}
      {showSuccessMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 mx-4 text-center max-w-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Successful!</h3>
            <p className="text-gray-600 mb-4">You can now plant trees and help fight climate change.</p>
            <Button 
              onClick={() => setShowSuccessMessage(false)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-green-200 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <TreePine className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">TreePlanter</h1>
                <p className="text-xs text-green-600">Plant trees, save Earth</p>
              </div>
            </div>
            {isVerified && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified Human
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-20">
        {!isVerified ? (
          /* Verification Screen */
          <div className="pt-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Globe className="w-10 h-10 text-green-600" />
              </div>
                              <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to HumaniTree</h2>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Verify your humanity with World ID and start planting trees to fight climate change. Every verified
                    human can plant one tree per day! 🌱
                  </p>
                </div>
            </div>

            <Card className="border-2 border-green-200 bg-white/50">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  Verify with World ID
                </CardTitle>
                <CardDescription className="text-sm">
                  Prove you're a unique human to start planting trees
                </CardDescription>
              </CardHeader>
                                        <CardContent>
                <Button 
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-medium"
                  size="lg"
                >
                  {isVerifying ? (
                    <>
                      <Leaf className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Verify & Plant a Tree
                    </>
                  )}
                </Button>
                
                {/* IDKitWidget fallback for external browser */}
                {showIDKitWidget && (
                  <IDKitWidget
                    app_id={(process.env.NEXT_PUBLIC_APP_ID || "app_staging_123456789abcdef") as `app_${string}`}
                    action="plant-tree"
                    onSuccess={onIDKitSuccess}
                    handleVerify={handleIDKitProof}
                    verification_level={IDKitVerificationLevel.Orb}
                    autoClose={true}
                    bridge_url="https://bridge.worldcoin.org"
                  >
                    {({ open }) => (
                      <div className="mt-4">
                        <Button 
                          onClick={open}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-medium"
                          size="lg"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Verify with World ID (External)
                        </Button>
                      </div>
                    )}
                  </IDKitWidget>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/50 rounded-lg p-3">
                <div className="text-2xl mb-1">🌍</div>
                <div className="text-xs font-medium text-gray-700">Fight Climate Change</div>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <div className="text-2xl mb-1">🤝</div>
                <div className="text-xs font-medium text-gray-700">Support NGOs</div>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <div className="text-2xl mb-1">🌱</div>
                <div className="text-xs font-medium text-gray-700">Real Impact</div>
              </div>
            </div>
          </div>
        ) : (
          /* Main App Screen */
          <div className="pt-6 space-y-6">
            {/* User Profile Section */}
            <UserProfile treesPlanted={treesPlanted} nullifier={userNullifier} />

            {/* Tree Planting Action */}
            <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
              <CardContent className="p-6 text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                    <TreePine className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Plant Your Daily Tree</h3>
                    <p className="text-green-100 text-sm">
                      Partner with verified NGOs to plant real trees and make a lasting impact
                    </p>
                  </div>
                  <Button
                    onClick={handlePlantTree}
                    disabled={isPlanting}
                    className="w-full bg-white text-green-600 hover:bg-green-50 font-semibold py-3"
                    size="lg"
                  >
                    {isPlanting ? (
                      <>
                        <Leaf className="w-5 h-5 mr-2 animate-spin" />
                        Planting Tree...
                      </>
                    ) : (
                      <>
                        <TreePine className="w-5 h-5 mr-2" />
                        Plant Tree Today
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Impact Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white/70">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{treesPlanted}</div>
                  <div className="text-sm text-gray-600">Trees Planted</div>
                </CardContent>
              </Card>
              <Card className="bg-white/70">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{Math.round(treesPlanted * 22)}</div>
                  <div className="text-sm text-gray-600">kg CO₂ Offset</div>
                </CardContent>
              </Card>
            </div>

            {/* Share Achievement */}
            {treesPlanted > 0 && (
              <Card className="bg-white/70">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">Share Your Impact</h4>
                      <p className="text-sm text-gray-600">Inspire others to plant trees</p>
                    </div>
                    <Button onClick={handleShare} variant="outline" size="sm">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Feed */}
            <SocialFeed />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      {isVerified && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <div className="max-w-md mx-auto px-4 py-2">
            <div className="flex justify-around">
              <button className="flex flex-col items-center py-2 px-3 text-green-600">
                <TreePine className="w-5 h-5" />
                <span className="text-xs mt-1">Plant</span>
              </button>
              <button className="flex flex-col items-center py-2 px-3 text-gray-400">
                <Users className="w-5 h-5" />
                <span className="text-xs mt-1">Community</span>
              </button>
              <button className="flex flex-col items-center py-2 px-3 text-gray-400">
                <Heart className="w-5 h-5" />
                <span className="text-xs mt-1">Impact</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
