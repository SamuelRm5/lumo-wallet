import { Icon } from "@iconify/react/dist/iconify.js";

/**
 * Componente para filtros de movimientos con animación
 *
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.filterOpen - Si el panel está abierto
 * @param {Object} props.dateFilter - Estado del filtro de fechas
 * @param {string} props.filterType - Tipo de filtro seleccionado
 * @param {Function} props.onToggleFilter - Función para toggle del panel
 * @param {Function} props.onStartDateChange - Función para cambiar fecha inicio
 * @param {Function} props.onEndDateChange - Función para cambiar fecha fin
 * @param {Function} props.onTypeChange - Función para cambiar tipo
 * @param {Function} props.onApplyFilter - Función para aplicar filtro
 * @param {Function} props.onClearFilter - Función para limpiar filtro
 * @param {boolean} props.canApplyFilter - Si se puede aplicar el filtro
 */
const MovementFilters = ({
  filterOpen,
  dateFilter,
  filterType,
  onToggleFilter,
  onStartDateChange,
  onEndDateChange,
  onTypeChange,
  onApplyFilter,
  onClearFilter,
  canApplyFilter,
}) => {
  return (
    <div className="mb-5">
      {/* Botón de filtro */}
      <button
        onClick={onToggleFilter}
        className={`w-full rounded-xl shadow flex items-center justify-between p-3 transition-all duration-300 ${
          filterOpen || dateFilter.active
            ? "bg-primary-500 text-white"
            : "bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon icon="mdi:filter" fontSize={20} />
          <span className="font-medium text-sm">
            {dateFilter.active ? "Filtro activo" : "Filtrar por fechas"}
          </span>
        </div>
        <Icon
          icon={filterOpen ? "mdi:chevron-up" : "mdi:chevron-down"}
          fontSize={20}
          className={`transition-transform duration-300 ${
            filterOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Panel de filtros con animación */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          filterOpen ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
          {/* Inputs de fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha inicial
              </label>
              <input
                type="date"
                value={dateFilter.fechaInicio}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha final
              </label>
              <input
                type="date"
                value={dateFilter.fechaFin}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Filtro por tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de movimiento
            </label>
            <div className="flex gap-2">
              {["", "ingreso", "egreso"].map((tipo) => (
                <button
                  key={tipo || "todos"}
                  onClick={() => onTypeChange(tipo)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    filterType === tipo
                      ? "bg-primary-500 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tipo === ""
                    ? "Todos"
                    : tipo === "ingreso"
                    ? "💰 Ingresos"
                    : "💸 Egresos"}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onApplyFilter}
              disabled={!canApplyFilter}
              className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-primary-700 transition-all"
            >
              <Icon icon="mdi:magnify" className="inline mr-2" />
              Aplicar filtro
            </button>
            {dateFilter.active && (
              <button
                onClick={onClearFilter}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-all"
              >
                <Icon icon="mdi:filter-off" className="inline mr-2" />
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Indicador de filtro activo */}
      {dateFilter.active && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 mt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon
                icon="mdi:filter"
                className="text-primary-500"
                fontSize={16}
              />
              <span className="text-sm font-medium text-primary-700">
                Filtro: {dateFilter.fechaInicio} a {dateFilter.fechaFin}
                {filterType &&
                  ` • ${filterType === "ingreso" ? "Ingresos" : "Egresos"}`}
              </span>
            </div>
            <button
              onClick={onClearFilter}
              className="text-primary-500 hover:text-primary-700 transition-colors"
            >
              <Icon icon="mdi:close" fontSize={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovementFilters;
