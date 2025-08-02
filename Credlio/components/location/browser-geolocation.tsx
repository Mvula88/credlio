"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, Shield, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface BrowserGeolocationProps {
  onLocationReceived?: (location: GeolocationPosition) => void
  required?: boolean
  showStatus?: boolean
}

export function BrowserGeolocation({ 
  onLocationReceived, 
  required = false,
  showStatus = true 
}: BrowserGeolocationProps) {
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle')
  const [locationError, setLocationError] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null)

  // Check if geolocation is supported
  const isGeolocationSupported = typeof window !== 'undefined' && 'geolocation' in navigator

  const requestLocation = async () => {
    if (!isGeolocationSupported) {
      setLocationError("Geolocation is not supported by your browser")
      setLocationStatus('error')
      return
    }

    setLocationStatus('requesting')
    setLocationError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        )
      })

      setCurrentLocation(position)
      setLocationStatus('granted')
      
      if (onLocationReceived) {
        onLocationReceived(position)
      }

      toast.success("Location verified", {
        description: "Your location has been successfully verified for security."
      })
    } catch (error: any) {
      console.error('Geolocation error:', error)
      
      let errorMessage = "Unable to get your location"
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location permission denied. Please enable location access in your browser settings."
          setLocationStatus('denied')
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable. Please try again."
          setLocationStatus('error')
          break
        case error.TIMEOUT:
          errorMessage = "Location request timed out. Please try again."
          setLocationStatus('error')
          break
        default:
          setLocationStatus('error')
      }
      
      setLocationError(errorMessage)
      toast.error("Location verification failed", {
        description: errorMessage
      })
    }
  }

  // Check permission status on mount
  useEffect(() => {
    if (isGeolocationSupported && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          setLocationStatus('granted')
          // Auto-request location if already granted
          if (required) {
            requestLocation()
          }
        } else if (result.state === 'denied') {
          setLocationStatus('denied')
          setLocationError("Location access is blocked. Please enable it in your browser settings.")
        }
      }).catch(console.error)
    }
  }, [isGeolocationSupported, required])

  if (!isGeolocationSupported) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your browser doesn't support location services. Please use a modern browser for enhanced security.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {showStatus && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-start space-x-3">
            <Shield className="mt-0.5 h-5 w-5 text-blue-500" />
            <div className="flex-1">
              <h3 className="font-medium">Location Verification</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We use your browser location to verify you're accessing your account from your registered country.
                This helps protect against unauthorized access.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center space-x-3">
          <MapPin className={
            locationStatus === 'granted' ? 'h-5 w-5 text-green-500' :
            locationStatus === 'denied' ? 'h-5 w-5 text-red-500' :
            'h-5 w-5 text-gray-400'
          } />
          <div>
            <p className="font-medium">
              {locationStatus === 'granted' ? 'Location Verified' :
               locationStatus === 'denied' ? 'Location Blocked' :
               locationStatus === 'requesting' ? 'Requesting Location...' :
               'Location Not Verified'}
            </p>
            {currentLocation && locationStatus === 'granted' && (
              <p className="text-xs text-muted-foreground">
                Accuracy: ±{Math.round(currentLocation.coords.accuracy)}m
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={requestLocation}
          disabled={locationStatus === 'requesting'}
          variant={locationStatus === 'granted' ? 'outline' : 'default'}
          size="sm"
        >
          {locationStatus === 'requesting' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : locationStatus === 'granted' ? (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Re-verify
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Verify Location
            </>
          )}
        </Button>
      </div>

      {locationError && (
        <Alert variant={locationStatus === 'denied' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{locationError}</AlertDescription>
        </Alert>
      )}

      {required && locationStatus === 'denied' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Action Required:</strong> Location verification is required for enhanced security.
            Please enable location access in your browser:
            <ol className="mt-2 list-decimal list-inside text-sm">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find "Location" in the permissions</li>
              <li>Change it to "Allow"</li>
              <li>Refresh this page</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Hook for using browser geolocation in other components
export function useBrowserGeolocation() {
  const [location, setLocation] = useState<GeolocationPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const getLocation = async (): Promise<GeolocationPosition | null> => {
    if (!('geolocation' in navigator)) {
      setError("Geolocation not supported")
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })

      setLocation(position)
      return position
    } catch (err: any) {
      const errorMessage = err.code === 1 ? "Permission denied" : "Location error"
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { location, error, loading, getLocation }
}