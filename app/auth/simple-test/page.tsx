"use client"

import { useState } from "react"

export default function SimpleTestPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    setLoading(true)
    setResult("Testing...")
    
    try {
      // Simple fetch to test auth
      const response = await fetch("/api/test-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      
      const data = await response.json()
      
      // Display result
      if (data.tests?.signIn?.success) {
        setResult(`✅ SUCCESS! Username: ${data.username}, Email: ${data.tests.signIn.user?.email}`)
      } else {
        setResult(`❌ FAILED: ${data.tests?.signIn?.error || data.error || "Unknown error"}`)
      }
      
      console.log("Full result:", data)
    } catch (error: any) {
      setResult(`ERROR: ${error.message}`)
    }
    
    setLoading(false)
  }

  return (
    <div style={{ padding: "40px", maxWidth: "500px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>Simple Auth Test</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px"
          }}
          placeholder="Your username"
        />
      </div>
      
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px"
          }}
          placeholder="Your password"
        />
      </div>
      
      <button
        onClick={handleTest}
        disabled={loading || !username || !password}
        style={{
          padding: "10px 20px",
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Testing..." : "Test Login"}
      </button>
      
      <div style={{
        marginTop: "20px",
        padding: "15px",
        backgroundColor: "#f5f5f5",
        borderRadius: "4px",
        whiteSpace: "pre-wrap"
      }}>
        <strong>Result:</strong><br />
        {result || "Enter username and password, then click Test Login"}
      </div>
      
      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        <p>This page tests if your username/password work with Supabase.</p>
        <p>Check the browser console (F12) for more details.</p>
      </div>
    </div>
  )
}