import Link from "next/link";
import type { Compartment } from "@/types/database";

interface CompartmentCardProps {
  compartment: Compartment;
}

function formatStock(value: number): string {
  const num = Number(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

export default function CompartmentCard({ compartment }: CompartmentCardProps) {
  if (compartment.status === "inactive") {
    return (
      <div className="card flex min-h-[200px] flex-col items-center justify-center border-dashed p-6 opacity-70">
        <h2 className="text-base font-medium text-stone-500">
          Slot {compartment.slot_number}
        </h2>
        <p className="mt-3 text-sm text-stone-400">Not configured</p>
        <p className="mt-1 text-xs text-stone-400">Awaiting hardware setup</p>
      </div>
    );
  }

  const currentStock = Number(compartment.current_stock);
  const totalCapacity = Number(compartment.total_capacity);
  const lowThreshold = Number(compartment.low_stock_threshold);
  const fillPercent = Math.min(
    100,
    Math.max(0, (currentStock / totalCapacity) * 100)
  );
  const isLowStock = currentStock <= lowThreshold;

  return (
    <Link
      href={`/dashboard/compartment/${compartment.id}`}
      className="card group block p-6 transition-colors hover:border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:ring-offset-2"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Slot {compartment.slot_number}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-stone-900">
            {compartment.product_name}
          </h2>
        </div>
        {isLowStock && (
          <span className="badge-attention shrink-0">Low stock</span>
        )}
      </div>

      <p className="mb-4 text-3xl font-semibold tracking-tight text-stone-900">
        {formatStock(currentStock)}
        <span className="text-base font-normal text-stone-400"> kg</span>
        <span className="text-sm font-normal text-stone-400">
          {" "}
          / {formatStock(totalCapacity)} kg
        </span>
      </p>

      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isLowStock ? "bg-stone-500" : "bg-stone-700"
          }`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      <span className="text-sm font-medium text-stone-500 transition-colors group-hover:text-stone-900">
        View details →
      </span>
    </Link>
  );
}
