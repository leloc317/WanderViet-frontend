import api from "../lib/axios";

const locationService = {
  getAll: async (params) => {
    const { data } = await api.get("/locations", { params });
    return data.data; // { locations, pagination }
  },

  getPending: async (params) => {
    const { data } = await api.get("/locations/admin/pending", { params });
    return data.data;
  },

  getStats: async () => {
    const { data } = await api.get("/locations/admin/stats");
    return data.data; // { byStatus, byCategory, topViewed, pendingCount }
  },

  create: async (payload) => {
    const { data } = await api.post("/locations", payload);
    return data.data.location;
  },

  update: async (id, payload) => {
    const { data } = await api.put(`/locations/${id}`, payload);
    return data.data.location;
  },

  approve: async (id, action, reason) => {
    const { data } = await api.patch(`/locations/${id}/approval`, { action, reason });
    return data.data.location;
  },

  remove: async (id) => {
    await api.delete(`/locations/${id}`);
  },
};

export default locationService;