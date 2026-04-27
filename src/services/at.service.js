import api from "../lib/axios";

const atService = {
  getDashboard:         ()      => api.get("/at/dashboard").then(r => r.data.data),
  getMyLocations:       (p)     => api.get("/at/my-locations", { params: p }).then(r => r.data.data),
  getLocationsToReview: (p)     => api.get("/at/locations-to-review", { params: p }).then(r => r.data.data),
  writeReview:          (id, p) => api.post(`/at/locations/${id}/review`, p).then(r => r.data.data),
  getToursToVote:       (p)     => api.get("/at/tours-to-vote", { params: p }).then(r => r.data.data),
  voteOnTour:           (id, p) => api.post(`/at/tours/${id}/vote`, p).then(r => r.data.data),
  getProfile:           ()      => api.get("/at/profile").then(r => r.data.data.user),
  updateProfile:        (p)     => api.put("/at/profile", p).then(r => r.data.data.user),
};

export default atService;