import { useState, useEffect, useCallback } from "react";
import tourService from "../services/tour.service";

export function useTours() {
  const [tours, setTours]       = useState([]);
  const [pagination, setPag]    = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Filters
  const [page, setPage]           = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [filterCat, setFilterCat] = useState("");

  const fetchTours = useCallback(async (p = page) => {
    setLoading(true);
    setError("");
    try {
      const params = { page: p, limit: 15 };
      if (search)    params.search   = search;
      if (filterCat) params.category = filterCat;

      const result = activeTab === "pending"
        ? await tourService.getPending(params)
        : await tourService.getAll(params);

      setTours(result.tours);
      setPag(result.pagination);
      setPage(p);
    } catch (e) {
      setError(e.response?.data?.message || "Không thể tải danh sách tour");
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search, filterCat]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await tourService.getStats();
      setStats(result);
    } catch {}
  }, []);

  useEffect(() => { fetchTours(1); }, [activeTab, search, filterCat]);
  useEffect(() => { fetchStats(); }, []);

  const createTour = async (payload) => {
    await tourService.create(payload);
    fetchTours(page);
    fetchStats();
  };

  const approveTour = async (id, action, reason, makeTemplate) => {
    await tourService.approve(id, action, reason, makeTemplate);
    fetchTours(page);
    fetchStats();
  };

  const voteTour = async (id, vote, comment) => {
    await tourService.vote(id, vote, comment);
    fetchTours(page);
  };

  const removeTour = async (id) => {
    await tourService.remove(id);
    fetchTours(page);
    fetchStats();
  };

  return {
    tours, pagination, stats, loading, error,
    activeTab, setActiveTab,
    search, setSearch,
    filterCat, setFilterCat,
    fetchTours,
    createTour, approveTour, voteTour, removeTour,
  };
}