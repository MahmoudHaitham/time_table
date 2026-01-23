const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Store CSRF token
let csrfToken: string | null = null;

// Get CSRF token from response headers
function extractCSRFToken(response: Response): void {
  const token = response.headers.get("X-CSRF-Token");
  if (token) {
    csrfToken = token;
    // Store in sessionStorage for page reloads (less secure than httpOnly but needed for SPA)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("csrf_token", token);
    }
  }
}

// Get stored CSRF token
function getCSRFToken(): string | null {
  if (csrfToken) return csrfToken;
  if (typeof window !== "undefined") {
    csrfToken = sessionStorage.getItem("csrf_token");
  }
  return csrfToken;
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add CSRF token for state-changing operations
  if (["POST", "PUT", "DELETE", "PATCH"].includes(options.method || "")) {
    const token = getCSRFToken();
    if (token) {
      headers["X-CSRF-Token"] = token;
    }
  }

  // Add auth token if available
  const authToken = typeof window !== "undefined" ? sessionStorage.getItem("auth_token") : null;
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include", // Include cookies (for refresh token)
  });

  // Extract CSRF token from response
  extractCSRFToken(response);

  // Handle token expiration - try to refresh
  if (response.status === 401 && authToken) {
    try {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry original request with new token
        headers["Authorization"] = `Bearer ${refreshed}`;
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: "include",
        });
        extractCSRFToken(retryResponse);
        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({ message: "Request failed" }));
          throw new Error(error.message || "Request failed");
        }
        return retryResponse.json();
      }
    } catch (refreshError) {
      // Refresh failed, clear auth and redirect to login
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("auth_token");
        sessionStorage.removeItem("csrf_token");
        sessionStorage.removeItem("user");
        // Clear auth_token cookie
        document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.href = "/login";
      }
      throw new Error("Session expired. Please login again.");
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  return response.json();
}

// Refresh access token using refresh token cookie
async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const newToken = data.data?.token;

    if (newToken && typeof window !== "undefined") {
      sessionStorage.setItem("auth_token", newToken);
      extractCSRFToken(response);
      return newToken;
    }

    return null;
  } catch (error) {
    return null;
  }
}

export const authAPI = {
  login: async (registration_number: string, password: string) => {
    try {
      console.log(`[authAPI.login] Attempting to login to: ${API_BASE_URL}/auth/login`);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ registration_number, password }),
        mode: "cors", // Explicitly set CORS mode
      });
      
      console.log(`[authAPI.login] Response status: ${response.status}`);

      extractCSRFToken(response);

      if (!response.ok) {
        let errorMessage = "Request failed";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || `HTTP ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Store access token in both sessionStorage (for client-side) and cookie (for middleware)
      if (data.data?.token && typeof window !== "undefined") {
        sessionStorage.setItem("auth_token", data.data.token);
        sessionStorage.setItem("user", JSON.stringify(data.data.user));
        
        // Also set cookie for middleware to read (non-httpOnly so client can also read it)
        // Cookie expires when browser closes (session cookie)
        document.cookie = `auth_token=${data.data.token}; path=/; SameSite=Strict; Secure=${window.location.protocol === 'https:'}`;
      }

      return data;
    } catch (error: any) {
      // Handle network errors
      if (error.message === "Failed to fetch" || error.name === "TypeError") {
        throw new Error(
          `Cannot connect to server. Please check:\n` +
          `1. Backend is running at ${API_BASE_URL}\n` +
          `2. CORS is configured correctly\n` +
          `3. Network connectivity`
        );
      }
      throw error;
    }
  },
  
  register: (registration_number: string, password: string, full_name: string) =>
    fetchAPI("/auth/register", {
      method: "POST",
      body: JSON.stringify({ registration_number, password, full_name }),
    }),
  
  getCurrentUser: () => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("auth_token") : null;
    if (!token) throw new Error("Not authenticated");
    return fetchAPI("/auth/me");
  },

  logout: async () => {
    try {
      await fetchAPI("/auth/logout", { method: "POST" });
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("auth_token");
        sessionStorage.removeItem("csrf_token");
        sessionStorage.removeItem("user");
        // Clear auth_token cookie
        document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    }
  },

  refreshToken: refreshAccessToken,
};

