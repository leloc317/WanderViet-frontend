import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/axios";

// Non-blocking fire-and-forget tracker
const fireTrack = async (payload) => {
  try {
    await api.post("/recommendations/track", payload);
  } catch {
    // Silently fail — tracking should never break UX
  }
};

export default function useTracking() {
  const { user } = useAuth();

  const track = useCallback((action, data = {}) => {
    if (!user) return; // only track logged-in users
    fireTrack({ action, ...data });
  }, [user]);

  return {
    trackView:           (locationId, category, priceLabel) =>
      track("view_location", { locationId, category, priceLabel }),

    trackSave:           (locationId, category, priceLabel) =>
      track("save_location", { locationId, category, priceLabel }),

    trackUnsave:         (locationId) =>
      track("unsave_location", { locationId }),

    trackReview:         (locationId, category) =>
      track("write_review", { locationId, category }),

    trackCategoryFilter: (category) =>
      track("filter_category", { category }),

    trackPriceFilter:    (priceLabel) =>
      track("filter_price", { priceLabel }),

    trackViewTour:       (tourId) =>
      track("view_tour", { tourId }),

    trackForkTour:       (tourId) =>
      track("fork_tour", { tourId }),
  };
}