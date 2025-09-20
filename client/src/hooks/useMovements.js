import { useState, useCallback } from "react";
import { api } from "../services/api";

/**
 * 🚀 Hook personalizado para manejar movimientos con paginación
 *
 * @param {string} accountId - ID de la cuenta
 * @returns {Object} - Estado y funciones para manejar movimientos
 */
export const useMovements = (accountId) => {
  const [account, setAccount] = useState({});
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
  });

  // 📦 Función para cargar movimientos (sin filtros)
  const loadMovements = useCallback(
    async (page = 1) => {
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const response = await api.getMovements(accountId, page);

        if (page === 1) {
          // Primera carga
          setAccount(response.cuenta);
          setMovements(response.movimientos);
        } else {
          // Cargar más (append)
          setMovements((prev) => [...prev, ...response.movimientos]);
        }

        setPagination(response.paginacion);
      } catch (error) {
        console.error("Error al obtener movimientos:", error);
        throw error;
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [accountId]
  );

  // 🔍 Función para cargar movimientos con filtros
  const loadFilteredMovements = useCallback(
    async (filters, page = 1) => {
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const response = await api.getMovementsByDateRange(
          filters.fechaInicio,
          filters.fechaFin,
          accountId,
          filters.tipo,
          page
        );

        if (page === 1) {
          // Primera carga filtrada
          setMovements(response.movimientos);
        } else {
          // Cargar más (append)
          setMovements((prev) => [...prev, ...response.movimientos]);
        }

        setPagination(response.paginacion);
      } catch (error) {
        console.error("Error al obtener movimientos filtrados:", error);
        throw error;
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [accountId]
  );

  // 🧮 Función para obtener balance (ahora viene del backend)
  const getBalance = useCallback(() => {
    // Si el balance viene del backend, usarlo; sino calcular en frontend
    if (account && typeof account.balance === "number") {
      return account.balance;
    }

    // Fallback: calcular en frontend si no viene del backend
    return movements.reduce((total, movement) => {
      return movement.tipo === "ingreso"
        ? total + movement.monto
        : total - movement.monto;
    }, 0);
  }, [account, movements]);

  // 🔄 Función para reiniciar estado
  const resetMovements = useCallback(() => {
    setMovements([]);
    setPagination({
      currentPage: 1,
      totalPages: 1,
      hasNextPage: false,
    });
  }, []);

  return {
    // Estado
    account,
    movements,
    loading,
    loadingMore,
    pagination,

    // Funciones
    loadMovements,
    loadFilteredMovements,
    getBalance,
    resetMovements,

    // Setters para casos específicos
    setMovements,
    setPagination,
    setAccount,
  };
};
