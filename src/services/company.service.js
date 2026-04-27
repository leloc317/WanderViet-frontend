import api from "../lib/axios";

const companyService = {
  getDashboard:      () => api.get("/company/dashboard").then(r => r.data.data),
  getProfile:        () => api.get("/company/profile").then(r => r.data.data.user),
  updateProfile: (p) => api.put("/company/profile", p).then(r => r.data.data.user),
  getNotifications:  () => api.get("/company/notifications").then(r => r.data.data),

  // Locations
  getLocations: (p) => api.get("/company/locations", { params: p }).then(r => r.data.data),
  getLocationById: (id) => api.get(`/company/locations/${id}`).then(r => r.data.data.location),

  // Ads
  getAds:     (p)   => api.get("/company/ads", { params: p }).then(r => r.data.data),
  getAdById:  (id)  => api.get(`/company/ads/${id}`).then(r => r.data.data),
  purchaseAd: (p)   => api.post("/company/ads", p).then(r => r.data.data.order),
  renewAd:    (id, p) => api.post(`/company/ads/${id}/renew`, p).then(r => r.data.data.order),

  // Packages (public)
  getPackages: () => api.get("/ads/packages").then(r => r.data.data.packages),
};

export default companyService;