import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { Database } from "@/lib/types/database"

export async function GET(request: Request, { params }: { params: { code: string } }) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    const { data: country, error } = await supabase.from("countries").select("*").eq("code", params.code).single()

    if (error) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 })
    }

    return NextResponse.json(country)
  } catch (error) {
    console.error("Error fetching country:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
