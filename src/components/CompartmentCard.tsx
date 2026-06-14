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
      <div className="card flex min-h-[200px] flex-col items-center justify-center border-dashed border-palette-accent bg-palette-accent-light p-6 opacity-90">
        <h2 className="text-base font-medium text-muted">
          Slot {compartment.slot_number}
        </h2>
        <p className="mt-3 text-sm text-muted">Not configured</p>
        <p className="mt-1 text-xs text-muted">Awaiting hardware setup</p>
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
      className="card group block p-6 transition-colors hover:border-palette-primary focus:outline-none focus:ring-2 focus:ring-palette-primary-light focus:ring-offset-2"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-palette-primary">
            Slot {compartment.slot_number}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {compartment.product_name}
          </h2>
        </div>
        {isLowStock && (
          <span className="badge-warning shrink-0">Low stock</span>
        )}
      </div>

      <p className="mb-4 text-3xl font-semibold tracking-tight text-foreground">
        {formatStock(currentStock)}
        <span className="text-base font-normal text-muted"> kg</span>
        <span className="text-sm font-normal text-muted">
          {" "}
          / {formatStock(totalCapacity)} kg
        </span>
      </p>

      <div className="progress-track mb-5">
        <div
          className={isLowStock ? "progress-fill-warning" : "progress-fill-success"}
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      <span className="text-sm font-medium text-palette-primary transition-colors group-hover:text-palette-primary-hover">
        View details →
      </span>
    </Link>
  );
}
