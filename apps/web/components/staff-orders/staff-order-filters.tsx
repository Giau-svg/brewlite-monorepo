import { staffStatusLabel } from "../../lib/staff-order-flow";
import { staffOrdersTheme as theme } from "../../lib/staff-orders-theme";
import { STAFF_ORDER_FLOW, type StaffOrderFilter } from "../../types/staff-order";

const FILTERS: StaffOrderFilter[] = ["ALL", ...STAFF_ORDER_FLOW];

function filterLabel(filter: StaffOrderFilter): string {
  return filter === "ALL" ? "Tất cả" : staffStatusLabel(filter);
}

export function StaffOrderFilters({
  value,
  onChange,
}: {
  value: StaffOrderFilter;
  onChange: (filter: StaffOrderFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc đơn theo trạng thái">
      {FILTERS.map((filter) => {
        const selected = value === filter;
        return (
          <button
            key={filter}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(filter)}
            className={`${theme.filter} ${selected ? theme.filterOn : "bg-white"}`}
          >
            {filterLabel(filter)}
          </button>
        );
      })}
    </div>
  );
}
