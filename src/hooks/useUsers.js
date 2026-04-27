import { useState, useEffect, useCallback } from "react";
import userService from "../services/user.service";

export function useUsers() {
  const [users, setUsers]       = useState([]);
  const [pagination, setPag]    = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Filters
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [filterRole, setFilterRole]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchUsers = useCallback(async (p = page) => {
    setLoading(true);
    setError("");
    try {
      const params = { page: p, limit: 15 };
      if (search)       params.search = search;
      if (filterRole)   params.role   = filterRole;
      if (filterStatus) params.status = filterStatus;
      const result = await userService.getAll(params);
      setUsers(result.users);
      setPag(result.pagination);
      setPage(p);
    } catch (e) {
      setError(e.response?.data?.message || "Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterRole, filterStatus]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await userService.getStats();
      setStats(result);
    } catch {}
  }, []);

  useEffect(() => { fetchUsers(1); }, [search, filterRole, filterStatus]);
  useEffect(() => { fetchStats(); }, []);

  const createUser = async (payload) => {
    await userService.create(payload);
    fetchUsers(page);
    fetchStats();
  };

  const updateUser = async (id, payload) => {
    await userService.update(id, payload);
    fetchUsers(page);
  };

  const changeStatus = async (id, status) => {
    await userService.changeStatus(id, status);
    fetchUsers(page);
  };

  const removeUser = async (id) => {
    await userService.remove(id);
    fetchUsers(page);
    fetchStats();
  };

  return {
    users, pagination, stats, loading, error,
    search, setSearch,
    filterRole, setFilterRole,
    filterStatus, setFilterStatus,
    fetchUsers,
    createUser, updateUser, changeStatus, removeUser,
  };
}