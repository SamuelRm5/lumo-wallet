import { Icon } from "@iconify/react/dist/iconify.js";
import MovementCard from "./MovementCard";

/**
 * 📋 Componente para renderizar lista de movimientos con scroll infinito
 *
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.movements - Array de movimientos
 * @param {boolean} props.loading - Si está cargando la primera página
 * @param {boolean} props.loadingMore - Si está cargando más páginas
 * @param {Object} props.pagination - Información de paginación
 * @param {Function} props.lastElementRef - Ref para el último elemento (IntersectionObserver)
 */
const MovementsList = ({
  movements,
  loading,
  loadingMore,
  pagination,
  lastElementRef,
}) => {
  // 🔄 Indicador de carga inicial
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Icon
          icon="mingcute:loading-line"
          fontSize={32}
          className="animate-spin text-primary-500"
        />
        <span className="ml-3 text-gray-600">Cargando movimientos...</span>
      </div>
    );
  }

  // 📋 Lista de movimientos
  return (
    <div className="grid gap-2">
      {movements.length > 0 ? (
        movements.map((movement, index) => {
          // 🎯 Asignar ref al último elemento para IntersectionObserver
          if (movements.length === index + 1) {
            return (
              <div ref={lastElementRef} key={movement.id}>
                <MovementCard movement={movement} />
              </div>
            );
          }
          return <MovementCard key={movement.id} movement={movement} />;
        })
      ) : (
        <div className="text-center py-8">
          <Icon
            icon="mdi:file-document-outline"
            fontSize={48}
            className="text-gray-300 mx-auto mb-3"
          />
          <p className="text-gray-500 italic">
            No hay movimientos registrados.
          </p>
        </div>
      )}

      {/* 🔄 Indicador de carga para más movimientos */}
      {loadingMore && (
        <div className="flex justify-center items-center py-4">
          <Icon
            icon="mingcute:loading-line"
            fontSize={24}
            className="animate-spin text-primary-500"
          />
          <span className="ml-2 text-sm text-gray-600">
            Cargando más movimientos...
          </span>
        </div>
      )}

      {/* 📊 Información de paginación final */}
      {movements.length > 0 && !pagination.hasNextPage && (
        <div className="text-center py-4 text-sm text-gray-500 border-t border-gray-200 mt-4">
          <Icon
            icon="mdi:check-circle"
            className="inline mr-1 text-green-500"
          />
          Todos los movimientos cargados (
          {pagination.totalItems || movements.length} total)
        </div>
      )}
    </div>
  );
};

export default MovementsList;
