import api from "../lib/axios";

const userService = {
  getAll: async (params) => {
    const { data } = await api.get("/users", { params });
    return data.data; // { users, pagination }
  },

  getStats: async () => {
    const { data } = await api.get("/users/stats");
    return data.data; // { byRole, byStatus, recentUsers }
  },

  create: async (payload) => {
    const { data } = await api.post("/users", payload);
    return data.data.user;
  },

  update: async (id, payload) => {
    const { data } = await api.put(`/users/${id}`, payload);
    return data.data.user;
  },

  changeRole: async (id, role) => {
    const { data } = await api.patch(`/users/${id}/role`, { role });
    return data.data.user;
  },

  changeStatus: async (id, status) => {
    const { data } = await api.patch(`/users/${id}/status`, { status });
    return data.data.user;
  },

  remove: async (id) => {
    await api.delete(`/users/${id}`);
  },
};

export default userService;