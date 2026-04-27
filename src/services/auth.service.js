import api from "../lib/axios";

const authService = {
  // POST /api/auth/login → { success, token, user }
  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    return { token: data.token, user: data.user };
  },

  // GET /api/auth/me → { success, user }
  getMe: async () => {
    const { data } = await api.get("/auth/me");
    return data.user;
  },
};

export default authService;