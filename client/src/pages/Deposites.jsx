import { useEffect, useState } from "react";
import CuentaCard from "../components/CuentaCard";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { Link } from "react-router-dom";

const Deposites = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const response = await api.getAccount("normal");
        setAccounts(response);
      } catch (error) {
        console.error("Error al obtener cuentas por tipo:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  return (
    <div>
      <h1 className="font-semibold text-lg mb-4">Depósitos</h1>
      {!loading && (
        <Link
          to={`/accounts/create/normal`}
          className="bg-white w-full rounded-xl shadow gap-2 p-4 flex items-center mb-3 hover:bg-primary-50 transition-colors"
        >
          <Icon icon="mdi:plus" fontSize={30} className="text-primary" />
          <span className="text-primary font-semibold">Agregar depósito</span>
        </Link>
      )}
      <div>
        {loading ? (
          <div className="flex justify-center items-center mt-10">
            <Icon
              icon="mingcute:loading-line"
              fontSize={40}
              className="animate-spin text-primary-500"
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

export default Deposites;
