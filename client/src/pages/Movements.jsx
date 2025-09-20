import { Link, useParams } from "react-router-dom";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useMovementsWithFilters } from "../hooks/useMovementsWithFilters";
import AccountHeader from "../components/AccountHeader";
import MovementFilters from "../components/MovementFilters";
import MovementsList from "../components/MovementsList";

const Movements = () => {
  const { idAccount } = useParams();

  // 🎯 Hook integrador con toda la lógica
  const {
    account,
    movements,
    loading,
    loadingMore,
    pagination,
    filterOpen,
    dateFilter,
    filterType,
    toggleFilter,
    setStartDate,
    setEndDate,
    setType,
    handleApplyFilter,
    handleClearFilter,
    isFilterValid,
    getBalance,
    lastElementRef,
  } = useMovementsWithFilters(idAccount);

  return (
    <div className="p-4">
      {loading ? (
        <div className="flex justify-center items-center mt-10">
          <Icon
            icon="mingcute:loading-line"
            fontSize={40}
            className="animate-spin text-primary-500"
          />
        </div>
      ) : (
        <div>
          {/* 🏦 Header de la cuenta */}
          <AccountHeader account={account} balance={getBalance()} />

          {/* ➕ Botón de agregar movimiento */}
          <Link
            to="create"
            className="bg-primary text-white w-full rounded-xl shadow flex items-center gap-3 p-3 mb-3 hover:bg-primary-800 transition"
          >
            <Icon icon="mdi:plus" fontSize={24} />
            <span className="font-medium text-sm">Agregar movimiento</span>
          </Link>

          {/* 🔍 Filtros de movimientos */}
          <MovementFilters
            filterOpen={filterOpen}
            dateFilter={dateFilter}
            filterType={filterType}
            onToggleFilter={toggleFilter}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onTypeChange={setType}
            onApplyFilter={handleApplyFilter}
            onClearFilter={handleClearFilter}
            canApplyFilter={isFilterValid()}
          />

          {/* 📋 Lista de movimientos con scroll infinito */}
          <MovementsList
            movements={movements}
            loading={false} // El loading principal ya se maneja arriba
            loadingMore={loadingMore}
            pagination={pagination}
            lastElementRef={lastElementRef}
          />
        </div>
      )}
    </div>
  );
};

export default Movements;
