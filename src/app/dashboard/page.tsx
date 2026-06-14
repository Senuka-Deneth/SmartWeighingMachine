import DashboardClient from "./DashboardClient";
import { createClient } from "@/utils/supabase/server";
import type { Compartment, Machine } from "@/types/database";

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: machine, error: machineError } = await supabase
    .from("machines")
    .select("*")
    .eq("machine_number", 1)
    .single();

  if (machineError || !machine) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-red-600">
          Failed to load machine data. Please try again later.
        </p>
      </div>
    );
  }

  const { data: compartments, error: compartmentsError } = await supabase
    .from("compartments")
    .select("*")
    .eq("machine_id", machine.id)
    .order("slot_number", { ascending: true });

  if (compartmentsError || !compartments) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-red-600">
          Failed to load compartment data. Please try again later.
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
