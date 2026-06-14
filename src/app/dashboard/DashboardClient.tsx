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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function DashboardClient({
  machine,
  initialCompartments,
}: DashboardClientProps) {
  const router = useRouter();
  const [compartments, setCompartments] =
    useState<Compartment[]>(initialCompartments);
  const [showAlertBanner, setShowAlertBanner] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [enablingAlerts, setEnablingAlerts] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (Notification.permission === "default") {
      setShowAlertBanner(true);
    }
  }, []);

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

  async function handleEnableAlerts() {
    setAlertError(null);
    setEnablingAlerts(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setShowAlertBanner(false);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("Push notifications are not configured.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          vapidPublicKey
        ) as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionJson),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to enable alerts.");
      }

      setShowAlertBanner(false);
      setAlertsEnabled(true);
    } catch (err) {
      setAlertError(
        err instanceof Error ? err.message : "Failed to enable alerts."
      );
    } finally {
      setEnablingAlerts(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const isOnline = machine.status === "online";

  return (
    <div className="page-shell">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
              Dashboard
            </h1>
            <span className="badge">
              <span
                className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                  isOnline ? "bg-stone-600" : "bg-stone-300"
                }`}
              />
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-secondary shrink-0">
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {showAlertBanner && (
          <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm text-stone-600">
              Enable low-stock alerts to get notified when stock runs low
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEnableAlerts}
                disabled={enablingAlerts}
                className="btn-primary px-4 py-1.5 text-sm"
              >
                {enablingAlerts ? "Enabling…" : "Enable"}
              </button>
              <button
                type="button"
                onClick={() => setShowAlertBanner(false)}
                className="btn-ghost px-2 py-1.5"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {alertsEnabled && (
          <p className="card mb-6 px-4 py-3 text-sm text-stone-600">
            Low-stock alerts are enabled for this device
          </p>
        )}

        {alertError && (
          <p className="card mb-6 px-4 py-3 text-sm text-stone-700">
            {alertError}
          </p>
        )}

        <p className="mb-6 text-sm text-stone-500">
          Machine #{machine.machine_number} — {compartments.filter((c) => c.status === "active").length} active slot{compartments.filter((c) => c.status === "active").length !== 1 ? "s" : ""}
        </p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {compartments.map((compartment) => (
            <CompartmentCard key={compartment.id} compartment={compartment} />
          ))}
        </div>
      </main>
    </div>
  );
}
