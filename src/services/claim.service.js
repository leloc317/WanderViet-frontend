import api from "../lib/axios";

const claimService = {
  // Company
  submit:       (p)   => api.post("/claims", p).then(r => r.data.data),
  getMyClaims:  ()    => api.get("/claims/my").then(r => r.data.data.claims),
  appeal:       (id, p) => api.post(`/claims/${id}/appeal`, p).then(r => r.data.data),

  // AT
  getClaimsForMe: () => api.get("/claims/for-me").then(r => r.data.data.claims),
  atReview:     (id, p) => api.post(`/claims/${id}/at-review`, p).then(r => r.data.data),

  // Admin
  getAdminClaims: (p) => api.get("/claims/admin", { params: p }).then(r => r.data.data),
  adminReview:  (id, p) => api.post(`/claims/${id}/admin-review`, p).then(r => r.data.data),

  // Public
  check:        (locationId) => api.get(`/claims/check/${locationId}`).then(r => r.data.data),
};

export default claimService;