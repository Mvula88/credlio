"use client"

import { useState, useEffect } from "react"
import { Heart, HeartOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@supabase/supabase-js"
import { toast } from "@/hooks/use-toast"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface WatchlistButtonProps {
  borrowerId: string
  borrowerName?: string
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "ghost"
}

export function WatchlistButton({
  borrowerId,
  borrowerName = "borrower",
  size = "default",
  variant = "outline",
}: WatchlistButtonProps) {
  const [isWatched, setIsWatched] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    checkWatchlistStatus()
  }, [borrowerId])

  const checkWatchlistStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("watchlist")
        .select("id")
        .eq("lender_id", user.id)
        .eq("borrower_id", borrowerId)
        .single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      setIsWatched(!!data)
    } catch (error) {
      console.error("Error checking watchlist status:", error)
      toast({
        title: "Error",
        description: "Failed to check watchlist status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleWatchlist = async () => {
    try {
      setUpdating(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to manage your watchlist",
          variant: "destructive",
        })
        return
      }

      if (isWatched) {
        // Remove from watchlist
        const { error } = await supabase
          .from("watchlist")
          .delete()
          .eq("lender_id", user.id)
          .eq("borrower_id", borrowerId)

        if (error) throw error

        setIsWatched(false)
        toast({
          title: "Removed from watchlist",
          description: `${borrowerName} has been removed from your watchlist`,
        })
      } else {
        // Add to watchlist
        const { error } = await supabase.from("watchlist").insert({
          lender_id: user.id,
          borrower_id: borrowerId,
          created_at: new Date().toISOString(),
        })

        if (error) throw error

        setIsWatched(true)
        toast({
          title: "Added to watchlist",
          description: `${borrowerName} has been added to your watchlist`,
        })
      }
    } catch (error) {
      console.error("Error updating watchlist:", error)
      toast({
        title: "Error",
        description: "Failed to update watchlist",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleWatchlist}
      disabled={updating}
      className={isWatched ? "text-red-600 hover:text-red-700" : ""}
    >
      {updating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isWatched ? (
        <>
          <Heart className="h-4 w-4 mr-2 fill-current" />
          Watching
        </>
      ) : (
        <>
          <HeartOff className="h-4 w-4 mr-2" />
          Watch
        </>
      )}
    </Button>
  )
}
