import { Icon } from "@iconify/react/dist/iconify.js";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router";

const MainLayout = () => {
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-gray-100 text-neutral-700">
      <aside
        className={`absolute h-full w-[80vw] flex flex-row-reverse items-start p-4 bg-white z-30 shadow transition-transform duration-300 ease-in-out
      ${isSidebarOpen ? "translate-x-0" : "-translate-x-[100%]"}
    `}
      >
        <button
          onClick={toggleSidebar}
          className={`absolute right-0 top-0 p-4 h-full flex items-start`}
        >
          <Icon
            icon="icon-park-outline:left-small"
            fontSize={24}
            className={`text-neutral-600 transition-transform duration-300 ease-in-out`}
          />
        </button>

        <div className="flex flex-col mt-8 w-full text-lg">
          <h1 className="text-xl font-semibold mb-5 flex items-center gap-4 text-blue-600">
            <span>
              <Icon
                icon="material-symbols:account-tree-outline-rounded"
                fontSize={30}
              />
            </span>
            Cuentas Meli
          </h1>
          <button
            onClick={() => handleNavigation("home")}
            className="flex items-center gap-4 p-3"
          >
            <Icon icon="akar-icons:home" className="text-neutral-500" />
            <p className="font-semibold">Inicio</p>
          </button>
          <button
            onClick={() => handleNavigation("accounts/deuda")}
            className="flex items-center gap-4 p-3"
          >
            <Icon
              icon="material-symbols:account-balance-outline"
              className="text-neutral-500"
            />
            <p className="font-semibold">Cuentas</p>
          </button>
          <button
            onClick={() => handleNavigation("deposites")}
            className="flex items-center gap-4 p-3"
          >
            <Icon
              icon="healthicons:low-income-level-outline-24px"
              className="text-neutral-500"
            />
            <p className="font-semibold">Depósitos</p>
          </button>
        </div>
      </aside>
      <div
        hidden={!isSidebarOpen}
        className="w-full h-full bg-[#000000ba] absolute z-20"
        onClick={() => setIsSidebarOpen(false)}
      ></div>
      <div className="px-4 pt-16 w-full h-full overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out flex flex-col">
        <div className="fixed top-0 left-0 w-full h-12 bg-gray-100 z-10 flex items-center justify-between px-4 shadow">
          <button onClick={toggleSidebar}>
            <Icon
              icon="icon-park-outline:left-small"
              fontSize={24}
              className={`text-neutral-600 rotate-180 transition-transform duration-300 ease-in-out`}
            />
          </button>
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
