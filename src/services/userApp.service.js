import api from "../lib/axios";

const userAppService = {
  // Profile
  getProfile:    ()  => api.get("/me/profile").then(r => r.data.data.user),
  updateProfile: (p) => api.put("/me/profile", p).then(r => r.data.data.user),

  // Favorites
  getFavorites:    ()   => api.get("/me/favorites").then(r => r.data.data.favorites),
  toggleFavorite:  (id) => api.post(`/me/favorites/${id}`).then(r => r.data.data),
  checkFavorite:   (id) => api.get(`/me/favorites/${id}/check`).then(r => r.data.data.isFavorite),

  // Reviews
  getReviews: (id, p) => api.get(`/me/locations/${id}/reviews`, { params: p }).then(r => r.data.data),
  writeReview: (id, p) => api.post(`/me/locations/${id}/reviews`, p).then(r => r.data.data),

  // Tours
  getTours:   (p)  => api.get("/me/tours", { params: p }).then(r => r.data.data),
  getTourById: (id) => api.get(`/me/tours/${id}`).then(r => r.data.data.tour),

  // AT Application
  applyToAT:      (p) => api.post("/me/at/apply", p).then(r => r.data.data),
  getATStatus:    ()  => api.get("/me/at/status").then(r => r.data.data),
};

export default userAppService;