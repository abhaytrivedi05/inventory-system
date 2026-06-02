import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Products
export const productApi = {
  list: (params = {}) => api.get("/products/", { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post("/products/", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Customers
export const customerApi = {
  list: (params = {}) => api.get("/customers/", { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post("/customers/", data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Orders
export const orderApi = {
  list: (params = {}) => api.get("/orders/", { params }),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post("/orders/", data),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  delete: (id) => api.delete(`/orders/${id}`),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get("/dashboard/stats"),
};

export default api;
