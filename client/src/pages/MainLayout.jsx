import { Icon } from "@iconify/react/dist/iconify.js";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAccountsActive = location.pathname.startsWith("/accounts");
  const isHomeActive = location.pathname.startsWith("/home");
  const isDepositesActive = location.pathname.startsWith("/deposites");

  // ✅ Función para navegación inteligente con texto contextual
  const getNavigationInfo = () => {
    const currentPath = location.pathname;

    if (currentPath.startsWith("/accounts/movements/")) {
      const segments = currentPath.split("/");
      const accountType = segments[4] || "deuda";
      const typeNames = {
        deuda: "Cuentas de Deuda",
        normal: "Cuentas Normales",
        fuente: "Fuentes de Ingreso",
      };
      return {
        action: () => navigate(`/accounts/${accountType}`),
        text: typeNames[accountType] || "Cuentas",
      };
    } else if (currentPath.startsWith("/accounts/create/")) {
      const segments = currentPath.split("/");
      const accountType = segments[3] || "deuda";
      const typeNames = {
        deuda: "Cuentas de Deuda",
        normal: "Cuentas Normales",
        fuente: "Fuentes de Ingreso",
      };
      return {
        action: () => navigate(`/accounts/${accountType}`),
        text: typeNames[accountType] || "Cuentas",
      };
    } else if (currentPath.startsWith("/accounts/")) {
      return {
        action: () => navigate("/home"),
        text: "Inicio",
      };
    } else if (currentPath === "/deposites") {
      return {
        action: () => navigate("/home"),
        text: "Inicio",
      };
    } else {
      return {
        action: () => navigate("/home"),
        text: "Inicio",
      };
    }
  };

  const navigationInfo = getNavigationInfo();

  // ✅ Función para manejar logout
  const handleLogout = () => {
    if (window.confirm("¿Estás seguro de cerrar sesión?")) {
      logout();
    }
    setShowUserMenu(false);
  };

  // ✅ Función para ir a cambio de contraseña
  const handleChangePassword = () => {
    navigate("/change-password");
    setShowUserMenu(false);
  };

  return (
    <div className="w-full h-svh overflow-hidden flex flex-col bg-gray-100 text-neutral-700">
      <div className="shrink-0 w-full h-12 bg-gray-100 flex items-center justify-between px-4 shadow">
        <button
          onClick={navigationInfo.action}
          className="flex items-center gap-2 rounded-xl text-primary hover:text-primary-700 transition-colors"
        >
          <Icon
            icon="icon-park-outline:left"
            fontSize={24}
            className="transition-transform duration-300 ease-in-out"
          />
          <span className="text-sm">{navigationInfo.text}</span>
        </button>

        {/* ✅ Menú de usuario */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
          >
            <span className="text-sm hidden sm:block">{user?.nombre}</span>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Icon
                icon="material-symbols:person"
                className="text-white text-lg"
              />
            </div>
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-300 z-50">
              <div className="p-3 border-b border-gray-300">
                <p className="text-sm font-medium text-gray-800">
                  {user?.nombre}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={handleChangePassword}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Icon icon="material-symbols:lock-outline" />
                  Cambiar contraseña
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Icon icon="material-symbols:logout" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay para cerrar menú */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      <div
        id="main-content"
        className="grow p-4 w-full overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out flex flex-col relative"
      >
        <Outlet />
      </div>

      <aside className="shrink-0 w-full shadow bg-primary h-[50px] flex items-center justify-around text-2xl rounded-t-xl overflow-hidden">
        <NavLink
          to="/home"
          className={`flex items-center justify-center h-full w-full ${
            isHomeActive
              ? "bg-primary-800 text-white"
              : "text-primary-300 hover:text-white transition-colors"
          }`}
        >
          <Icon icon="akar-icons:home" />
        </NavLink>

        <NavLink
          to="/accounts/deuda"
          className={`flex items-center justify-center h-full w-full ${
            isAccountsActive
              ? "bg-primary-800 text-white"
              : "text-primary-300 hover:text-white transition-colors"
          }`}
        >
          <Icon icon="material-symbols:account-balance-outline" />
        </NavLink>

        <NavLink
          to="/deposites"
          className={`flex items-center justify-center h-full w-full ${
            isDepositesActive
              ? "bg-primary-800 text-white"
              : "text-primary-300 hover:text-white transition-colors"
          }`}
        >
          <Icon icon="healthicons:low-income-level-outline-24px" />
        </NavLink>
      </aside>
    </div>
  );
};

export default MainLayout;
