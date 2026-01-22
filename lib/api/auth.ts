const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  return response.json();
}

export const authAPI = {
  login: (registration_number: string, password: string) =>
    fetchAPI("/auth/login", {
      method: "POST",
      body: JSON.stringify({ registration_number, password }),
    }),
  register: (registration_number: string, password: string, full_name: string) =>
    fetchAPI("/auth/register", {
      method: "POST",
      body: JSON.stringify({ registration_number, password, full_name }),
    }),
  getCurrentUser: () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) throw new Error("Not authenticated");
    return fetchAPI("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

