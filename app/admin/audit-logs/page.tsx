import { createServerSupabaseClient } from "@/lib/supabase/server-client"

// Mark as dynamic route
export const dynamic = "force-dynamic"

const AuditLogsPage = async () => {
  const supabase = createServerSupabaseClient()
  const { data: auditLogs, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching audit logs:", error)
    return <div>Error fetching audit logs</div>
  }

  return (
    <div>
      <h1>Audit Logs</h1>
      {auditLogs && auditLogs.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Action</th>
              <th>Table Name</th>
              <th>Record ID</th>
              <th>Old Values</th>
              <th>New Values</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.id}</td>
                <td>{log.user_id}</td>
                <td>{log.action}</td>
                <td>{log.table_name}</td>
                <td>{log.record_id}</td>
                <td>{JSON.stringify(log.old_values)}</td>
                <td>{JSON.stringify(log.new_values)}</td>
                <td>{log.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div>No audit logs found.</div>
      )}
    </div>
  )
}

export default AuditLogsPage
