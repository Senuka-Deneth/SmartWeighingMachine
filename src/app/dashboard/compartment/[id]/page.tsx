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
      <div className="page-shell flex flex-col items-center justify-center px-4">
        <p className="text-lg font-medium text-stone-700">
          This compartment is not configured
        </p>
        <Link href="/dashboard" className="link-subtle mt-6">
          ← Back to dashboard
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
