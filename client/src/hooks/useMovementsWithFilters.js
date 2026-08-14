import { useEffect, useCallback } from "react";
import { useMovements } from "./useMovements";
import { useMovementFilters } from "./useMovementFilters";
import { useInfiniteScroll } from "./useInfiniteScroll";

/**
 * Hook integrador para manejar movimientos con filtros y scroll infinito
 *
 * @param {string} accountId - ID de la cuenta
 * @returns {Object} - Estado y funciones combinadas
 */
export const useMovementsWithFilters = (accountId) => {
  // Hook de movimientos
  const {
    account,
    movements,
    loading,
    loadingMore,
    pagination,
    loadMovements,
    loadFilteredMovements,
    getBalance,
    resetMovements,
  } = useMovements(accountId);

  // Hook de filtros
  const {
    filterOpen,
    dateFilter,
    filterType,
    applyFilter,
    clearFilter,
    toggleFilter,
    setStartDate,
    setEndDate,
    setType,
    getActiveFilters,
    isFilterValid,
  } = useMovementFilters();

  // Función para cargar más páginas (para scroll infinito)
  const loadMoreMovements = useCallback(() => {
    const nextPage = pagination.currentPage + 1;
    const filters = getActiveFilters();

    if (filters) {
      loadFilteredMovements(filters, nextPage);
    } else {
      loadMovements(nextPage);
    }
  }, [
    pagination.currentPage,
    getActiveFilters,
    loadFilteredMovements,
    loadMovements,
  ]);

  // Hook de scroll infinito
  const lastElementRef = useInfiniteScroll(
    loadMoreMovements,
    pagination.hasNextPage,
    loadingMore
  );

  // Cargar datos iniciales
  useEffect(() => {
    if (accountId) {
      resetMovements();
      loadMovements(1);
    }
  }, [accountId, loadMovements, resetMovements]);

  // Aplicar filtros cuando se activan
  useEffect(() => {
    if (dateFilter.active) {
      const filters = getActiveFilters();
      if (filters) {
        resetMovements();
        loadFilteredMovements(filters, 1);
      }
    }
  }, [
    dateFilter.active,
    getActiveFilters,
    loadFilteredMovements,
    resetMovements,
  ]);

  // Función para aplicar filtro
  const handleApplyFilter = useCallback(() => {
    const applied = applyFilter();
    if (!applied) {
      console.warn("No se puede aplicar el filtro: faltan fechas");
    }
  }, [applyFilter]);

  // Función para limpiar filtros
  const handleClearFilter = useCallback(() => {
    clearFilter();
    resetMovements();
    loadMovements(1);
  }, [clearFilter, resetMovements, loadMovements]);

  return {
    // Estado de movimientos
    account,
    movements,
    loading,
    loadingMore,
    pagination,

    // Estado de filtros
    filterOpen,
    dateFilter,
    filterType,

    // Funciones de filtros
    toggleFilter,
    setStartDate,
    setEndDate,
    setType,
    handleApplyFilter,
    handleClearFilter,
    isFilterValid,

    // Utilidades
    getBalance,
    lastElementRef,
  };
};
