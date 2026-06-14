import Link from "next/link";
import { notFound } from "next/navigation";
import CompartmentDetailClient from "@/components/CompartmentDetailClient";
import { requireAuth } from "@/utils/supabase/require-auth";
import type { Compartment, DispenseLog, RefillLog } from "@/types/database";

interface CompartmentDetailPageProps {
  params: { id: string };
}

export default async function CompartmentDetailPage({
  params,
}: CompartmentDetailPageProps) {
  const { supabase } = await requireAuth();

  const { data: compartment, error: compartmentError } = await supabase
    .from("compartments")
    .select("*")
    .eq("id", params.id)
    .single();

  if (compartmentError || !compartment) {
    notFound();
  }

  if (compartment.status === "inactive") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <p className="text-lg font-medium text-gray-700">
          This compartment is not configured
        </p>
        <Link
          href="/dashboard"
          className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const [{ data: dispenseLogs }, { data: refillLogs }] = await Promise.all([
    supabase
      .from("dispense_logs")
      .select("*")
      .eq("compartment_id", params.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("refill_logs")
      .select("*")
      .eq("compartment_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <CompartmentDetailClient
      compartment={compartment as Compartment}
      initialDispenseLogs={(dispenseLogs ?? []) as DispenseLog[]}
      initialRefillLogs={(refillLogs ?? []) as RefillLog[]}
    />
  );
}
