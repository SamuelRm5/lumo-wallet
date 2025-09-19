import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./pages/ProtectedRoute";
import MainLayout from "./pages/MainLayout";
import CuentasPage from "./pages/CuentasPage";
import CreateAccount from "./pages/CreateAccount";
import Movements from "./pages/Movements";
import CreateMovement from "./pages/CreateMovement";
import Home from "./pages/Home";
import Deposites from "./pages/Deposites";
import ChangePassword from "./pages/ChangePassword";

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            {/* Redirección desde / hacia /home */}
            <Route index element={<Navigate to="/home" replace />} />

            {/* Rutas internas */}
            <Route path="home" element={<Home />} />
            <Route path="deposites" element={<Deposites />} />
            <Route path="accounts/:type" element={<CuentasPage />} />
            <Route path="accounts/create/:type" element={<CreateAccount />} />
            <Route
              path="accounts/movements/:idAccount"
              element={<Movements />}
            />
            <Route
              path="accounts/movements/:idType/:type"
              element={<CreateMovement />}
            />
          </Route>

          {/* Ruta especial para cambio de contraseña (fuera del layout principal) */}
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Ruta para cualquier otra no definida */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
