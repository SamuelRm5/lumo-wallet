import { Icon } from "@iconify/react/dist/iconify.js";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAccountsActive = location.pathname.startsWith("/accounts");
  const isHomeActive = location.pathname.startsWith("/home");
  const isDepositesActive = location.pathname.startsWith("/deposites");

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-gray-100 text-neutral-700">
      <aside className="fixed bottom-0 left-0 right-0 w-full shadow bg-blue-600 h-[50px] flex items-center justify-around text-2xl">
        <NavLink
          to="/home"
          className={`flex items-center justify-center h-full w-full ${
            isHomeActive
              ? "bg-blue-700 text-white"
              : "text-gray-300 hover:text-white transition-colors"
          }`}
        >
          <Icon icon="akar-icons:home" />
        </NavLink>

        <NavLink
          to="/accounts/deuda"
          className={`flex items-center justify-center h-full w-full ${
            isAccountsActive
              ? "bg-blue-700 text-white"
              : "text-gray-300 hover:text-white transition-colors"
          }`}
        >
          <Icon icon="material-symbols:account-balance-outline" />
        </NavLink>

        <NavLink
          to="/deposites"
          className={`flex items-center justify-center h-full w-full ${
            isDepositesActive
              ? "bg-blue-700 text-white"
              : "text-gray-300 hover:text-white transition-colors"
          }`}
        >
          <Icon icon="healthicons:low-income-level-outline-24px" />
        </NavLink>
      </aside>

      <div className="px-4 pt-16 w-full h-full overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out flex flex-col">
        <div className="fixed top-0 left-0 w-full h-12 bg-gray-100 z-10 flex items-center justify-end px-4 shadow">
          <button
            onClick={() => navigate(-1)}
            className="flex items-start gap-2 rounded-xl text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Icon
              icon="icon-park-outline:left"
              fontSize={24}
              className={`transition-transform duration-300 ease-in-out`}
            />
            Volver atrás
          </button>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
