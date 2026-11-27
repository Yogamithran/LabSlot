/** Shared JSON client for the endpoints listed in docs/API_CONTRACT.md. */
const API_BASE_URL = "http://127.0.0.1:5000/api";

async function apiRequest(endpoint, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: "include",
      ...options,
      headers,
    });
  } catch (_error) {
    const error = new Error("Unable to reach the LabSlot API. Check that the backend is running.");
    error.code = "NETWORK_UNAVAILABLE";
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : {};
  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.details = data.details;
    throw error;
  }
  return data;
}

async function checkBackendHealth() {
  return apiRequest("/health", { method: "GET" });
}

function apiResource(payload, preferredKey) {
  const data = payload && payload.data !== undefined ? payload.data : payload;
  if (preferredKey && data && !Array.isArray(data) && data[preferredKey] !== undefined) return data[preferredKey];
  return data;
}
