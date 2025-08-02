// Utility to help determine router context
export function isAppRouter() {
  // Check if we're in an App Router context
  try {
    // This will throw in Pages Router
    require("next/headers")
    return true
  } catch {
    return false
  }
}

export function isPagesRouter() {
  return !isAppRouter()
}
