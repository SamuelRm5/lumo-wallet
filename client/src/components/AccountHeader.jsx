/**
 * Componente para mostrar información de la cuenta y balance
 *
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.account - Información de la cuenta
 * @param {number} props.balance - Balance calculado
 */
const AccountHeader = ({ account, balance }) => {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-800">{account.nombre}</h1>

      <span
        className={`text-lg font-semibold ${
          balance >= 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        {balance.toLocaleString("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        })}
      </span>
    </div>
  );
};

export default AccountHeader;
