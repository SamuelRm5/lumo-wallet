import dayjs from "dayjs";
import "dayjs/locale/es"; // Importar el locale español
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Link } from "react-router-dom";

// Configurar dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es"); // Establecer español como locale por defecto

const MovementCard = ({ movement }) => {
  const fecha = dayjs(movement.createdAt)
    .tz("America/Bogota")
    .format("D [de] MMMM [del] YYYY, HH:mm");

  return (
    <Link
      to={`/accounts/movements/${movement.id}/edit`}
      className={`p-4 flex flex-col items-start ${
        movement.tipo === "ingreso"
          ? "border-l-2 border-green-500"
          : "border-l-2 border-red-500"
      }`}
    >
      <h2 className="text-lg font-semibold leading-tight">
        {movement.descripcion}
      </h2>
      <p className="text-sm text-gray-500">{fecha}</p>
      <p
        className={`text-xl font-bold ${
          movement.tipo === "ingreso" ? "text-green-600" : "text-red-600"
        }`}
      >
        {Number(movement.monto).toLocaleString("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        })}
      </p>
    </Link>
  );
};

export default MovementCard;
