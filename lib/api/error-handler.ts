import { NextResponse } from "next/server"

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code?: string
  ) {
    super(message)
    this.name = "APIError"
  }
}

export function handleAPIError(error: unknown) {
  console.error("API Error:", error)

  if (error instanceof APIError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}

export function validateAuth(user: any, requiredRole?: string) {
  if (!user) {
    throw new APIError("Unauthorized", 401)
  }

  if (requiredRole && user.role !== requiredRole) {
    throw new APIError("Forbidden", 403)
  }
}
