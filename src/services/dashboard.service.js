import api from "../lib/axios";

const dashboardService = {
  getOverview:      (period = "30d") => api.get("/dashboard/overview",      { params: { period } }).then(r => r.data.data),
  getLocations:     (period = "30d") => api.get("/dashboard/locations",      { params: { period } }).then(r => r.data.data),
  getATPerformance: (period = "30d") => api.get("/dashboard/at-performance", { params: { period } }).then(r => r.data.data),
  getUserBehaviour: (period = "30d") => api.get("/dashboard/user-behaviour", { params: { period } }).then(r => r.data.data),
  getAds:           (period = "30d") => api.get("/dashboard/ads",            { params: { period } }).then(r => r.data.data),
  getModeration:    (period = "30d") => api.get("/dashboard/moderation",     { params: { period } }).then(r => r.data.data),
};

export default dashboardService;