/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple robust client-side API helper
let API_URL = import.meta.env.VITE_API_URL || "";

if (typeof window !== "undefined") {
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  
  // 1. If VITE_API_URL is set and not empty, use VITE_API_URL, unless we are on a remote host (preview/prod)
  // but VITE_API_URL was compiled with localhost (we override it with window.location.origin).
  if (API_URL) {
    if (!isLocalhost && (API_URL.includes("localhost") || API_URL.includes("127.0.0.1"))) {
      API_URL = window.location.origin;
    }
  } else {
    // 2-4. If VITE_API_URL is not set, use window.location.origin as default for all hosts (including local, AI Studio, prod)
    API_URL = window.location.origin;
  }
}

function getHeaders() {
  const token = localStorage.getItem("sdg_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

type SessionListener = (errorMsg: string) => void;
const sessionListeners = new Set<SessionListener>();

async function apiRequest(
  url: string,
  options: RequestInit = {},
  defaultError: string = "Request failed"
): Promise<any> {
  const headers = {
    ...getHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };

  // If the body is FormData, let fetch set the Content-Type with boundary automatically
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const mergedOptions = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(url, mergedOptions);

    if (res.status === 401) {
      // 401 Unauthorized handling
      localStorage.removeItem("sdg_token");
      localStorage.removeItem("sdg_user");
      api.notifySessionExpired("Session expired. Please login again.");
      throw new Error("Session expired. Please login again.");
    }

    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (!res.ok) {
      if (isJson) {
        const error = await res.json();
        throw new Error(error.error || defaultError);
      } else {
        const text = await res.text();
        let errMsg = `${defaultError} (Status ${res.status})`;
        if (text) {
          const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            errMsg += `: ${titleMatch[1].trim()}`;
          } else if (text.length < 120) {
            errMsg += `: ${text.trim()}`;
          }
        }
        throw new Error(errMsg);
      }
    }

    if (isJson) {
      return res.json();
    } else {
      return res.text();
    }
  } catch (err: any) {
    if (err.message === "Session expired. Please login again.") {
      throw err;
    }
    throw err;
  }
}

export const api = {
  getApiUrl() {
    return API_URL;
  },

  onSessionExpired(listener: SessionListener) {
    sessionListeners.add(listener);
    return () => {
      sessionListeners.delete(listener);
    };
  },

  notifySessionExpired(errorMsg: string) {
    sessionListeners.forEach((listener) => {
      try {
        listener(errorMsg);
      } catch (err) {
        console.error("Error calling session expired listener:", err);
      }
    });
  },

  // Health check helper to verify API connectivity
  async checkHealth(): Promise<{ success: boolean; url: string; error?: string }> {
    const url = `${API_URL}/api/health`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        throw new Error(`Server returned HTTP status ${res.status}`);
      }
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data && (data.success === true || data.status === "ok" || data.status === "healthy")) {
          return { success: true, url };
        }
        throw new Error(`Invalid health response payload: ${JSON.stringify(data)}`);
      } else {
        const text = await res.text();
        throw new Error(`Invalid content-type: ${contentType || "none"}. Raw response: ${text.substring(0, 100)}`);
      }
    } catch (err: any) {
      return { success: false, url, error: err.message || "Network error" };
    }
  },

  // Authentication
  async login(username: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    
    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (!res.ok) {
      if (isJson) {
        const error = await res.json();
        throw new Error(error.error || "Login failed");
      } else {
        const text = await res.text();
        console.error("Login non-JSON error response (first 300 chars):", text.substring(0, 300));
        throw new Error(`Server connection failed. Login API could not be reached. Checked URL: ${API_URL}/api/auth/login (Status: ${res.status})`);
      }
    }

    if (!isJson) {
      const text = await res.text();
      console.error("Login expected JSON but got non-JSON response:", text.substring(0, 300));
      throw new Error("Invalid response format received from login server.");
    }

    const data = await res.json();
    localStorage.setItem("sdg_token", data.token);
    localStorage.setItem("sdg_user", JSON.stringify(data.user));
    return data;
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to request password reset");
    }
    return res.json();
  },

  async resetPassword(password: string) {
    const token = localStorage.getItem("supabase_recovery_token") || localStorage.getItem("sdg_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update password");
    }
    return res.json();
  },

  // Session verification on startup
  async getCurrentUserFromServer() {
    return apiRequest(`${API_URL}/api/auth/me`, { method: "GET" }, "Failed to validate session");
  },

  // Super Admin: Firms Management
  async getSuperAdminFirms() {
    return apiRequest(`${API_URL}/api/superadmin/firms`, { method: "GET" }, "Failed to load firms list");
  },

  async updateSuperAdminFirm(id: string, updatedFields: { name?: string; status?: string; plan?: string }) {
    return apiRequest(`${API_URL}/api/superadmin/firms/${id}`, {
      method: "PUT",
      body: JSON.stringify(updatedFields),
    }, "Failed to update firm");
  },

  async getSuperAdminStats() {
    return apiRequest(`${API_URL}/api/superadmin/stats`, { method: "GET" }, "Failed to load superadmin system stats");
  },

  async register(payload: {
    fullName: string;
    firmName: string;
    email: string;
    username: string;
    mobile: string;
    password?: string;
    accountType?: string;
  }) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.fullName,
        fullName: payload.fullName,
        firmName: payload.firmName,
        email: payload.email,
        username: payload.username,
        mobile: payload.mobile,
        password: payload.password,
        accountType: payload.accountType,
      }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Registration failed");
    }
    return res.json();
  },

  logout() {
    const token = localStorage.getItem("sdg_token");
    if (token) {
      fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: getHeaders(),
      }).catch(console.error);
    }
    localStorage.removeItem("sdg_token");
    localStorage.removeItem("sdg_user");
  },

  getCurrentUser() {
    const userStr = localStorage.getItem("sdg_user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Dashboard Stats
  async getDashboardStats() {
    return apiRequest(`${API_URL}/api/dashboard/stats`, { method: "GET" }, "Failed to load dashboard stats");
  },

  // Categories
  async getCategories() {
    return apiRequest(`${API_URL}/api/categories`, { method: "GET" }, "Failed to load categories");
  },

  async createCategory(name: string, description: string) {
    return apiRequest(`${API_URL}/api/categories`, {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }, "Failed to create category");
  },

  async deleteCategory(id: string) {
    return apiRequest(`${API_URL}/api/categories/${id}`, {
      method: "DELETE",
    }, "Failed to delete category");
  },

  // Dropdown Master Data
  async getDropdowns() {
    return apiRequest(`${API_URL}/api/dropdowns`, { method: "GET" }, "Failed to load master dropdowns");
  },

  async createDropdown(name: string, options: string[]) {
    return apiRequest(`${API_URL}/api/dropdowns`, {
      method: "POST",
      body: JSON.stringify({ name, options }),
    }, "Failed to create master dropdown");
  },

  async updateDropdown(id: string, name: string, options: string[]) {
    return apiRequest(`${API_URL}/api/dropdowns/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, options }),
    }, "Failed to update master dropdown");
  },

  async deleteDropdown(id: string) {
    return apiRequest(`${API_URL}/api/dropdowns/${id}`, {
      method: "DELETE",
    }, "Failed to delete master dropdown");
  },

  // Templates
  async getTemplates() {
    return apiRequest(`${API_URL}/api/templates`, { method: "GET" }, "Failed to load templates");
  },

  async getTemplate(id: string) {
    return apiRequest(`${API_URL}/api/templates/${id}`, { method: "GET" }, "Failed to load template");
  },

  async uploadTemplate(formData: FormData) {
    const isDev = import.meta.env.DEV;
    if (isDev) {
      const file = formData.get("file") as File | null;
      const token = localStorage.getItem("sdg_token");
      console.log("[Dev Upload Log] Initiating template upload:");
      console.log(`- API URL: ${API_URL}`);
      console.log("- Endpoint: /api/templates/upload");
      console.log(`- File Name: ${file ? file.name : "unknown"}`);
      console.log(`- File Size: ${file ? (file.size / 1024 / 1024).toFixed(2) + " MB" : "unknown"}`);
      console.log(`- Content Type: ${file ? file.type : "unknown"}`);
      console.log(`- Auth Token Present: ${!!token}`);
    }
    return apiRequest(`${API_URL}/api/templates/upload`, {
      method: "POST",
      body: formData,
    }, "Failed to upload Word template");
  },

  async updateTemplate(id: string, payload: any) {
    return apiRequest(`${API_URL}/api/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, "Failed to update template configuration");
  },

  async deleteTemplate(id: string) {
    return apiRequest(`${API_URL}/api/templates/${id}`, {
      method: "DELETE",
    }, "Failed to delete template");
  },

  async getTemplateAccess(id: string) {
    return apiRequest(`${API_URL}/api/templates/${id}/access`, {
      method: "GET",
    }, "Failed to load template access mappings");
  },

  async setTemplateAccess(id: string, userIds: string[]) {
    return apiRequest(`${API_URL}/api/templates/${id}/access`, {
      method: "POST",
      body: JSON.stringify({ userIds }),
    }, "Failed to update template access mappings");
  },

  getTemplateDownloadUrl(id: string) {
    const token = localStorage.getItem("sdg_token");
    return `${API_URL}/api/templates/${id}/download-original?authorization=${token}`;
  },

  // Document History & Generation
  async getDocuments() {
    return apiRequest(`${API_URL}/api/documents`, { method: "GET" }, "Failed to load generated documents");
  },

  async getDocument(id: string) {
    return apiRequest(`${API_URL}/api/documents/${id}`, { method: "GET" }, "Failed to load document details");
  },

  async generateDocument(templateId: string, values: Record<string, string>, brandingOption: "none" | "profile" = "none", organizationProfileId?: string) {
    return apiRequest(`${API_URL}/api/documents/generate`, {
      method: "POST",
      body: JSON.stringify({ templateId, values, brandingOption, organizationProfileId }),
    }, "Failed to replace placeholders and generate document");
  },

  getDocumentDownloadDocxUrl(id: string) {
    const token = localStorage.getItem("sdg_token");
    return `${API_URL}/api/documents/${id}/download-docx?authorization=${token}`;
  },

  getDocumentDownloadPdfUrl(id: string) {
    const token = localStorage.getItem("sdg_token");
    return `${API_URL}/api/documents/${id}/download-pdf?authorization=${token}`;
  },

  getDocumentPdfViewUrl(id: string) {
    const token = localStorage.getItem("sdg_token");
    return `${API_URL}/api/documents/${id}/view-pdf?token=${token}`;
  },

  getDocumentPdfPreviewUrl(id: string) {
    const token = localStorage.getItem("sdg_token");
    return `${API_URL}/api/documents/${id}/preview-pdf?token=${token}`;
  },

  async getDocumentPreviewHtml(id: string) {
    return apiRequest(`${API_URL}/api/documents/${id}/preview-html`, { method: "GET" }, "Failed to load document preview");
  },

  // Settings
  async getSettings() {
    return apiRequest(`${API_URL}/api/settings`, { method: "GET" }, "Failed to load platform settings");
  },

  async updateSettings(settings: any) {
    return apiRequest(`${API_URL}/api/settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
    }, "Failed to save settings");
  },

  // Organization Profiles
  async getOrganizationProfiles() {
    return apiRequest(`${API_URL}/api/organization-profiles`, { method: "GET" }, "Failed to load organization profiles");
  },

  async getOrganizationProfile(id: string) {
    return apiRequest(`${API_URL}/api/organization-profiles/${id}`, { method: "GET" }, "Failed to load organization profile");
  },

  async createOrganizationProfile(profile: any) {
    return apiRequest(`${API_URL}/api/organization-profiles`, {
      method: "POST",
      body: JSON.stringify(profile),
    }, "Failed to create organization profile");
  },

  async updateOrganizationProfile(id: string, profile: any) {
    return apiRequest(`${API_URL}/api/organization-profiles/${id}`, {
      method: "PUT",
      body: JSON.stringify(profile),
    }, "Failed to update organization profile");
  },

  async deleteOrganizationProfile(id: string) {
    return apiRequest(`${API_URL}/api/organization-profiles/${id}`, {
      method: "DELETE",
    }, "Failed to delete organization profile");
  },

  // Audit Logs
  async getAuditLogs() {
    return apiRequest(`${API_URL}/api/audit-logs`, { method: "GET" }, "Failed to load audit logs");
  },

  // User Management (Admin Only)
  async getUsers() {
    return apiRequest(`${API_URL}/api/admin/users`, { method: "GET" }, "Failed to load users list");
  },

  async createUser(user: { 
    username: string; 
    name: string; 
    email: string; 
    role: string; 
    passwordHash?: string; 
    mobile?: string; 
    designation?: string; 
    isActive?: boolean; 
  }) {
    return apiRequest(`${API_URL}/api/admin/users`, {
      method: "POST",
      body: JSON.stringify(user),
    }, "Failed to create user");
  },

  async updateUser(id: string, updatedFields: { 
    username?: string; 
    name?: string; 
    email?: string; 
    role?: string; 
    passwordHash?: string; 
    mobile?: string; 
    designation?: string; 
    isActive?: boolean; 
  }) {
    return apiRequest(`${API_URL}/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(updatedFields),
    }, "Failed to update user");
  },

  async deleteUser(id: string) {
    return apiRequest(`${API_URL}/api/admin/users/${id}`, {
      method: "DELETE",
    }, "Failed to delete user");
  },

  async downloadAsBlob(url: string, filename: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to download file: ${res.statusText}`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Blob download failed, trying standard window.open fallback:", err);
      window.open(url, "_blank");
    }
  },
};
