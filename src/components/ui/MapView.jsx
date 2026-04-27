import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useGeolocation, { haversineDistance, fmtDistance } from "../../hooks/useGeolocation";

// ── MapView ───────────────────────────────────────────────────────────────────
// Props:
//   center    { lat, lng }  — default map center
//   markers   [{ lat, lng, label, title, description, img, isUser }]
//   height    string        — CSS height, default "100%"
//   zoom      number        — default 14
//   showUserBtn boolean     — hiện nút "Vị trí của tôi"
//   onDistanceCalc function(km) — callback khi tính được khoảng cách user→điểm đầu
export default function MapView({
  center,
  markers = [],
  height = "100%",
  zoom = 14,
  showUserBtn = true,
  onDistanceCalc,
}) {
  const mapDivRef    = useRef(null);
  const lMapRef      = useRef(null);   // Leaflet map instance
  const markersRef   = useRef([]);     // Leaflet marker instances
  const polylineRef  = useRef(null);
  const userMkrRef   = useRef(null);

  const [infoLoc, setInfoLoc] = useState(null);

  const { position, error: geoError, loading: geoLoading, request: requestGeo } =
    useGeolocation();

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || lMapRef.current) return;

    const defaultCenter = center ?? { lat: 21.0285, lng: 105.8542 };

    lMapRef.current = L.map(mapDivRef.current, {
      center: [defaultCenter.lat, defaultCenter.lng],
      zoom,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(lMapRef.current);

    return () => {
      lMapRef.current?.remove();
      lMapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update center when prop changes ────────────────────────────────────────
  useEffect(() => {
    if (!lMapRef.current || !center) return;
    lMapRef.current.setView([center.lat, center.lng], zoom);
  }, [center, zoom]);

  // ── Render markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!lMapRef.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }

    markers.forEach((m, i) => {
      if (!m.lat || !m.lng) return;

      const color = m.isUser ? "#3b82f6" : "#ef4444";
      const label = m.isUser ? "📍" : (m.label ?? String(i + 1));

      const icon = L.divIcon({
        html: `
          <div style="
            width:36px;height:36px;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            background:${color};border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="transform:rotate(45deg);font-size:14px;line-height:1;">${label}</span>
          </div>
        `,
        iconSize:   [36, 36],
        iconAnchor: [18, 36],
        className:  "",
      });

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(lMapRef.current);

      if (!m.isUser) {
        marker.on("click", () => {
          setInfoLoc(m);
          lMapRef.current.panTo([m.lat, m.lng]);
        });
      }

      markersRef.current.push(marker);
    });

    // Polyline for multiple non-user markers
    const pts = markers.filter(m => !m.isUser && m.lat && m.lng);
    if (pts.length > 1) {
      polylineRef.current = L.polyline(
        pts.map(p => [p.lat, p.lng]),
        { color: "#3b82f6", opacity: 0.6, weight: 2 }
      ).addTo(lMapRef.current);
    }

    // Fit bounds to all markers
    const valid = markers.filter(m => m.lat && m.lng);
    if (valid.length > 1) {
      lMapRef.current.fitBounds(
        L.latLngBounds(valid.map(m => [m.lat, m.lng])),
        { padding: [30, 30] }
      );
    } else if (valid.length === 1) {
      lMapRef.current.setView([valid[0].lat, valid[0].lng], zoom);
    }
  }, [markers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Show user position ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!lMapRef.current || !position) return;

    if (userMkrRef.current) { userMkrRef.current.remove(); userMkrRef.current = null; }

    const icon = L.divIcon({
      html: `
        <div style="
          width:18px;height:18px;border-radius:50%;
          background:#3b82f6;border:3px solid white;
          box-shadow:0 0 0 4px rgba(59,130,246,0.3);
        "></div>
      `,
      iconSize:   [18, 18],
      iconAnchor: [9, 9],
      className:  "",
    });

    userMkrRef.current = L.marker([position.lat, position.lng], { icon })
      .addTo(lMapRef.current);

    // Distance callback
    if (onDistanceCalc && markers.length > 0) {
      const first = markers.find(m => !m.isUser && m.lat && m.lng);
      if (first) {
        onDistanceCalc(
          haversineDistance(position.lat, position.lng, first.lat, first.lng)
        );
      }
    }
  }, [position]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full" style={{ height }}>
      {/* Leaflet map container */}
      <div ref={mapDivRef} className="w-full h-full" />

      {/* User location button */}
      {showUserBtn && (
        <button
          onClick={requestGeo}
          disabled={geoLoading}
          title="Vị trí của tôi"
          style={{ zIndex: 1000 }}
          className={`absolute bottom-10 right-2.5 w-10 h-10 rounded-full shadow-lg
                      flex items-center justify-center text-lg transition-all
                      ${position
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-white hover:bg-gray-50"
                      } ${geoLoading ? "animate-pulse" : ""}`}>
          {geoLoading ? "⏳" : "📍"}
        </button>
      )}

      {/* Geo error toast */}
      {geoError && (
        <div style={{ zIndex: 1000 }}
          className="absolute bottom-24 right-2.5 bg-red-50 dark:bg-red-900/80
                     text-red-700 dark:text-red-300 text-xs px-3 py-2 rounded-xl shadow max-w-48">
          {geoError}
        </div>
      )}

      {/* Info popup */}
      {infoLoc && (
        <div style={{ zIndex: 1000 }}
          className="absolute bottom-12 left-2.5 right-2.5 sm:left-2.5 sm:right-auto sm:w-64
                     bg-white dark:bg-slate-900 rounded-2xl shadow-xl border
                     border-gray-200 dark:border-slate-700 overflow-hidden">
          {infoLoc.img && (
            <img src={infoLoc.img} alt={infoLoc.title} className="w-full h-28 object-cover" />
          )}
          <div className="p-3">
            <p className="font-bold text-sm text-gray-900 dark:text-white">{infoLoc.title}</p>
            {infoLoc.description && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                {infoLoc.description}
              </p>
            )}
            {position && infoLoc.lat && infoLoc.lng && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5 font-medium">
                📍 Cách bạn {fmtDistance(
                  haversineDistance(position.lat, position.lng, infoLoc.lat, infoLoc.lng)
                )}
              </p>
            )}
            <div className="flex gap-2 mt-2.5">
              <a
                href={`https://www.openstreetmap.org/directions?to=${infoLoc.lat},${infoLoc.lng}`}
                target="_blank" rel="noreferrer"
                className="flex-1 text-center text-xs bg-blue-600 hover:bg-blue-700 text-white
                           py-1.5 rounded-lg font-semibold transition-colors">
                Chỉ đường
              </a>
              <button
                onClick={() => setInfoLoc(null)}
                className="px-3 text-xs text-gray-500 dark:text-slate-400 hover:bg-gray-100
                           dark:hover:bg-slate-800 rounded-lg transition-colors">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}