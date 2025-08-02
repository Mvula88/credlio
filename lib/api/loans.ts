import type { LoanApplicationInput, LoanOfferInput } from "@/lib/validations/loan"

const API_BASE = "/api"

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export class LoansAPI {
  static async getApplications(params?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<ApiResponse<any>> {
    try {
      const queryParams = new URLSearchParams()
      if (params?.status) queryParams.append("status", params.status)
      if (params?.limit) queryParams.append("limit", params.limit.toString())
      if (params?.offset) queryParams.append("offset", params.offset.toString())

      const response = await fetch(`${API_BASE}/loans?${queryParams}`)
      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || "Failed to fetch applications" }
      }

      return { data }
    } catch (error) {
      console.error("API error:", error)
      return { error: "Network error" }
    }
  }

  static async createApplication(application: LoanApplicationInput): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE}/loans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(application),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || "Failed to create application" }
      }

      return { data: data.application }
    } catch (error) {
      console.error("API error:", error)
      return { error: "Network error" }
    }
  }

  static async getApplication(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE}/loans/${id}`)
      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || "Failed to fetch application" }
      }

      return { data }
    } catch (error) {
      console.error("API error:", error)
      return { error: "Network error" }
    }
  }

  static async updateApplication(id: string, updates: any): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE}/loans/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || "Failed to update application" }
      }

      return { data }
    } catch (error) {
      console.error("API error:", error)
      return { error: "Network error" }
    }
  }

  static async createOffer(applicationId: string, offer: LoanOfferInput): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE}/loans/${applicationId}/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(offer),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || "Failed to create offer" }
      }

      return { data: data.offer }
    } catch (error) {
      console.error("API error:", error)
      return { error: "Network error" }
    }
  }

  static async respondToOffer(offerId: string, accept: boolean): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE}/offers/${offerId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accept }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || "Failed to respond to offer" }
      }

      return { data }
    } catch (error) {
      console.error("API error:", error)
      return { error: "Network error" }
    }
  }
}