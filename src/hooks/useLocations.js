import { useState, useEffect, useCallback } from "react";
import locationService from "../services/location.service";

export function useLocations() {
  const [locations, setLocations] = useState([]);
  const [pagination, setPag]      = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // Filters
  const [page, setPage]           = useState(1);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "pending"
  const [search, setSearch]       = useState("");
  const [filterCat, setFilterCat] = useState("");

  const fetchLocations = useCallback(async (p = page) => {
    setLoading(true);
    setError("");
    try {
      const params = { page: p, limit: 15 };
      if (search)    params.search   = search;
      if (filterCat) params.category = filterCat;

      const result = activeTab === "pending"
        ? await locationService.getPending(params)
        : await locationService.getAll(params);

      setLocations(result.locations);
      setPag(result.pagination);
      setPage(p);
    } catch (e) {
      setError(e.response?.data?.message || "Không thể tải danh sách địa điểm");
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search, filterCat]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await locationService.getStats();
      setStats(result);
    } catch {}
  }, []);

  useEffect(() => { fetchLocations(1); }, [activeTab, search, filterCat]);
  useEffect(() => { fetchStats(); }, []);

  const createLocation = async (payload) => {
    await locationService.create(payload);
    fetchLocations(page);
    fetchStats();
  };

  const updateLocation = async (id, payload) => {
    await locationService.update(id, payload);
    fetchLocations(page);
  };

  const approveLocation = async (id, action, reason) => {
    await locationService.approve(id, action, reason);
    fetchLocations(page);
    fetchStats();
  };

  const removeLocation = async (id) => {
    await locationService.remove(id);
    fetchLocations(page);
    fetchStats();
  };

  return {
    locations, pagination, stats, loading, error,
    activeTab, setActiveTab,
    search, setSearch,
    filterCat, setFilterCat,
    fetchLocations,
    createLocation, updateLocation, approveLocation, removeLocation,
  };
}