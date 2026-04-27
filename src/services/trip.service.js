import api from "../lib/axios";

const tripService = {
  // My trips list
  getMyTrips: () =>
    api.get("/me/my-tours").then(r => r.data.data.tours),

  // Single trip detail (populated stops)
  getTripById: (id) =>
    api.get(`/me/my-tours/${id}`).then(r => r.data.data),

  // Create blank trip
  createTrip: (payload) =>
    api.post("/tours", payload).then(r => r.data.data.tour),

  // Fork from template
  forkTrip: (templateId) =>
    api.post(`/me/my-tours/fork/${templateId}`).then(r => r.data.data.tour),

  // Update title / description / budget / duration
  updateMeta: (id, payload) =>
    api.put(`/me/my-tours/${id}`, payload).then(r => r.data.data.tour),

  // Add stop to a day
  addStop: (id, day, payload) =>
    api.post(`/me/my-tours/${id}/days/${day}/stops`, { day, ...payload })
      .then(r => r.data.data.tour),

  // Update stop details
  updateStop: (id, day, stopId, payload) =>
    api.put(`/me/my-tours/${id}/days/${day}/stops/${stopId}`, payload)
      .then(r => r.data.data.tour),

  // Delete stop
  deleteStop: (id, day, stopId) =>
    api.delete(`/me/my-tours/${id}/days/${day}/stops/${stopId}`)
      .then(r => r.data.data.tour),

  // Reorder stops in a day
  reorderStops: (id, day, stops) =>
    api.put(`/me/my-tours/${id}/days/${day}/reorder`, { stops })
      .then(r => r.data.data.tour),

  // Delete trip
  deleteTrip: (id) =>
    api.delete(`/me/my-tours/${id}`),
};

export default tripService;