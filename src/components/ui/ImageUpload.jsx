import { useState, useRef, useCallback } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── Single image card ────────────────────────────────────────────────────────
function ImageCard({ img, onDelete, onSetPrimary, disabled }) {
  return (
    <div className={`relative group rounded-xl overflow-hidden border-2 transition-all
                     ${img.isPrimary
                       ? "border-blue-500 dark:border-blue-400"
                       : "border-transparent hover:border-gray-300 dark:hover:border-slate-600"}`}>
      <img src={img.url} alt={img.caption || "Location image"}
           className="w-full h-32 object-cover"/>

      {img.isPrimary && (
        <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px]
                        font-semibold px-2 py-0.5 rounded-full">
          Primary
        </div>
      )}

      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                      transition-opacity flex items-center justify-center gap-2">
        {!img.isPrimary && (
          <button onClick={() => onSetPrimary(img.public_id)} disabled={disabled}
            title="Set as primary"
            className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white
                       flex items-center justify-center transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
            </svg>
          </button>
        )}
        <button onClick={() => onDelete(img.public_id)} disabled={disabled}
          title="Delete image"
          className="w-8 h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white
                     flex items-center justify-center transition-colors disabled:opacity-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ImageUpload({
  locationId,
  images     = [],
  onChange,
  maxImages  = 10,
  disabled   = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [error,     setError]     = useState("");
  const [dragOver,  setDragOver]  = useState(false);
  const inputRef = useRef(null);

  const canUpload = images.length < maxImages && !disabled;

  // ─── Upload using fetch (NOT axios — avoids Content-Type override) ────────
  const handleFiles = useCallback(async (files) => {
    if (!locationId) {
      setError("Save the location first before uploading images.");
      return;
    }

    const allowed  = ["image/jpeg","image/jpg","image/png","image/webp"];
    const maxSize  = 5 * 1024 * 1024;
    const valid    = Array.from(files).filter(f => allowed.includes(f.type) && f.size <= maxSize);

    if (valid.length === 0) {
      setError("Only JPG, PNG, WEBP under 5MB are accepted.");
      return;
    }

    const remaining = maxImages - images.length;
    const toUpload  = valid.slice(0, remaining);

    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      toUpload.forEach(f => formData.append("images", f));

      const token = localStorage.getItem("token");

      // ✅ Use native fetch — browser sets Content-Type with correct boundary automatically
      const res = await fetch(
        `${BASE_URL}/upload/locations/${locationId}/images`,
        {
          method:  "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          // DO NOT set Content-Type — fetch will set multipart/form-data with boundary
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      onChange?.(data.data.images);
    } catch (e) {
      setError(e.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [locationId, images.length, maxImages, onChange]);

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (publicId) => {
    if (!confirm("Delete this image?")) return;
    setDeleting(publicId);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(
        `${BASE_URL}/upload/locations/${locationId}/images/${encodeURIComponent(publicId)}`,
        {
          method:  "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      onChange?.(data.data.images);
    } catch (e) {
      setError(e.message || "Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  // ─── Set primary ──────────────────────────────────────────────────────────
  const handleSetPrimary = async (publicId) => {
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(
        `${BASE_URL}/upload/locations/${locationId}/images/${encodeURIComponent(publicId)}/primary`,
        {
          method:  "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      onChange?.(data.data.images);
    } catch (e) {
      setError(e.message);
    }
  };

  // ─── Drag & drop ──────────────────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (canUpload) handleFiles(e.dataTransfer.files);
  }, [canUpload, handleFiles]);

  return (
    <div className="space-y-3">
      {/* Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <ImageCard key={img.public_id || img.url} img={img}
              onDelete={handleDelete}
              onSetPrimary={handleSetPrimary}
              disabled={!!deleting || uploading}/>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {canUpload && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl py-10 flex flex-col items-center
                      cursor-pointer transition-all duration-200
                      ${dragOver
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                        : "border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/5"
                      }
                      ${uploading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          <input ref={inputRef} type="file" multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}/>

          {uploading ? (
            <>
              <svg className="animate-spin w-8 h-8 text-blue-500 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Uploading to Cloudinary...</p>
            </>
          ) : (
            <>
              <svg className="w-10 h-10 text-blue-400 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"/>
              </svg>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                {dragOver ? "Drop images here" : "Click to upload or drag & drop"}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                JPG, PNG, WEBP · Max 5MB · {images.length}/{maxImages}
              </p>
            </>
          )}
        </div>
      )}

      {images.length >= maxImages && (
        <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
          Maximum {maxImages} images reached.
        </p>
      )}

      {!locationId && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10
                      border border-amber-200 dark:border-amber-400/20 rounded-xl px-3 py-2">
          ⚠ Save the location first, then you can upload images.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10
                      border border-red-200 dark:border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}