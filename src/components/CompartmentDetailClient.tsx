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
  const [refillLogs] = useState(initialRefillLogs);

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
  const progressColor = isLowStock ? "bg-red-500" : "bg-green-500";

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
          setDispenseLogs((prev) => [newLog, ...prev].slice(0, 20));
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

      setCompartment((prev) => ({
        ...prev,
        current_stock: totalCapacity,
        updated_at: new Date().toISOString(),
      }));
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
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </Link>

        <header className="mt-4">
          <p className="text-sm font-medium text-gray-500">
            Slot {compartment.slot_number}
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            {compartment.product_name}
          </h1>
        </header>

        {/* Stock Overview */}
        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-4xl font-bold tracking-tight text-gray-900">
              {formatStock(currentStock)} kg
              <span className="text-xl font-medium text-gray-400">
                {" "}
                / {formatStock(totalCapacity)} kg
              </span>
            </p>
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

          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Last updated <RelativeTime iso={compartment.updated_at} />
          </p>
        </section>

        {/* Refill */}
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Refill</h2>
          <p className="mt-1 text-sm text-gray-500">
            Reset stock to full capacity after refilling the compartment.
          </p>
          <button
            type="button"
            onClick={() => {
              setRefillMessage(null);
              setShowRefillModal(true);
            }}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refill to {formatStock(totalCapacity)}kg
          </button>
          {refillMessage && (
            <p
              className={`mt-3 text-sm ${
                refillMessage.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {refillMessage.text}
            </p>
          )}
        </section>

        {/* Threshold Editor */}
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Low Stock Threshold</h2>
          <p className="mt-1 text-sm text-gray-500">
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
                  className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={thresholdLoading}
                />
                <span className="text-sm text-gray-500">kg</span>
                <button
                  type="button"
                  onClick={handleThresholdSave}
                  disabled={thresholdLoading}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {thresholdLoading ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleThresholdCancel}
                  disabled={thresholdLoading}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="text-lg font-semibold text-gray-900">
                  {formatStock(lowThreshold)} kg
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setThresholdMessage(null);
                    setEditingThreshold(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  aria-label="Edit threshold"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                    />
                  </svg>
                  Edit
                </button>
              </>
            )}
          </div>

          {thresholdMessage && (
            <p
              className={`mt-3 text-sm ${
                thresholdMessage.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {thresholdMessage.text}
            </p>
          )}
        </section>

        {/* Dispense History */}
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Dispense History</h2>
          {dispenseLogs.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No dispense activity yet</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Amount Dispensed
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Stock Change
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dispenseLogs.map((log, index) => (
                    <tr
                      key={log.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td
                        className="whitespace-nowrap px-4 py-3 text-gray-900"
                        title={formatAbsoluteTime(log.created_at)}
                      >
                        <RelativeTime iso={log.created_at} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                        {formatStock(Number(log.amount))} kg
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                        {formatStock(Number(log.stock_before))} kg →{" "}
                        {formatStock(Number(log.stock_after))} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Refill History */}
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Refill History</h2>
          {refillLogs.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No refill activity yet</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Stock Before Refill
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Refilled To
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {refillLogs.map((log, index) => (
                    <tr
                      key={log.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td
                        className="whitespace-nowrap px-4 py-3 text-gray-900"
                        title={formatAbsoluteTime(log.created_at)}
                      >
                        <RelativeTime iso={log.created_at} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                        {formatStock(Number(log.stock_before))} kg
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-900">
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

      {/* Refill confirmation modal */}
      {showRefillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close modal"
            onClick={() => !refillLoading && setShowRefillModal(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Confirm Refill</h3>
            <p className="mt-3 text-sm text-gray-600">
              Reset {compartment.product_name} stock from{" "}
              {formatStock(currentStock)}kg to {formatStock(totalCapacity)}kg?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRefillModal(false)}
                disabled={refillLoading}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRefillConfirm}
                disabled={refillLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
