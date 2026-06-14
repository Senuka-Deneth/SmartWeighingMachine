import DashboardClient from "./DashboardClient";
import { requireAuth } from "@/utils/supabase/require-auth";
import type { Compartment, Machine } from "@/types/database";

export default async function DashboardPage() {
  const { supabase } = await requireAuth();

  const { data: machine, error: machineError } = await supabase
    .from("machines")
    .select("*")
    .eq("machine_number", 1)
    .maybeSingle();

  if (machineError) {
    const detail =
      process.env.NODE_ENV === "development"
        ? machineError.message
        : "Please try again later.";

    return (
      <div className="page-shell flex items-center justify-center px-4">
        <p className="text-sm text-muted">
          Failed to load machine data. {detail}
        </p>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="page-shell flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="text-sm text-muted">
            No machine found. Run the seed migration to set up machine data.
          </p>
          <p className="mt-2 text-xs text-muted">
            Execute <code className="rounded bg-palette-primary-light px-1 text-palette-primary">supabase/migrations/002_seed_data.sql</code>{" "}
            in the Supabase SQL editor.
          </p>
        </div>
      </div>
    );
  }

  const { data: compartments, error: compartmentsError } = await supabase
    .from("compartments")
    .select("*")
    .eq("machine_id", machine.id)
    .order("slot_number", { ascending: true });

  if (compartmentsError || !compartments) {
    const detail =
      process.env.NODE_ENV === "development" && compartmentsError
        ? compartmentsError.message
        : "Please try again later.";

    return (
      <div className="page-shell flex items-center justify-center px-4">
        <p className="text-sm text-muted">
          Failed to load compartment data. {detail}
        </p>
      </div>
    );
  }

  return (
    <DashboardClient
      machine={machine as Machine}
      initialCompartments={compartments as Compartment[]}
    />
  );
}
