import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { Icon } from "@iconify/react/dist/iconify.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const getFechaColombia = () => {
  return dayjs().tz("America/Bogota").format("YYYY-MM-DDTHH:mm");
};

const CreateMovement = () => {
  const { idType, type } = useParams();
  const navigate = useNavigate();

  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [amountFormat, setAmountFormat] = useState("$ 0");
  const [inputs, setInputs] = useState({
    monto: 0,
    descripcion: "",
    tipo: "ingreso",
    fecha: getFechaColombia(),
  });

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, ""); // Eliminar caracteres no numéricos
    const formattedValue = value
      ? `$ ${parseFloat(value).toLocaleString()}`
      : "$ 0";
    setAmountFormat(formattedValue);
    setInputs({ ...inputs, monto: parseFloat(value) || 0 });
  };

  const createMovement = async (e) => {
    e.preventDefault();

    const request = type === "edit" ? api.updateMovement : api.createMovement;

    try {
      setLoading(true);
      const response = await request(idType, {
        descripcion: inputs.descripcion,
        monto: inputs.monto,
        tipo: inputs.tipo,
        createdAt: inputs.fecha,
      });

      console.log("Response from API:", response);

      if (response.error) {
        alert(response.error);
        return;
      }

      navigate(
        `/accounts/movements/${type === "edit" ? response.cuentaId : idType}`
      );
      // Redirigir o mostrar un mensaje de éxito
    } catch (error) {
      console.error("Error al agregar el movimiento:", error);
      alert("Error al agregar movimiento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMovements = async () => {
      try {
        setLoadingData(true);
        const response = await api.getMovement(idType);
        if (response.error) {
          alert(response.error);
          return navigate("/accounts/movements/");
        }
        setInputs({
          descripcion: response.movimiento.descripcion,
          monto: response.movimiento.monto,
          tipo: response.movimiento.tipo,
          fecha: dayjs(response.movimiento.createdAt)
            .tz("America/Bogota")
            .format("YYYY-MM-DDTHH:mm"),
        });
        setAmountFormat(`$ ${response.movimiento.monto.toLocaleString()}`);
      } catch (error) {
        console.error("Error al obtener el movimiento:", error);
        alert("Error al obtener el movimiento");
        return navigate("/accounts/movements/");
      } finally {
        setLoadingData(false);
      }
    };
    if (type === "edit" && idType) {
      fetchMovements();
    } else setLoadingData(false);
  }, [type, idType, navigate]);

  return (
    <div>
      <h1 className="font-semibold text-lg">Agregar movimiento</h1>
      {loadingData ? (
        <div className="flex justify-center items-center mt-10">
          <Icon
            icon="mingcute:loading-line"
            fontSize={40}
            className="animate-spin text-blue-500"
          />
        </div>
      ) : (
        <form onSubmit={createMovement} className="mt-4 grid gap-4">
          {/* Tipo de movimiento */}
          <div>
            <label className="text-sm text-neutral-500 block mb-1">Tipo</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 p-2 rounded border text-sm font-medium transition
            ${
              inputs.tipo === "ingreso"
                ? "bg-green-100 text-green-700 border-green-500"
                : "bg-white border-neutral-300 text-neutral-600"
            }`}
                onClick={() => setInputs({ ...inputs, tipo: "ingreso" })}
              >
                Ingreso
              </button>
              <button
                type="button"
                className={`flex-1 p-2 rounded border text-sm font-medium transition
            ${
              inputs.tipo === "egreso"
                ? "bg-red-100 text-red-700 border-red-500"
                : "bg-white border-neutral-300 text-neutral-600"
            }`}
                onClick={() => setInputs({ ...inputs, tipo: "egreso" })}
              >
                Egreso
              </button>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-sm text-neutral-500">Descripción</label>
            <input
              value={inputs.descripcion}
              onChange={(e) =>
                setInputs({ ...inputs, descripcion: e.target.value })
              }
              className="border border-neutral-300 rounded w-full p-2 px-4 focus:outline-blue-600 bg-white"
              type="text"
            />
          </div>

          {/* Monto */}
          <div>
            <label className="text-sm text-neutral-500">Monto</label>
            <input
              value={amountFormat}
              onChange={handleAmountChange}
              className="border border-neutral-300 rounded w-full p-2 px-4 focus:outline-blue-600 bg-white"
              min="0"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="$0"
            />
          </div>

          {/* Fecha y hora */}
          <div>
            <label
              htmlFor="fecha"
              className="text-sm text-neutral-500 block mb-1"
            >
              Fecha y hora
            </label>
            <input
              id="fecha"
              name="fecha"
              type="datetime-local"
              value={inputs.fecha}
              onChange={(e) => setInputs({ ...inputs, fecha: e.target.value })}
              required
              className="border h-[42px] border-neutral-300 rounded w-full p-2 px-4 focus:outline-blue-600 bg-white"
            />
          </div>

          {/* Botón guardar */}
          <button
            disabled={loading}
            type="submit"
            className="mt-6 w-full h-[40px] bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {loading ? (
              <p className="text-white w-full flex items-center justify-center">
                <Icon
                  icon="mingcute:loading-line"
                  fontSize={25}
                  className="animate-spin"
                />
              </p>
            ) : (
              `${type === "edit" ? "Actualizar" : "Guardar"}`
            )}
          </button>
          {type === "edit" && (
            <button
              className="mt-2 w-full h-[40px] border border-red-500 text-red-500 rounded transition-colors"
              onClick={async (e) => {
                e.preventDefault();
                if (
                  window.confirm("¿Estás seguro de eliminar este movimiento?")
                ) {
                  try {
                    setLoading(true);
                    const response = await api.deleteMovement(idType);
                    if (response.error) {
                      alert(response.error);
                      return;
                    }

                    navigate(`/accounts/movements/${response.cuentaId}`);
                  } catch (error) {
                    console.error("Error al eliminar el movimiento:", error);
                    alert("Error al eliminar el movimiento");
                  } finally {
                    setLoading(false);
                  }
                }
              }}
            >
              Eliminar movimiento
            </button>
          )}
        </form>
      )}
    </div>
  );
};

export default CreateMovement;
