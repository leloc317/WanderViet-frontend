import api from "../lib/axios";

const adService = {
  // ─── Packages ────────────────────────────────────────────────────────────
  getPackages: async () => {
    const { data } = await api.get("/ads/packages");
    return data.data.packages;
  },

  createPackage: async (payload) => {
    const { data } = await api.post("/ads/packages", payload);
    return data.data.package;
  },

  updatePackage: async (id, payload) => {
    const { data } = await api.put(`/ads/packages/${id}`, payload);
    return data.data.package;
  },

  deletePackage: async (id) => {
    await api.delete(`/ads/packages/${id}`);
  },

  // ─── Orders ──────────────────────────────────────────────────────────────
  getOrders: async (params) => {
    const { data } = await api.get("/ads/orders", { params });
    return data.data; // { orders, pagination }
  },

  getOrderById: async (id) => {
    const { data } = await api.get(`/ads/orders/${id}`);
    return data.data.order;
  },

  createOrder: async (payload) => {
    const { data } = await api.post("/ads/orders", payload);
    return data.data.order;
  },

  approveOrder: async (id, notes) => {
    const { data } = await api.patch(`/ads/orders/${id}/approve`, { notes });
    return data.data.order;
  },

  updateOrderStatus: async (id, action, notes) => {
    const { data } = await api.patch(`/ads/orders/${id}/status`, { action, notes });
    return data.data.order;
  },

  // ─── Stats ───────────────────────────────────────────────────────────────
  getStats: async () => {
    const { data } = await api.get("/ads/stats");
    return data.data;
  },

  getOrderStats: async (id) => {
    const { data } = await api.get(`/ads/orders/${id}/stats`);
    return data.data;
  },

// ─── Company — My orders ──────────────────────────────────────────────────
  getMyOrders: async (params) => {
    const { data } = await api.get("/ads/my-orders", { params });
    return data.data;
  },

  createMyOrder: async (payload) => {
    const { data } = await api.post("/ads/my-orders", payload);
    return data.data.order;
  },

  cancelMyOrder: async (id) => {
    await api.delete(`/ads/my-orders/${id}`);
  },

  // ─── Tracking (fire-and-forget) ───────────────────────────────────────────
  trackImpression: (locationId) => {
    api.post(`/ads/track/impression/${locationId}`).catch(() => {});
  },

  trackClick: (locationId) => {
    api.post(`/ads/track/click/${locationId}`).catch(() => {});
  },
};
  export default adService;