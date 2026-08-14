import { createContext, useState, useEffect, useContext } from "react";
import { api } from "../services/api";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Validar token al inicializar la aplicación
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem("token");

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        // Configurar token en axios
        api.setAuthToken(storedToken);

        // Validar token con el servidor
        const response = await api.validateToken();

        setToken(storedToken);
        setUser(response.user);
        setIsAuthenticated(true);
      } catch (error) {
        console.log("Token inválido, limpiando sesión...");
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  // Función de login (solo login, sin registro)
  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.login(email, password);

      setToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);

      // Guardar token en localStorage
      localStorage.setItem("token", response.token);

      // Configurar token en axios para futuras peticiones
      api.setAuthToken(response.token);

      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar contraseña
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.changePassword(currentPassword, newPassword);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Función de logout
  const logout = () => {
    clearSession();
  };

  // Limpiar sesión completamente
  const clearSession = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("token");
    api.clearAuthToken();
  };

  // Manejar expiración de token
  const handleTokenExpiration = () => {
    console.log("Token expirado, cerrando sesión...");
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        login,
        changePassword,
        logout,
        handleTokenExpiration,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};
