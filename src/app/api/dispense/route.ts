import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendLowStockPushNotifications } from "@/utils/send-low-stock-push";
import type { Compartment } from "@/types/database";

interface DispenseRequestBody {
  api_key?: unknown;
  amount?: unknown;
}

export async function POST(request: Request) {
  let body: DispenseRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { api_key, amount } = body;

  if (
    typeof api_key !== "string" ||
    api_key.length === 0 ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: compartment, error: lookupError } = await admin
    .from("compartments")
    .select("*")
    .eq("api_key", api_key)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: "Failed to process dispense" },
      { status: 500 }
    );
  }

  if (!compartment) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const row = compartment as Compartment;

  if (row.status !== "active") {
    return NextResponse.json(
      { error: "Compartment is not active" },
      { status: 403 }
    );
  }

  const stockBefore = Number(row.current_stock);
  const lowStockThreshold = Number(row.low_stock_threshold);
  let newStock = stockBefore - amount;
  let warning: string | undefined;

  if (newStock < 0) {
    newStock = 0;
    warning =
      "Requested amount exceeds available stock, clamped to 0";
  }

  const now = new Date().toISOString();

  const { error: updateError } = await admin
    .from("compartments")
    .update({ current_stock: newStock, updated_at: now })
    .eq("id", row.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update stock" },
      { status: 500 }
    );
  }

  const { error: logError } = await admin.from("dispense_logs").insert({
    compartment_id: row.id,
    amount,
    stock_before: stockBefore,
    stock_after: newStock,
  });

  if (logError) {
    return NextResponse.json(
      { error: "Failed to record dispense log" },
      { status: 500 }
    );
  }

  const lowStockAlert =
    stockBefore > lowStockThreshold && newStock <= lowStockThreshold;

  const response: Record<string, unknown> = {
    success: true,
    compartment_id: row.id,
    product_name: row.product_name,
    stock_before: stockBefore,
    stock_after: newStock,
    low_stock_alert: lowStockAlert,
  };

  if (warning) {
    response.warning = warning;
  }

  if (lowStockAlert) {
    void sendLowStockPushNotifications(
      admin,
      row.product_name,
      newStock
    ).catch((err) => {
      console.error("Low stock push notification failed:", err);
    });
  }

  return NextResponse.json(response);
}
