import { useState, useCallback } from "react"
import { toast } from "sonner"

interface ErrorHandlerOptions {
  showToast?: boolean
  fallbackMessage?: string
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const { showToast = true, fallbackMessage = "An unexpected error occurred" } = options
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleError = useCallback(
    (error: unknown) => {
      let message = fallbackMessage
      
      if (error instanceof Error) {
        message = error.message
      } else if (typeof error === "string") {
        message = error
      } else if (error && typeof error === "object" && "message" in error) {
        message = String(error.message)
      }

      // Log the full error for debugging
      console.error("Error handled:", error)

      setError(message)

      if (showToast) {
        toast.error(message)
      }

      return message
    },
    [fallbackMessage, showToast]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const execute = useCallback(
    async <T,>(asyncFunction: () => Promise<T>): Promise<T | null> => {
      try {
        setIsLoading(true)
        clearError()
        const result = await asyncFunction()
        return result
      } catch (error) {
        handleError(error)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [clearError, handleError]
  )

  return {
    error,
    isLoading,
    handleError,
    clearError,
    execute,
  }
}