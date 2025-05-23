"use client"

import { useState } from "react"
import Image from "next/image"
import { useWallet } from "./wallet-provider"
import { mintChildNFTs, mintSubscriptionNFT } from "@/lib/mint-subscription-nft"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import supabase from "@/lib/supabase/client"
import { Button } from "./ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, PlusCircle, X, ImageIcon, Sparkles, CreditCard, Clock, Link, Users, Captions, ClockAlert } from "lucide-react"
import { cn } from "@/lib/utils"

interface SharedUser {
  name: string
  email: string
  wallet_address?: string
}

export default function SubscriptionForm() {
  const wallet = useWallet()

  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("")
  const [recurringDate, setRecurringDate] = useState("")
  const [proof, setProof] = useState("")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [txSignature, setTxSignature] = useState<any>(null)
  const [mintAddress, setMintAddress] = useState("")
  const [error, setError] = useState("")
  const [staticImageUri, setStaticImageUri] = useState(
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2zbGvCe-Ihgi4DETbEND8RPM0xX40AOI84Q&s",
  )
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [imagePrompt, setImagePrompt] = useState("")
  const [imageError, setImageError] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)

  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([])
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserWallet, setNewUserWallet] = useState("")
  const [childNfts, setChildNfts] = useState<any[]>([])


  const formatDateString = (date: Date | undefined) => {
    if (!date) return ""
    return format(date, "dd/MM/yyyy")
  }

  const handleAddUser = async () => {
    if (!newUserName.trim()) return

    const newUser = {
      name: newUserName.trim(),
      email: newUserEmail.trim() || "",
      wallet_address: newUserWallet.trim() || undefined,
    }

    // Add user to local state
    setSharedUsers([...sharedUsers, newUser])

    // Clear form fields
    setNewUserName("")
    setNewUserEmail("")
    setNewUserWallet("")
  }

  // Remove a shared user
  const handleRemoveUser = (index: number) => {
    const updatedUsers = [...sharedUsers]
    updatedUsers.splice(index, 1)
    setSharedUsers(updatedUsers)
  }

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      setImageError("Please enter a description for the image")
      return
    }

    try {
      setIsGeneratingImage(true)
      setImageError("")

      console.log("Sending image generation request with prompt:", imagePrompt)

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_API_KEY ?? "",
        },
        body: JSON.stringify({ prompt: imagePrompt }),
      })

      // First, log the raw response for debugging
      const responseText = await response.text()
      console.log("Raw response from API:", responseText)

      // Try to parse the response as JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error("Failed to parse JSON response:", e)
        throw new Error("Invalid response format from server")
      }

      console.log("Parsed response data:", data)

      // Check if we got an error
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image")
      }

      // Verify we have a valid image URL
      if (data.imageUrl && typeof data.imageUrl === "string" && data.imageUrl.trim() !== "") {
        console.log("Successfully received image URL:", data.imageUrl)
        setStaticImageUri(data.imageUrl)
      } else {
        console.error("Invalid image URL received:", data)
        throw new Error("Received invalid image URL from generation service")
      }
    } catch (error: any) {
      console.error("Error generating image:", error)
      setImageError(error.message || "Failed to generate image")
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!startDate || !endDate) {
      setError("Start and end dates are required")
      setLoading(false)
      return
    }

    if (endDate < startDate) {
      setError("End date cannot be before start date")
      setLoading(false)
      return
    }

    try {
      // Use formatted dates for API calls
      const formattedStartDate = formatDateString(startDate)
      const formattedEndDate = formatDateString(endDate)

      let imageBlob
      try {
        // Fetch the image from the URL
        const imageResponse = await fetch(staticImageUri)

        if (!imageResponse.ok) {
          throw new Error("Failed to fetch image")
        }

        imageBlob = await imageResponse.blob()
      } catch (imageError) {
        console.error("Error fetching image:", imageError)
        throw new Error("Failed to process image. Please try again or use a different image.")
      }

      // Create a file from the blob
      const imageFile = new File([imageBlob], "subscription-image.jpg", { type: imageBlob.type })

      // Upload to Pinata via your API
      const imageData = new FormData()
      imageData.append("file", imageFile)

      const imageUploadResponse = await fetch("/api/files", {
        method: "POST",
        headers: {
          "x-api-key": process.env.NEXT_PUBLIC_API_KEY ?? "",
        },
        body: imageData,
      })

      if (!imageUploadResponse.ok) {
        const errorData = await imageUploadResponse.json()
        throw new Error(errorData.error || "Failed to upload image to Pinata")
      }

      const uploadedImageData = await imageUploadResponse.json()

      console.log("Uploaded image data:", uploadedImageData)
      if (!uploadedImageData.fileUrl) {
        throw new Error("Invalid response from image upload endpoint")
      }

      const imageUri = uploadedImageData.fileUrl // Make sure this matches your API's response structure
      setUploadingImage(false)

      const sharedUserDbRecords = []

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user && sharedUsers.length > 0) {
        for (const user of sharedUsers) {
          try {
            const { data, error } = await supabase
              .from("payment_users")
              .insert({
                user_name: user.name,
                email: user.email || null,
                wallet_address: user.wallet_address || null,
                owner_id: session.user.id, // Link to the current user
              })
              .select()

            if (error) throw error

            if (data && data.length > 0) {
              sharedUserDbRecords.push(data[0])
            }
          } catch (error) {
            console.error("Error adding user to Supabase:", error)
            // Continue with others even if one fails
          }
        }
      }

      // Then create and upload the metadata
      const metadataResponse = await fetch("/api/metadata-to-pinata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_API_KEY ?? "", // Add this line
        },
        body: JSON.stringify({
          title,
          description: `${title}: ${price}/mo (${formattedStartDate} to ${formattedEndDate})`,
          imageUri,
          price,
          recurringDate,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          proof,
          shared_users: sharedUsers.map((user) => ({
            name: user.name,
            wallet_address: user.wallet_address || "None",
          })),
        }),
      })

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json()
        throw new Error(errorData.error || "Failed to upload metadata")
      }

      const { metadataUri } = await metadataResponse.json()

      const result = await mintSubscriptionNFT({
        wallet,
        title,
        description: `${title}: ${price}/mo (${formattedStartDate} to ${formattedEndDate})`,
        metadataUri: metadataUri,
      })

      const signature = result.signature
      const mintAddress = result.mintAddress

      // If there are shared users, mint child NFTs for them
    type ChildNft = {
      mintAddress: string
      userId: string
      userName: string
    }
    let childNfts: ChildNft[] = []
    if (sharedUserDbRecords.length > 0) {
      const { results, errors } = await mintChildNFTs({
        wallet,
        parentMintAddress: mintAddress,
        title,
        metadataUri,
        sharedUsers: sharedUserDbRecords
      })

      // Store the results
      setChildNfts(results)

      // Handle any errors from minting child NFTs
      if (errors.length > 0) {
        console.error("Some child NFTs failed to mint:", errors)
      }
    }

      // Store the mint result in Supabase
      if (mintAddress) {
        try {
          if (session?.user) {
            // Get current NFT addresses from user profile
            const { data: userData } = await supabase
              .from("user")
              .select("nft_address, metadata_uris, subscription_shared_users")
              .eq("id", session.user.id)
              .single()

            const nftRelationships = childNfts.map(childNft => ({
            parent_mint_address: mintAddress,
            child_mint_address: childNft.mintAddress,
            user_id: childNft.userId,
            user_name: childNft.userName
          }))

            // Add the new NFT to the array
          const updatedNftAddresses = Array.isArray(userData?.nft_address)
            ? [...userData.nft_address, mintAddress, ...childNfts.map(nft => nft.mintAddress)]
            : [mintAddress, ...childNfts.map(nft => nft.mintAddress)]

          const updatedMetadataUris = Array.isArray(userData?.metadata_uris)
            ? [...userData.metadata_uris, metadataUri]
            : [metadataUri]

            // For shared users, handle both the case where it doesn't exist and where it's an empty object
            let currentSharedUsers = []
            if (userData?.subscription_shared_users) {
              if (typeof userData.subscription_shared_users === "string") {
                try {
                  currentSharedUsers = JSON.parse(userData.subscription_shared_users)
                } catch (e) {
                  console.error("Error parsing shared users:", e)
                  currentSharedUsers = []
                }
              } else {
                currentSharedUsers = userData.subscription_shared_users
              }
            }

            // Ensure currentSharedUsers is an array
            if (!Array.isArray(currentSharedUsers)) {
              currentSharedUsers = []
            }

            // Create a new array element for this subscription
            const sharedUserIds = sharedUserDbRecords.map((u: any) => u.id)

            const newSharedUserEntry = {
            mint_address: mintAddress,
            user_ids: sharedUserIds,
            metadata_uri: metadataUri,
            child_nfts: childNfts.map(nft => ({
              mint_address: nft.mintAddress,
              user_id: nft.userId
            }))
          }

            // Add to the existing array
            const updatedSharedUsers = [...currentSharedUsers, newSharedUserEntry]

            console.log("Preparing update with array structure:", {
              nft_address: updatedNftAddresses,
              metadata_uris: updatedMetadataUris,
              subscription_shared_users: updatedSharedUsers,
            })

            // Update the user profile
            const { data: updateResult, error: updateError } = await supabase
              .from("user")
              .update({
                nft_address: updatedNftAddresses,
                metadata_uris: updatedMetadataUris,
                subscription_shared_users: updatedSharedUsers,
                updated_at: new Date().toISOString(),
              })
              .eq("id", session.user.id)

            if (nftRelationships.length > 0) {
            const { error: relError } = await supabase
              .from("nft_relationships")
              .insert(nftRelationships)

              if (relError) {
              console.error("Error storing NFT relationships:", relError)
            }
          }

            if (updateError) {
              console.error("Error updating user:", updateError)
              throw updateError
            }

            console.log("Update result:", updateResult)
          }
        } catch (error) {
          console.error("Error updating user profile with NFT:", error)
          // Continue even if this fails
        }
      }

      if (mintAddress && session?.user && sharedUsers.length > 0) {
        // Get the current month and year for initial payment record
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear().toString()
        const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, "0")
        const paymentDate = `${currentYear}-${currentMonth}`

        console.log("Creating initial payment records for shared users")

        for (const user of sharedUserDbRecords) {
          try {
            // Create payment record with unpaid status
            const { data: paymentRecord, error: paymentError } = await supabase.from("payment_records").insert({
              shared_user_id: user.id,
              payment_date: paymentDate,
              payment_status: false, // Initial status is unpaid
              payment_amount: typeof price === "number" ? price : Number(price) || 0,
              paid_date: null,
              // Add subscription details for reference
              subscription_title: title,
              subscription_image: imageUri,
              metadata_uri: metadataUri,
              mint_address: mintAddress,
              user_name: user.user_name,
              user_email: user.email || null,
              user_wallet: user.wallet_address || null,
            })

            if (paymentError) {
              console.error("Error creating payment record:", paymentError)
            } else {
              console.log("Created payment record for user:", user.user_name)
            }
          } catch (recordError) {
            console.error("Failed to create payment record:", recordError)
          }
        }
      }

      setTxSignature(signature)
      setMintAddress(mintAddress)
    } catch (error: any) {
      console.error("Minting failed", error)
      setError(error.message || "Failed to mint NFT. Please try again.")
    } finally {
      setLoading(false)
      setUploadingImage(false)
    }
  }

  return (
    <div className="relative z-10">
      {/* Enhanced background effect */}
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-purple-800/20 via-indigo-800/20 to-cyan-900/20 rounded-2xl blur-xl -z-10"></div>

      <Card className="w-full max-w-3xl bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl rounded-xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/10 via-cyan-800/10 to-slate-900/10 -z-10"></div>

        <CardHeader className="relative border-b border-white/10 pb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-600/20 to-cyan-600/20 rounded-full blur-2xl -z-10"></div>
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-indigo-300 to-cyan-300">
            Create Subscription NFT
          </CardTitle>
          <CardDescription className="text-slate-300">
            Mint an NFT to track your subscription details and share costs with others
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* NFT Image Preview and Generation */}
            <div className="flex-shrink-0 space-y-4">
              <div className="relative w-48 h-48 rounded-lg overflow-hidden border border-white/20 shadow-lg group transition-all duration-300 hover:scale-105 mx-auto md:mx-0">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-cyan-600/30 group-hover:opacity-70 transition-opacity"></div>
                {isGeneratingImage ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/70 backdrop-blur-sm">
                    <div className="animate-spin h-10 w-10 border-4 border-purple-500 rounded-full border-t-transparent"></div>
                    <span className="text-sm text-white mt-3">Generating Image...</span>
                  </div>
                ) : (
                  <Image
                    src={staticImageUri || "/placeholder.svg"}
                    alt="Subscription NFT Image"
                    width={192}
                    height={192}
                    className="object-cover w-full h-full"
                    priority
                  />
                )}
              </div>

              {/* Image Generation */}
              <div className="space-y-2 bg-slate-800/30 backdrop-blur-sm rounded-lg p-4 border border-white/5">
                <div className="flex items-center text-sm font-medium text-purple-300 mb-2">
                  <Sparkles className="h-4 w-4 mr-2" />
                  <span>Generate NFT Image</span>
                </div>
                <div className="space-y-2">
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="w-full p-3 bg-slate-800/70 backdrop-blur-sm rounded-md border border-white/10 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-colors text-white placeholder-slate-400 text-sm align-top min-h-[80px]"
                    placeholder="Describe your image... (e.g. Netflix logo with forest background)"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !imagePrompt.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white py-2 px-4 rounded-md transition-all disabled:opacity-50 text-sm flex-shrink-0 cursor-pointer flex items-center justify-center"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {isGeneratingImage ? "Generating..." : "Generate Image"}
                  </button>
                </div>
                {imageError && (
                  <p className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-500/20">
                    {imageError}
                  </p>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="flex-grow space-y-5 text-white">
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-purple-300">
                  <Captions className="h-4 w-4 mr-2" />
                  Subscription Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 bg-slate-800/50 backdrop-blur-sm rounded-md border border-white/10 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-colors text-white placeholder-slate-400"
                  required
                  placeholder="Netflix, Spotify, etc."
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-purple-300">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Price (per month)
                </label>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full p-3 bg-slate-800/50 backdrop-blur-sm rounded-md border border-white/10 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-colors text-white placeholder-slate-400"
                  required
                  placeholder="15.99"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-purple-300">
                    <Clock className="h-4 w-4 mr-2" />
                    Start Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-slate-800/50 backdrop-blur-sm border-white/10 hover:bg-slate-700/50 hover:text-white focus:border-purple-400 p-3 h-auto",
                          !startDate && "text-slate-400",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-slate-800 border border-slate-700" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="bg-slate-800 text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-purple-300">
                    <Clock className="h-4 w-4 mr-2" />
                    End Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-slate-800/50 backdrop-blur-sm border-white/10 hover:bg-slate-700/50 hover:text-white focus:border-purple-400 p-3 h-auto",
                          !endDate && "text-slate-400",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Pick end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-slate-800 border border-slate-700" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        fromDate={startDate} // Prevent selecting dates before start date
                        className="bg-slate-800 text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-purple-300">
                  <ClockAlert className="h-4 w-4 mr-2" />
                  Payment Due Date (day of month)
                </label>
                <input
                  value={recurringDate}
                  onChange={(e) => setRecurringDate(e.target.value)}
                  className="w-full p-3 bg-slate-800/50 backdrop-blur-sm rounded-md border border-white/10 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-colors text-white placeholder-slate-400"
                  required
                  placeholder="15"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-purple-300">
                  <Link className="h-4 w-4 mr-2" />
                  Proof of Subscription
                </label>
                <input
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  className="w-full p-3 bg-slate-800/50 backdrop-blur-sm rounded-md border border-white/10 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-colors text-white placeholder-slate-400"
                  placeholder="Link of Proof (Google Drive, Dropbox, etc.)"
                />
              </div>

              <div className="space-y-3 border-t border-white/10 pt-5 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300">
                    <Users className="h-5 w-5 mr-2 text-purple-300" />
                    <span>Shared Users</span>
                  </div>
                  <div className="text-xs px-2 py-1 bg-purple-900/30 text-purple-300 rounded-full border border-purple-500/20">
                    {sharedUsers.length} users
                  </div>
                </div>
                <p className="text-xs text-slate-400">Add people who share this subscription cost with you</p>

                {/* List of current shared users */}
                {sharedUsers.length > 0 && (
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
                    {sharedUsers.map((user, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-slate-800/70 rounded-md border border-white/5 hover:bg-slate-800/90 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center text-xs text-slate-400">
                            {user.email && <p className="mr-3">{user.email}</p>}
                            {user.wallet_address && (
                              <p className="font-mono">
                                Wallet: {user.wallet_address.substring(0, 4)}...
                                {user.wallet_address.substring(user.wallet_address.length - 4)}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(index)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors rounded-full"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form to add new shared user */}
                <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg p-4 border border-white/5">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="p-3 bg-slate-800/70 backdrop-blur-sm rounded-md border border-white/10 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-colors text-white placeholder-slate-400"
                      placeholder="Name (required)"
                    />
                    <input
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="p-3 bg-slate-800/70 backdrop-blur-sm rounded-md border border-white/10 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-colors text-white placeholder-slate-400"
                      placeholder="Email (optional)"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newUserWallet}
                      onChange={(e) => setNewUserWallet(e.target.value)}
                      className="flex-grow p-3 bg-slate-800/70 backdrop-blur-sm rounded-md border border-white/10 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-colors text-white placeholder-slate-400"
                      placeholder="Wallet address (optional)"
                    />
                    <button
                      type="button"
                      onClick={handleAddUser}
                      disabled={!newUserName.trim()}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-800/50 disabled:to-indigo-800/50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md transition-colors flex items-center whitespace-nowrap"
                    >
                      <PlusCircle size={16} className="mr-1" />
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/30 backdrop-blur-sm border border-red-500/50 rounded-md p-4 text-red-200 animate-pulse">
                  <p>{error}</p>
                  {error.includes("enough SOL") && (
                    <p className="mt-2">
                      You can get free devnet SOL from{" "}
                      <a
                        href="https://faucet.solana.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-300 hover:text-blue-200 transition-colors"
                      >
                        Solana Faucet
                      </a>
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 w-full p-3 rounded-md text-white font-medium hover:from-purple-500 hover:to-cyan-500 transition-all duration-300 disabled:opacity-70 transform hover:-translate-y-1 shadow-lg cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Minting NFT...</span>
                  </div>
                ) : (
                  "Mint Subscription NFT"
                )}
              </button>
            </div>
          </div>
        </CardContent>

{txSignature && (
  <CardFooter className="flex flex-col">
    <div className="text-cyan-300 space-y-3 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 backdrop-blur-sm border border-cyan-500/30 rounded-md p-5 w-full">
      <div className="flex items-center space-x-2">
        <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-cyan-300"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="font-medium text-lg">Success! Your subscription NFT has been created.</p>
      </div>

      <div className="space-y-2 pl-10">
        <p className="flex items-center">
          <span className="text-slate-300 mr-2">Transaction:</span>
          <a
            href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-300 hover:text-indigo-200 transition-colors underline flex items-center"
          >
            View on Solana Explorer
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </p>

        {mintAddress && (
          <div>
            <p className="flex items-center">
              <span className="text-slate-300 mr-2">Parent NFT:</span>
              <a
                href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-300 hover:text-indigo-200 transition-colors underline flex items-center"
              >
                View Main NFT on Solana Explorer
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </p>
            
            {/* Display child NFTs if any */}
            {childNfts.length > 0 && (
              <div className="mt-2">
                <p className="text-slate-300 mb-1">Child NFTs:</p>
                <div className="space-y-1 ml-4 text-sm">
                  {childNfts.map((nft, index) => (
                    <p key={index} className="flex items-center">
                      <span className="text-slate-400 mr-2">{nft.userName}:</span>
                      <a
                        href={`https://explorer.solana.com/address/${nft.mintAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-300 hover:text-indigo-200 transition-colors underline flex items-center"
                      >
                        View NFT
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 ml-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

              <Button
                variant="default"
                className="bg-gradient-to-r from-purple-600 to-cyan-600 w-full p-3 rounded-md text-white font-medium hover:from-purple-500 hover:to-cyan-500 transition-all duration-300 transform hover:-translate-y-1 shadow-lg mt-4 cursor-pointer"
                onClick={() => (window.location.href = "/profile")}
              >
                View Profile
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
