import { createServerSupabaseClient } from "@/lib/supabase/server-client"

const RequestDetailPage = async ({ params }: { params: { requestId: string } }) => {
  const supabase = createServerSupabaseClient()
  const { data: request, error } = await supabase.from("requests").select("*").eq("id", params.requestId).single()

  if (error) {
    console.error("Error fetching request:", error)
    return <div>Error: Could not load request details.</div>
  }

  if (!request) {
    return <div>Request not found.</div>
  }

  return (
    <div>
      <h1>Request Details</h1>
      <p>Request ID: {request.id}</p>
      <p>Amount: {request.amount}</p>
      {/* Display other request details here */}
    </div>
  )
}

export default RequestDetailPage
