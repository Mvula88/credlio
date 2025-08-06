// Custom fetch wrapper with timeout handling for Supabase
export function createFetchWithTimeout(timeoutMs: number = 30000) {
  return async function fetchWithTimeout(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // If it's a timeout error, provide a more helpful message
      if (error.name === 'AbortError') {
        console.error(`Request to ${input} timed out after ${timeoutMs}ms`);
        throw new Error(`Network request timed out after ${timeoutMs / 1000} seconds. Please check your internet connection.`);
      }
      
      // Re-throw the original error
      throw error;
    }
  };
}