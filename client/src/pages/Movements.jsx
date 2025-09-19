import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import { Icon } from "@iconify/react/dist/iconify.js";
import MovementCard from "../components/MovementCard";

const Movements = () => {
  const { idAccount } = useParams();

  const [account, setAccount] = useState({});
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const response = await api.getMovements(idAccount);

        setAccount(response.cuenta);
        setMovements(response.movimientos);
      } catch (error) {
        console.error("Error al obtener cuentas por tipo:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, [idAccount]);

  return (
    <div className="p-4">
      {loading ? (
        <div className="flex justify-center items-center mt-10">
          <Icon
            icon="mingcute:loading-line"
            fontSize={40}
            className="animate-spin text-primary-500"
          />
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {account.nombre}
            </h1>

            <span
              className={`text-lg font-semibold ${
                movements.reduce(
                  (t, m) => (m.tipo === "ingreso" ? t + m.monto : t - m.monto),
                  0
                ) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {movements
                .reduce((total, movement) => {
                  return movement.tipo === "ingreso"
                    ? total + movement.monto
                    : total - movement.monto;
                }, 0)
                .toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                })}
            </span>
          </div>

          {/* Botón de agregar movimiento */}
          <Link
            to="create"
            className="bg-primary text-white w-full rounded-xl shadow flex items-center gap-3 p-3 mb-5 hover:bg-primary-800 transition"
          >
            <Icon icon="mdi:plus" fontSize={24} />
            <span className="font-medium text-sm">Agregar movimiento</span>
          </Link>

          {/* Lista de movimientos */}
          <div className="grid gap-2">
            {movements.length > 0 ? (
              movements.map((movement) => (
                <MovementCard key={movement.id} movement={movement} />
              ))
            ) : (
              <p className="text-center text-gray-500 italic">
                No hay movimientos registrados.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Movements;
