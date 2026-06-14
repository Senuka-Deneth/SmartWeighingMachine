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
        {showAlertBanner && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-900">
              Enable low-stock alerts to get notified instantly
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEnableAlerts}
                disabled={enablingAlerts}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {enablingAlerts ? "Enabling…" : "Enable"}
              </button>
              <button
                type="button"
                onClick={() => setShowAlertBanner(false)}
                className="rounded-md px-2 py-1.5 text-sm text-amber-800 hover:bg-amber-100"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {alertsEnabled && (
          <p className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Alerts enabled
          </p>
        )}

        {alertError && (
          <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {alertError}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {compartments.map((compartment) => (
            <CompartmentCard key={compartment.id} compartment={compartment} />
          ))}
        </div>
      </main>
    </div>
  );
}
