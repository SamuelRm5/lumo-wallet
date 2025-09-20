import { useState, useCallback } from "react";

/**
 * 🔍 Hook para manejar filtros de movimientos
 *
 * @returns {Object} - Estado y funciones para manejar filtros
 */
export const useMovementFilters = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    fechaInicio: "",
    fechaFin: "",
    active: false,
  });
  const [filterType, setFilterType] = useState(""); // 'ingreso', 'egreso', o ''

  // 🎯 Aplicar filtro
  const applyFilter = useCallback(() => {
    if (dateFilter.fechaInicio && dateFilter.fechaFin) {
      setDateFilter((prev) => ({ ...prev, active: true }));
      return true; // Indica que el filtro se aplicó
    }
    return false; // Indica que faltan datos para aplicar
  }, [dateFilter.fechaInicio, dateFilter.fechaFin]);

  // 🧹 Limpiar filtros
  const clearFilter = useCallback(() => {
    setDateFilter({
      fechaInicio: "",
      fechaFin: "",
      active: false,
    });
    setFilterType("");
    setFilterOpen(false);
  }, []);

  // 🔄 Toggle panel de filtros
  const toggleFilter = useCallback(() => {
    setFilterOpen((prev) => !prev);
  }, []);

  // 📅 Actualizar fecha de inicio
  const setStartDate = useCallback((fecha) => {
    setDateFilter((prev) => ({
      ...prev,
      fechaInicio: fecha,
    }));
  }, []);

  // 📅 Actualizar fecha de fin
  const setEndDate = useCallback((fecha) => {
    setDateFilter((prev) => ({
      ...prev,
      fechaFin: fecha,
    }));
  }, []);

  // 🏷️ Establecer tipo de filtro
  const setType = useCallback((tipo) => {
    setFilterType(tipo);
  }, []);

  // 📊 Obtener filtros activos para la API
  const getActiveFilters = useCallback(() => {
    if (!dateFilter.active) return null;

    return {
      fechaInicio: dateFilter.fechaInicio,
      fechaFin: dateFilter.fechaFin,
      tipo: filterType,
    };
  }, [
    dateFilter.active,
    dateFilter.fechaInicio,
    dateFilter.fechaFin,
    filterType,
  ]);

  // ✅ Validar si los filtros están completos
  const isFilterValid = useCallback(() => {
    return dateFilter.fechaInicio && dateFilter.fechaFin;
  }, [dateFilter.fechaInicio, dateFilter.fechaFin]);

  return {
    // Estado
    filterOpen,
    dateFilter,
    filterType,

    // Funciones de control
    applyFilter,
    clearFilter,
    toggleFilter,

    // Funciones de actualización
    setStartDate,
    setEndDate,
    setType,

    // Utilidades
    getActiveFilters,
    isFilterValid,
  };
};
