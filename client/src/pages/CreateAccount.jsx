import React, { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { Icon } from "@iconify/react/dist/iconify.js";

const CreateAccount = () => {
  const { type } = useParams();
  const nameRef = useRef(null);
  const navigate = useNavigate();

  const [loading, setLoading] = React.useState(false);
  const [inputs, setInputs] = React.useState({
    name: "",
    description: "",
  });

  const createAccount = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const response = await api.createAccount({
        nombre: inputs.name,
        descripcion: inputs.description,
        tipo: type,
      });

      if (response.error) {
        alert(response.error);
        return;
      }

      type === "normal"
        ? navigate("/deposites")
        : navigate("/accounts/" + type);
      // Redirigir o mostrar un mensaje de éxito
    } catch (error) {
      console.error("Error al crear la cuenta:", error);
      alert("Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  return (
    <div>
      <h1 className="font-semibold text-lg grid">
        Crear {type === "normal" ? "depósito" : "cuenta"}
        <span className="text-sm text-neutral-500 capitalize">{type}</span>
      </h1>
      <form onSubmit={createAccount} className="mt-4 grid gap-4">
        <div>
          <label className="text-sm text-neutral-500">
            Nombre de la cuenta
          </label>
          <input
            ref={nameRef}
            value={inputs.name}
            onChange={(e) => setInputs({ ...inputs, name: e.target.value })}
            className="border border-neutral-300 rounded w-full p-2 px-4 focus:outline-blue-600 bg-white"
            type="text"
          />
        </div>
        <div>
          <label className="text-sm text-neutral-500">
            Descripción (opcional)
          </label>
          <input
            value={inputs.description}
            onChange={(e) =>
              setInputs({ ...inputs, description: e.target.value })
            }
            className="border border-neutral-300 rounded w-full p-2 px-4 focus:outline-blue-600 bg-white"
            type="text"
          />
        </div>
        <button
          disabled={loading}
          type="submit"
          className="mt-10 w-full h-[40px] bg-blue-600 text-white rounded p-2 px-4 hover:bg-blue-700 transition-colors"
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
            "Guardar"
          )}
        </button>
      </form>
    </div>
  );
};

export default CreateAccount;
