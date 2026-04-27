import api from "../lib/axios";

const tourService = {
  getAll: async (params) => {
    const { data } = await api.get("/tours", { params });
    return data.data; // { tours, pagination }
  },

  getPending: async (params) => {
    const { data } = await api.get("/tours/admin/pending", { params });
    return data.data;
  },

  getStats: async () => {
    const { data } = await api.get("/tours/admin/stats");
    return data.data; // { byStatus, byCategory, topTours, pendingCount }
  },

  create: async (payload) => {
    const { data } = await api.post("/tours", payload);
    return data.data.tour;
  },

  remove: async (id) => {
    await api.delete(`/tours/${id}`);
  },

  approve: async (id, action, reason, makeTemplate) => {
    const { data } = await api.patch(`/tours/${id}/approval`, { action, reason, makeTemplate });
    return data.data.tour;
  },

  vote: async (id, vote, comment) => {
    const { data } = await api.post(`/tours/${id}/vote`, { vote, comment });
    return data.data;
  },
};

export default tourService;