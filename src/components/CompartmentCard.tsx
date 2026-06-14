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
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-100 p-6 opacity-60">
        <h2 className="text-lg font-semibold text-gray-500">
          Slot {compartment.slot_number}
        </h2>
        <p className="mt-4 text-base font-medium text-gray-500">
          Not Configured
        </p>
        <p className="mt-2 text-sm text-gray-400">Awaiting hardware setup</p>
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
  const progressColor = isLowStock ? "bg-red-500" : "bg-green-500";

  return (
    <Link
      href={`/dashboard/compartment/${compartment.id}`}
      className="group block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">
            Slot {compartment.slot_number}
          </p>
          <h2 className="text-xl font-semibold text-gray-900">
            {compartment.product_name}
          </h2>
        </div>
        {isLowStock && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            Low Stock
          </span>
        )}
      </div>

      <p className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
        {formatStock(currentStock)} kg
        <span className="text-lg font-medium text-gray-400">
          {" "}
          / {formatStock(totalCapacity)} kg
        </span>
      </p>

      <div className="mb-6 h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      <span className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 group-hover:bg-gray-50">
        View Details
      </span>
    </Link>
  );
}
