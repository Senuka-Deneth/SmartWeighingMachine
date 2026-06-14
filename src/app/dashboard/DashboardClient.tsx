"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CompartmentCard from "@/components/CompartmentCard";
import type { Compartment, Machine } from "@/types/database";
import { createClient } from "@/utils/supabase/client";

interface DashboardClientProps {
  machine: Machine;
  initialCompartments: Compartment[];
}

export default function DashboardClient({
  machine,
  initialCompartments,
}: DashboardClientProps) {
  const router = useRouter();
  const [compartments, setCompartments] =
    useState<Compartment[]>(initialCompartments);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`compartments-machine-${machine.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "compartments",
          filter: `machine_id=eq.${machine.id}`,
        },
        (payload) => {
          const updated = payload.new as Compartment;
          setCompartments((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [machine.id]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isOnline = machine.status === "online";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Smart Stock Monitor
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                isOnline
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <span
                className={`mr-1.5 h-2 w-2 rounded-full ${
                  isOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {compartments.map((compartment) => (
            <CompartmentCard key={compartment.id} compartment={compartment} />
          ))}
        </div>
      </main>
    </div>
  );
}
