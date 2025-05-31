import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./pages/MainLayout";
import CuentasPage from "./pages/CuentasPage";
import CreateAccount from "./pages/CreateAccount";
import Movements from "./pages/Movements";
import CreateMovement from "./pages/CreateMovement";
import Home from "./pages/Home";
import Deposites from "./pages/Deposites";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index path="home" element={<Home />} />
        <Route path="deposites" element={<Deposites />} />
        <Route path="accounts/:type" element={<CuentasPage />} />
        <Route path="accounts/create/:type" element={<CreateAccount />} />
        <Route path="accounts/movements/:idAccount" element={<Movements />} />
        <Route
          path="accounts/movements/:idType/:type"
          element={<CreateMovement />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/home" />} />
    </Routes>
  );
}

export default App;
