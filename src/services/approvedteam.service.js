import api from "../lib/axios";

const approvedTeamService = {
  getStats: async () => {
    const { data } = await api.get("/approved-team/stats");
    return data.data;
  },

  // Applications
  getApplications: async (params) => {
    const { data } = await api.get("/approved-team/applications", { params });
    return data.data;
  },
  reviewApplication: async (userId, action, reason) => {
    const { data } = await api.patch(`/approved-team/applications/${userId}`, { action, reason });
    return data.data;
  },

  // Members
  getMembers: async (params) => {
    const { data } = await api.get("/approved-team/members", { params });
    return data.data;
  },
  getMemberById: async (id) => {
    const { data } = await api.get(`/approved-team/members/${id}`);
    return data.data;
  },
  scoreMember: async (id, payload) => {
    const { data } = await api.patch(`/approved-team/members/${id}/score`, payload);
    return data.data;
  },
  recommendAction: async (id, action, reason) => {
    const { data } = await api.post(`/approved-team/members/${id}/recommend`, { action, reason });
    return data.data;
  },

  // Admin actions
  getRecommendations: async () => {
    const { data } = await api.get("/approved-team/recommendations");
    return data.data;
  },
  adminAction: async (id, decision, notes) => {
    const { data } = await api.patch(`/approved-team/members/${id}/action`, { decision, notes });
    return data.data;
  },
  changeMemberStatus: async (id, status) => {
    const { data } = await api.patch(`/approved-team/members/${id}/status`, { status });
    return data.data;
  },
  removeMember: async (id) => {
    const { data } = await api.delete(`/approved-team/members/${id}`);
    return data.data;
  },
};

export default approvedTeamService;