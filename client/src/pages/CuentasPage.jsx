import { useEffect, useState } from "react";
import CuentaCard from "../components/CuentaCard";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { Link, useNavigate, useParams } from "react-router-dom";

const CuentasPage = () => {
  const { type: accountType } = useParams();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const response = await api.getAccount(accountType);
        setAccounts(response);
      } catch (error) {
        console.error("Error al obtener cuentas por tipo:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, [accountType]);

  return (
    <div>
      <h1 className="font-semibold text-lg">Cuentas</h1>
      <div className="w-full flex my-4 h-10">
        <button
          onClick={() => navigate("/accounts/deuda")}
          className={`border border-r-0 border-blue-600 ${
            accountType === "deuda"
              ? "bg-blue-600 text-white font-semibold"
              : "text-blue-600"
          } rounded-l-md w-full`}
        >
          Deudas
        </button>
        <button
          onClick={() => navigate("/accounts/fuente")}
          className={`border border-blue-600 ${
            accountType === "fuente"
              ? "bg-blue-600 text-white font-semibold"
              : "text-blue-600"
          } rounded-r-md w-full`}
        >
          Fuentes
        </button>
      </div>
      {!loading && (
        <Link
          to={`/accounts/create/${accountType}`}
          className="bg-white w-full rounded-xl shadow gap-2 p-4 flex items-center mb-3 hover:bg-blue-50 transition-colors"
        >
          <Icon icon="mdi:plus" fontSize={30} className="text-blue-600" />
          <span className="text-blue-600 font-semibold">Agregar Cuenta</span>
        </Link>
      )}
      <div>
        {loading ? (
          <div className="flex justify-center items-center mt-10">
            <Icon
              icon="mingcute:loading-line"
              fontSize={40}
              className="animate-spin text-blue-500"
            />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex justify-center items-center mt-10">
            <p className="text-gray-500">No hay cuentas registradas</p>
          </div>
        ) : (
          accounts.map((cuenta) => (
            <CuentaCard key={cuenta.id} cuenta={cuenta} />
          ))
        )}
      </div>
    </div>
  );
};

export default CuentasPage;
