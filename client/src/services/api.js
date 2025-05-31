import axios from "axios";

// Asegúrate de configurar la baseURL si aún no lo has hecho
const instance = axios.create({
  baseURL: "http://192.168.80.20:3000/api/v1", // ajusta al dominio real
  timeout: 5000,
});

export const api = {
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
