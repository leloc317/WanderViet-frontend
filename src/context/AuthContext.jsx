import { createContext, useContext, useState, useEffect, useRef } from "react";
import api from "../lib/axios";

export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false); // chống StrictMode double-invoke

  useEffect(() => {
    if (fetchedRef.current) return; // skip lần 2
    fetchedRef.current = true;

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) fetchMe();
    else setLoading(false);
  }, []);

  const fetchMe = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user ?? data.data);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    const { data } = await api.post("/auth/login", { email, password, rememberMe });
    const token = data.token ?? data.data?.token;
    const user  = data.user  ?? data.data?.user;
    // Remember me → localStorage (persist), else → sessionStorage (clears on tab close)
    if (rememberMe) {
      localStorage.setItem("token", token);
      sessionStorage.removeItem("token");
    } else {
      sessionStorage.setItem("token", token);
      localStorage.removeItem("token");
    }
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}