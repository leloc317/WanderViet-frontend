import { useState, useEffect, useCallback } from "react";

// Haversine formula — tính khoảng cách thẳng (km) giữa 2 tọa độ
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R  = 6371; // Earth radius km
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dl  = ((lng2 - lng1) * Math.PI) / 180;
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function fmtDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export default function useGeolocation() {
  const [position, setPosition] = useState(null);  // { lat, lng }
  const [error,    setError]    = useState(null);   // string
  const [loading,  setLoading]  = useState(false);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ định vị");
      return;
    }
    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        const msg =
          err.code === 1 ? "Bạn đã từ chối quyền định vị"
          : err.code === 2 ? "Không thể xác định vị trí"
          : "Hết thời gian yêu cầu định vị";
        setError(msg);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // Không auto-request — chỉ lấy khi user bấm nút
  return { position, error, loading, request };
}