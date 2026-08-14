import { useAuth } from "../context/AuthContext";
import { Icon } from "@iconify/react";
import Login from "./Login";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Mostrar loading mientras valida token
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center">
          <Icon
            icon="mingcute:loading-line"
            fontSize={40}
            className="animate-spin text-primary-500"
          />
          <p className="mt-4 text-gray-600">Validando sesión...</p>
        </div>
      </div>
    );
  }

  // Mostrar login si no está autenticado
  if (!isAuthenticated) {
    return <Login />;
  }

  // Mostrar contenido protegido si está autenticado
  return children;
};

export default ProtectedRoute;
