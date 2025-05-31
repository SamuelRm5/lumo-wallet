import { Link } from "react-router-dom";

const MovementCard = ({ movement }) => {
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
      <p className="text-sm text-gray-500">
        {new Date(movement.createdAt).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
        })}
      </p>
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
