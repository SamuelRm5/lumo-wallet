import axios from "axios";

// Crear instancia de axios
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1",
  timeout: 10000,
});

// ✅ Interceptor para manejar errores de autenticación
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem("token");
      window.dispatchEvent(new CustomEvent("auth:token-expired"));
    }
    return Promise.reject(error);
  }
);

export const api = {
  // ✅ Configurar token de autorización
  setAuthToken: (token) => {
    if (token) {
      instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  },

  // ✅ Limpiar token de autorización
  clearAuthToken: () => {
    delete instance.defaults.headers.common["Authorization"];
  },

  // ===== ENDPOINTS DE AUTENTICACIÓN =====

  // ✅ Login de usuario
  login: async (email, password) => {
    try {
      const response = await instance.post("/auth/login", {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Error al iniciar sesión");
    }
  },

  // ✅ Validar token
  validateToken: async () => {
    try {
      const response = await instance.get("/auth/validate");
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Token inválido");
    }
  },

  // ✅ Obtener perfil de usuario
  getProfile: async () => {
    try {
      const response = await instance.get("/auth/profile");
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Error al obtener perfil");
    }
  },

  // ✅ Cambiar contraseña
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await instance.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Error al cambiar contraseña"
      );
    }
  },

  // ===== ENDPOINTS EXISTENTES (Ya protegidos por token) =====
  getAccounts: async () => {
    try {
      const response = await instance.get("/cuentas");
      return response.data;
    } catch (error) {
      console.error("Error fetching accounts:", error);
      throw error;
    }
  },
  getAccount: async (type) => {
    try {
      const response = await instance.get(`/cuentas/tipo/${type}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching account:", error);
      throw error;
    }
  },
  createAccount: async (data) => {
    try {
      const response = await instance.post("/cuentas", data);
      return response.data;
    } catch (error) {
      console.error("Error creating account:", error);
      throw error;
    }
  },
  getMovements: async (accountId) => {
    try {
      const response = await instance.get(`/movimientos/${accountId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching movements:", error);
      throw error;
    }
  },
  getMovement: async (id) => {
    try {
      const response = await instance.get(`/movimientos/byid/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching movement:", error);
      throw error;
    }
  },
  createMovement: async (idAccount, data) => {
    try {
      const response = await instance.post(`/movimientos/${idAccount}`, data);
      return response.data;
    } catch (error) {
      console.error("Error creating movement:", error);
      throw error;
    }
  },
  updateMovement: async (id, data) => {
    try {
      const response = await instance.put(`/movimientos/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Error updating movement:", error);
      throw error;
    }
  },
  deleteMovement: async (id) => {
    try {
      const response = await instance.delete(`/movimientos/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting movement:", error);
      throw error;
    }
  },
};
