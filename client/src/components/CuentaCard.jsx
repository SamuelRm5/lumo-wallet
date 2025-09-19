import { useNavigate } from "react-router-dom";

const CuentaCard = ({ cuenta }) => {
  const navigate = useNavigate();

  return (
    <button
      className="bg-white w-full rounded-xl shadow p-4 px-6 flex justify-between items-center mb-3"
      onClick={() => navigate(`/accounts/movements/${cuenta.id}`)}
    >
      <div>
        <h2 className="text-lg font-semibold text-left">{cuenta.nombre}</h2>
        <p className="text-sm text-start text-gray-500 capitalize">
          {cuenta.descripcion || "Sin descripción"}
        </p>
      </div>
      <div
        className={`text-right ${
          cuenta.total < 0 ? "text-red-600" : "text-green-600"
        }`}
      >
        <p className="text-xl font-bold">
          {Number(cuenta.total).toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
          })}
        </p>
        <p className="text-xs text-gray-400">Saldo</p>
      </div>
    </button>
  );
};

export default CuentaCard;
