const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Get CSRF token
function getCSRFToken(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("csrf_token");
  }
  return null;
}

// Extract CSRF token from response headers (simple - just store it)
function extractCSRFToken(response: Response): void {
  const csrfToken = response.headers.get("X-CSRF-Token");
  if (csrfToken && typeof window !== "undefined") {
    sessionStorage.setItem("csrf_token", csrfToken);
  }
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("auth_token") : null;
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Add CSRF token for state-changing operations (reuse existing token)
  if (["POST", "PUT", "DELETE", "PATCH"].includes(options.method || "")) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  // Ensure endpoint doesn't have double slashes
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    // Extract CSRF token from response headers (if present)
    extractCSRFToken(response);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `Request failed: ${response.status} ${response.statusText}` };
      }
      
      const errorMessage = errorData?.message || errorData?.error || `Request failed: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    const errorMessage = error?.message || "Network error";
    if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
      throw new Error(`Unable to connect to server. Please make sure the backend is running at ${API_BASE_URL}`);
    }
    throw error;
  }
}

// Terms API
export const termsAPI = {
  getAll: () => fetchAPI("/terms"),
  getById: (id: number) => {
    console.log(`[termsAPI.getById] Called with id:`, id, `type:`, typeof id);
    // Ensure id is a valid number
    const numericId = typeof id === "number" ? id : parseInt(String(id), 10);
    if (isNaN(numericId) || numericId <= 0 || !Number.isInteger(numericId)) {
      console.error(`[termsAPI.getById] Invalid term ID:`, { id, numericId, type: typeof id });
      throw new Error(`Invalid term ID: ${id}`);
    }
    console.log(`[termsAPI.getById] Validated ID, calling fetchAPI with:`, numericId);
    return fetchAPI(`/terms/${numericId}`);
  },
  create: (data: { term_number: string }) =>
    fetchAPI("/terms", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { term_number?: string; is_published?: boolean }) =>
    fetchAPI(`/terms/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  publish: (id: number) =>
    fetchAPI(`/terms/${id}/publish`, { method: "POST" }),
  unpublish: (id: number) =>
    fetchAPI(`/terms/${id}/unpublish`, { method: "POST" }),
  validate: (id: number) =>
    fetchAPI(`/terms/${id}/validate`, { method: "POST" }),
  delete: (id: number) =>
    fetchAPI(`/terms/${id}`, { method: "DELETE" }),
};

// Classes API
export const classesAPI = {
  getByTerm: (termId: number) => fetchAPI(`/terms/${termId}/classes`),
  create: (termId: number, data: { class_code: string; system_type?: number }) =>
    fetchAPI(`/terms/${termId}/classes`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (classId: number) =>
    fetchAPI(`/classes/${classId}`, { method: "DELETE" }),
};

// Courses API
export const coursesAPI = {
  getAll: () => fetchAPI("/courses"),
  getAllWithAssignments: () => fetchAPI("/courses/with-assignments"), // Optimized endpoint - returns all data in one request
  getById: (id: number) => fetchAPI(`/courses/${id}`),
  create: (data: { code: string; name: string; is_elective?: boolean; components?: string[] }) =>
    fetchAPI("/courses", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { code?: string; name?: string; is_elective?: boolean; components?: string[] }) =>
    fetchAPI(`/courses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/courses/${id}`, { method: "DELETE" }),
};

// Class Courses API
export const classCoursesAPI = {
  getByClass: (classId: number) => fetchAPI(`/classes/${classId}/courses`),
  assign: (classId: number, course_ids: number[]) =>
    fetchAPI(`/classes/${classId}/courses`, {
      method: "POST",
      body: JSON.stringify({ course_ids }),
    }),
  patch: (classCourseId: number, data: { closed: boolean }) =>
    fetchAPI(`/class-courses/${classCourseId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (classCourseId: number) =>
    fetchAPI(`/class-courses/${classCourseId}`, {
      method: "DELETE",
    }),
};

// Components API
export const componentsAPI = {
  getByClassCourse: (classCourseId: number) =>
    fetchAPI(`/class-courses/${classCourseId}/components`),
  create: (classCourseId: number, components: { component_type: "L" | "S" | "LB" }[]) =>
    fetchAPI(`/class-courses/${classCourseId}/components`, {
      method: "POST",
      body: JSON.stringify({ components }),
    }),
};

// Sessions API
export const sessionsAPI = {
  getByComponent: (componentId: number) => {
    console.log(`[sessionsAPI.getByComponent] Called with componentId:`, componentId, `type:`, typeof componentId);
    const numericId = typeof componentId === "number" ? componentId : parseInt(String(componentId), 10);
    if (isNaN(numericId) || numericId <= 0 || !Number.isInteger(numericId)) {
      console.error(`[sessionsAPI.getByComponent] Invalid component ID:`, { componentId, numericId });
      throw new Error(`Invalid component ID: ${componentId}`);
    }
    return fetchAPI(`/components/${numericId}/sessions`);
  },
  getAllInstructors: () => fetchAPI("/sessions/instructors"),
  getAllInstructorsSchedule: () => fetchAPI("/sessions/instructors/schedule"),
  getAllInstructorsWithSessions: () => fetchAPI("/sessions/instructors/with-sessions"), // Optimized endpoint - returns all data in one request with hash
  getRoomSchedule: () => fetchAPI("/sessions/room-schedule"), // Get all sessions for room schedule view (admin)
  getByInstructor: (instructorName: string) => {
    const encodedName = encodeURIComponent(instructorName);
    return fetchAPI(`/sessions/instructor/${encodedName}`);
  },
  create: (
    componentId: number,
    data: {
      day: string;
      slot: number;
      room?: string;
      instructor?: string;
    }
  ) => {
    console.log(`[sessionsAPI.create] Called with componentId:`, componentId, `type:`, typeof componentId, `data:`, data);
    const numericId = typeof componentId === "number" ? componentId : parseInt(String(componentId), 10);
    if (isNaN(numericId) || numericId <= 0 || !Number.isInteger(numericId)) {
      console.error(`[sessionsAPI.create] Invalid component ID:`, { componentId, numericId });
      throw new Error(`Invalid component ID: ${componentId}`);
    }
    return fetchAPI(`/components/${numericId}/sessions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: (
    sessionId: number,
    data: {
      day?: string;
      slot?: number;
      room?: string;
      instructor?: string;
    }
  ) =>
    fetchAPI(`/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (sessionId: number) =>
    fetchAPI(`/sessions/${sessionId}`, { method: "DELETE" }),
};

// Electives API
export const electivesAPI = {
  getByTerm: (termId: number) => fetchAPI(`/terms/${termId}/electives`),
  set: (termId: number, course_ids: number[]) =>
    fetchAPI(`/terms/${termId}/electives`, {
      method: "POST",
      body: JSON.stringify({ course_ids }),
    }),
};

// Public/Student Timetable View API
export const timetableViewAPI = {
  getPublishedTerms: () => fetchAPI("/timetable/terms"),
  getTermTimetable: (termId: number, systemType?: number) => {
    const url = systemType 
      ? `/timetable/terms/${termId}?system=${systemType}`
      : `/timetable/terms/${termId}`;
    return fetchAPI(url);
  },
  getClassTimetable: (classId: number) => fetchAPI(`/timetable/classes/${classId}`),
};

// Student Timetable Generator API
// Now uses secure tokens instead of term IDs
export const studentTimetableAPI = {
  getPublishedTerms: () => fetchAPI("/timetable/terms"),
  getTermTimetable: (termToken: string) => fetchAPI(`/timetable/terms/${termToken}`),
  getCoreCourses: (termToken: string, systemType: number) => {
    const url = `/timetable/terms/${termToken}/core-courses?systemType=${systemType}`;
    return fetchAPI(url);
  },
  getElectiveCourses: (termToken: string, systemType: number) => {
    const url = `/timetable/terms/${termToken}/elective-courses?systemType=${systemType}`;
    return fetchAPI(url);
  },
  getInstructorsForTerm: (termToken: string, systemType: number, selectedCourseIds?: number[], campusTrack?: "northampton" | "normal") => {
    let url = `/timetable/terms/${termToken}/instructors?systemType=${systemType}`;
    if (selectedCourseIds && selectedCourseIds.length > 0) {
      url += `&selectedCourseIds=${selectedCourseIds.join(',')}`;
    }
    if (campusTrack) {
      url += `&campusTrack=${campusTrack}`;
    }
    return fetchAPI(url);
  },
  getInstructorsForCourses: (systemType: number | null, courseIds: number[]) => {
    const params = new URLSearchParams();
    if (courseIds?.length) params.set("courseIds", courseIds.join(","));
    if (systemType != null) params.set("systemType", String(systemType));
    else params.set("allSystems", "true");
    return fetchAPI(`/timetable/instructors/courses?${params.toString()}`);
  },
  generateSchedules: (data: {
    termId: string | number; // Accepts token (string) or ID (number) for backward compatibility
    excludedDays: string[];
    electiveCourseIds?: number[];
    excludedCoreCourseIds?: number[];
    systemType: number; // Required: 140, 160, or 180
    preferredInstructors?: string[]; // Optional: array of preferred instructor names
    campusTrack?: "northampton" | "normal"; // Optional: for Term 4 System 140 (NORTHAMPTON separation)
    studentName?: string; // Optional: for generation log (admin view)
  }) => fetchAPI("/timetable/generate", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  // Other section APIs
  getAllCoursesForOther: (systemType?: number | null, allSystems?: boolean) => {
    if (allSystems) {
      return fetchAPI("/timetable/other/courses?allSystems=true");
    }
    const url = `/timetable/other/courses?systemType=${systemType}`;
    return fetchAPI(url);
  },
  generateOtherSectionSchedules: (data: {
    selectedCourseIds: number[];
    excludedDays: string[];
    preferredInstructors?: string[];
    systemType?: number | null; // 140, 160, or 180 when single system
    allSystems?: boolean; // true when "No specific system" (mix 140, 160, 180)
    studentName?: string;
  }) => fetchAPI("/timetable/other/generate", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  // Get all elective slots across all terms for a system
  getAllElectiveSlots: (systemType: number) => {
    const url = `/timetable/electives/slots?systemType=${systemType}`;
    return fetchAPI(url);
  },
};

// Other Departments API
export const otherDeptAPI = {
  createCourse: (data: { code: string; name: string; hasLab?: boolean }) =>
    fetchAPI("/other-dept/courses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getCourses: () => fetchAPI("/other-dept/courses"),
  upsertSession: (componentId: number, data: { day: string; slot: number; room?: string; instructor?: string }) =>
    fetchAPI(`/other-dept/components/${componentId}/session`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteSession: (componentId: number, day: string, slot: number) =>
    fetchAPI(`/other-dept/components/${componentId}/session?day=${encodeURIComponent(day)}&slot=${slot}`, {
      method: "DELETE",
    }),
  deleteCourse: (courseId: number) =>
    fetchAPI(`/other-dept/courses/${courseId}`, {
      method: "DELETE",
    }),
};

// Generation Logs API (admin only)
export const generationLogsAPI = {
  getLogs: () => fetchAPI("/generation-logs"),
};

// Student Problems API
export const problemsAPI = {
  /** Submit a problem report (student, no auth required) */
  submit: (data: {
    name: string;
    registration_number: string;
    northampton: "yes" | "no";
    term: string; // "4" | "5" | "6" | "7" | "8" | "9" | "10" | "other"
    description: string;
  }) => fetchAPI("/problems", { method: "POST", body: JSON.stringify(data) }),
  /** List all problems (admin only, first-come-first-served order) */
  getList: () => fetchAPI("/problems"),
  /** Update problem status (admin only): "pending" | "solved" | "not_solved" */
  updateStatus: (id: number, status: "pending" | "solved" | "not_solved") =>
    fetchAPI(`/problems/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
