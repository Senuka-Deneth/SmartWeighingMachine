"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Compartment, DispenseLog, RefillLog } from "@/types/database";
import { createClient } from "@/utils/supabase/client";

interface CompartmentDetailClientProps {
  compartment: Compartment;
  initialDispenseLogs: DispenseLog[];
  initialRefillLogs: RefillLog[];
}

function formatStock(value: number): string {
  const num = Number(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRelativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 0) return "just now";
  if (seconds < 60) return seconds <= 1 ? "just now" : `${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? "1 day ago" : `${days} days ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;

  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

function RelativeTime({ iso }: { iso: string }) {
  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setRelative(formatRelativeTime(iso));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [iso]);

  return <>{relative ?? formatAbsoluteTime(iso)}</>;
}

export default function CompartmentDetailClient({
  compartment: initialCompartment,
  initialDispenseLogs,
  initialRefillLogs,
}: CompartmentDetailClientProps) {
  const [compartment, setCompartment] = useState(initialCompartment);
  const [dispenseLogs, setDispenseLogs] = useState(initialDispenseLogs);
  const [refillLogs, setRefillLogs] = useState(initialRefillLogs);

  const [showRefillModal, setShowRefillModal] = useState(false);
  const [refillLoading, setRefillLoading] = useState(false);
  const [refillMessage, setRefillMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [editingThreshold, setEditingThreshold] = useState(false);
  const [thresholdInput, setThresholdInput] = useState(
    String(initialCompartment.low_stock_threshold)
  );
  const [thresholdLoading, setThresholdLoading] = useState(false);
  const [thresholdMessage, setThresholdMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const currentStock = Number(compartment.current_stock);
  const totalCapacity = Number(compartment.total_capacity);
  const lowThreshold = Number(compartment.low_stock_threshold);
  const fillPercent = Math.min(
    100,
    Math.max(0, (currentStock / totalCapacity) * 100)
  );
  const isLowStock = currentStock <= lowThreshold;
  const progressColor = isLowStock ? "bg-stone-500" : "bg-stone-700";
  const isAtFullCapacity = currentStock >= totalCapacity;

  function prependRefillLog(log: RefillLog) {
    setRefillLogs((prev) => {
      if (prev.some((entry) => entry.id === log.id)) {
        return prev;
      }
      return [log, ...prev].slice(0, 10);
    });
  }

  function prependDispenseLog(log: DispenseLog) {
    setDispenseLogs((prev) => {
      if (prev.some((entry) => entry.id === log.id)) {
        return prev;
      }
      return [log, ...prev].slice(0, 20);
    });
  }

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`compartment-detail-${compartment.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "compartments",
          filter: `id=eq.${compartment.id}`,
        },
        (payload) => {
          const updated = payload.new as Compartment;
          setCompartment((prev) => ({
            ...prev,
            current_stock: updated.current_stock,
            low_stock_threshold: updated.low_stock_threshold,
            updated_at: updated.updated_at,
          }));
          setThresholdInput(String(updated.low_stock_threshold));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dispense_logs",
          filter: `compartment_id=eq.${compartment.id}`,
        },
        (payload) => {
          const newLog = payload.new as DispenseLog;
          prependDispenseLog(newLog);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "refill_logs",
          filter: `compartment_id=eq.${compartment.id}`,
        },
        (payload) => {
          const newLog = payload.new as RefillLog;
          prependRefillLog(newLog);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [compartment.id]);

  async function handleRefillConfirm() {
    setRefillLoading(true);
    setRefillMessage(null);

    try {
      const response = await fetch("/api/refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compartment_id: compartment.id }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? `Refill failed (${response.status})`);
      }

      const data = await response.json();

      setCompartment((prev) => ({
        ...prev,
        current_stock: data.stock_after,
        updated_at: data.updated_at ?? new Date().toISOString(),
      }));

      if (data.refill_log) {
        prependRefillLog(data.refill_log as RefillLog);
      }

      setRefillMessage({ type: "success", text: "Stock refilled successfully." });
      setShowRefillModal(false);
    } catch (err) {
      setRefillMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Refill failed. Please try again.",
      });
    } finally {
      setRefillLoading(false);
    }
  }

  async function handleThresholdSave() {
    const value = Number(thresholdInput);
    if (Number.isNaN(value) || value < 0) {
      setThresholdMessage({
        type: "error",
        text: "Please enter a valid threshold (0 or greater).",
      });
      return;
    }

    setThresholdLoading(true);
    setThresholdMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("compartments")
      .update({ low_stock_threshold: value })
      .eq("id", compartment.id);

    setThresholdLoading(false);

    if (error) {
      setThresholdMessage({
        type: "error",
        text: error.message ?? "Failed to update threshold.",
      });
      return;
    }

    setCompartment((prev) => ({ ...prev, low_stock_threshold: value }));
    setEditingThreshold(false);
    setThresholdMessage({ type: "success", text: "Threshold updated." });
  }

  function handleThresholdCancel() {
    setThresholdInput(String(compartment.low_stock_threshold));
    setEditingThreshold(false);
    setThresholdMessage(null);
  }

  return (
    <div className="page-shell">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="link-subtle">
          ← Back to dashboard
        </Link>

        <header className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Slot {compartment.slot_number}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            {compartment.product_name}
          </h1>
        </header>

        <section className="card mt-8 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              {formatStock(currentStock)}
              <span className="text-lg font-normal text-stone-400"> kg</span>
              <span className="text-base font-normal text-stone-400">
                {" "}
                / {formatStock(totalCapacity)} kg
              </span>
            </p>
            {isLowStock && (
              <span className="badge-attention shrink-0">Low stock</span>
            )}
          </div>

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>

          <p className="mt-4 text-sm text-stone-500">
            Last updated <RelativeTime iso={compartment.updated_at} />
          </p>
        </section>

        <section className="card mt-5 p-6">
          <h2 className="text-base font-semibold text-stone-900">Refill</h2>
          <p className="mt-1 text-sm text-stone-500">
            Reset stock to full capacity after refilling the compartment.
          </p>
          <button
            type="button"
            onClick={() => {
              setRefillMessage(null);
              setShowRefillModal(true);
            }}
            disabled={isAtFullCapacity || refillLoading}
            className="btn-primary mt-4 disabled:cursor-not-allowed"
          >
            Refill to {formatStock(totalCapacity)} kg
          </button>
          {isAtFullCapacity && (
            <p className="mt-2 text-sm text-stone-500">
              Stock is already at full capacity.
            </p>
          )}
          {refillMessage && (
            <p className="mt-3 text-sm text-stone-600">{refillMessage.text}</p>
          )}
        </section>

        <section className="card mt-5 p-6">
          <h2 className="text-base font-semibold text-stone-900">
            Low stock threshold
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Alert when stock falls at or below this level (kg).
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {editingThreshold ? (
              <>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  className="input-field w-28 py-2 text-sm"
                  disabled={thresholdLoading}
                />
                <span className="text-sm text-stone-500">kg</span>
                <button
                  type="button"
                  onClick={handleThresholdSave}
                  disabled={thresholdLoading}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {thresholdLoading ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleThresholdCancel}
                  disabled={thresholdLoading}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="text-lg font-semibold text-stone-900">
                  {formatStock(lowThreshold)} kg
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setThresholdMessage(null);
                    setEditingThreshold(true);
                  }}
                  className="btn-secondary px-3 py-1.5 text-sm"
                  aria-label="Edit threshold"
                >
                  Edit
                </button>
              </>
            )}
          </div>

          {thresholdMessage && (
            <p className="mt-3 text-sm text-stone-600">{thresholdMessage.text}</p>
          )}
        </section>

        <section className="card mt-5 p-6">
          <h2 className="text-base font-semibold text-stone-900">
            Dispense history
          </h2>
          {dispenseLogs.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">No dispense activity yet</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="px-3 py-3 text-left font-medium text-stone-500">
                      Timestamp
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-stone-500">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-stone-500">
                      Stock change
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {dispenseLogs.map((log) => (
                    <tr key={log.id}>
                      <td
                        className="whitespace-nowrap px-3 py-3 text-stone-700"
                        title={formatAbsoluteTime(log.created_at)}
                      >
                        <RelativeTime iso={log.created_at} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-stone-700">
                        {formatStock(Number(log.amount))} kg
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-stone-700">
                        {formatStock(Number(log.stock_before))} →{" "}
                        {formatStock(Number(log.stock_after))} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card mt-5 p-6">
          <h2 className="text-base font-semibold text-stone-900">
            Refill history
          </h2>
          {refillLogs.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">No refill activity yet</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="px-3 py-3 text-left font-medium text-stone-500">
                      Timestamp
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-stone-500">
                      Before refill
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-stone-500">
                      Refilled to
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {refillLogs.map((log) => (
                    <tr key={log.id}>
                      <td
                        className="whitespace-nowrap px-3 py-3 text-stone-700"
                        title={formatAbsoluteTime(log.created_at)}
                      >
                        <RelativeTime iso={log.created_at} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-stone-700">
                        {formatStock(Number(log.stock_before))} kg
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-stone-700">
                        {formatStock(totalCapacity)} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {showRefillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40"
            aria-label="Close modal"
            onClick={() => !refillLoading && setShowRefillModal(false)}
          />
          <div className="card relative w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-stone-900">Confirm refill</h3>
            <p className="mt-3 text-sm text-stone-600">
              Reset {compartment.product_name} stock from{" "}
              {formatStock(currentStock)} kg to {formatStock(totalCapacity)} kg?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRefillModal(false)}
                disabled={refillLoading}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRefillConfirm}
                disabled={refillLoading}
                className="btn-primary"
              >
                {refillLoading ? "Refilling…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
