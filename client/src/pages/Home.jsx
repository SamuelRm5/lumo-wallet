import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Icon } from "@iconify/react/dist/iconify.js";

const Home = () => {
  const [totales, setTotales] = useState({
    totalNormal: 0,
    totalDeuda: 0,
    totalFuente: 0,
  });
  const [accounts, setAccounts] = useState({
    normal: [],
    deuda: [],
    fuente: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const response = await api.getAccounts();
        setAccounts(
          response.reduce(
            (acc, account) => {
              const cuenta = {
                ...account,
                total: parseInt(account.total, 10), // ✅ convierte el total a número
              };

              if (cuenta.tipo === "normal") {
                acc.normal.push(cuenta);
              } else if (cuenta.tipo === "deuda") {
                acc.deuda.push(cuenta);
              } else if (cuenta.tipo === "fuente") {
                acc.fuente.push(cuenta);
              }
              return acc;
            },
            { normal: [], deuda: [], fuente: [] }
          )
        );
        setTotales({
          totalNormal: response
            .filter((account) => account.tipo === "normal")
            .reduce((total, account) => total + parseInt(account.total, 10), 0),
          totalDeuda: response
            .filter((account) => account.tipo === "deuda")
            .reduce((total, account) => total + parseInt(account.total, 10), 0),
          totalFuente: response
            .filter((account) => account.tipo === "fuente")
            .reduce((total, account) => total + parseInt(account.total, 10), 0),
        });
      } catch (error) {
        console.error("Error al obtener cuentas por tipo:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  const diferencia =
    totales.totalNormal + Math.abs(totales.totalDeuda) - totales.totalFuente;

  return loading ? (
    <div className="w-full grid place-content-center">
      <div className="flex justify-center items-center mt-10">
        <Icon
          icon="mingcute:loading-line"
          fontSize={40}
          className="animate-spin text-blue-500"
        />
      </div>
    </div>
  ) : (
    <div className="w-full grid gap-6">
      {/* Resumen */}
      <div
        className={`mt-4 p-4 rounded-lg shadow text-white font-bold ${
          diferencia > 0
            ? "bg-green-600"
            : diferencia < 0
            ? "bg-red-600"
            : "bg-blue-600"
        } text-sm`}
      >
        {diferencia > 0 ? (
          <p className="text-green-700  flex justify-between items-center">
            Tienes un excedente de{" "}
            <span className="text-green-800 font-bold text-lg">
              {diferencia.toLocaleString("es-CO", {
                style: "currency",
                currency: "COP",
                minimumFractionDigits: 0,
              })}
            </span>
          </p>
        ) : diferencia < 0 ? (
          <p className="flex justify-between items-center">
            Te faltan{" "}
            <span className="font-bold text-lg">
              {Math.abs(diferencia).toLocaleString("es-CO", {
                style: "currency",
                currency: "COP",
                minimumFractionDigits: 0,
              })}
            </span>
          </p>
        ) : (
          <p>Todo está cuadrado</p>
        )}
      </div>

      {/* Lo que debe haber */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold text-blue-700 mb-3">
          Lo que debe haber
        </h2>

        {accounts.fuente.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {/* Lista de cuentas */}
            {accounts.fuente.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm text-gray-700 font-medium">
                  {account.nombre}
                </span>
                <span className="text-sm text-green-700 font-semibold">
                  {parseInt(account.total).toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            ))}

            {/* Total */}
            <div className="flex items-center justify-between pt-4 text-base font-semibold text-gray-800">
              <span>Total disponible</span>
              <span className="text-blue-700">
                {totales.totalFuente.toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-neutral-500 text-sm">
            No hay cuentas disponibles.
          </p>
        )}
      </div>

      {/* Lo que hay */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold text-blue-700 mb-3">Lo que hay</h2>

        {accounts.normal.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {/* Lista de cuentas */}
            {accounts.normal.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm text-gray-700 font-medium">
                  {account.nombre}
                </span>
                <span className="text-sm text-green-700 font-semibold">
                  {parseInt(account.total).toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            ))}

            {/* Deudas */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700 font-medium">Deudas</span>
              <span className="text-sm text-green-700 font-semibold">
                {Math.abs(totales.totalDeuda).toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-4 text-base font-semibold text-gray-800">
              <span>Total disponible</span>
              <span className="text-blue-700">
                {(
                  totales.totalNormal + Math.abs(totales.totalDeuda)
                ).toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-neutral-500 text-sm">
            No hay cuentas disponibles.
          </p>
        )}
      </div>
    </div>
  );
};

export default Home;
