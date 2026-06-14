import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import type { Compartment } from "@/types/database";

interface RefillRequestBody {
  compartment_id?: unknown;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RefillRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "compartment_id required" }, { status: 400 });
  }

  const { compartment_id } = body;

  if (typeof compartment_id !== "string" || compartment_id.length === 0) {
    return NextResponse.json({ error: "compartment_id required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: compartment, error: lookupError } = await admin
    .from("compartments")
    .select("*")
    .eq("id", compartment_id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: "Failed to process refill" },
      { status: 500 }
    );
  }

  if (!compartment) {
    return NextResponse.json({ error: "Compartment not found" }, { status: 404 });
  }

  const row = compartment as Compartment;

  if (row.status !== "active") {
    return NextResponse.json(
      { error: "Cannot refill an inactive compartment" },
      { status: 403 }
    );
  }

  const stockBefore = Number(row.current_stock);
  const stockAfter = Number(row.total_capacity);
  const now = new Date().toISOString();

  const { error: updateError } = await admin
    .from("compartments")
    .update({ current_stock: stockAfter, updated_at: now })
    .eq("id", row.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update stock" },
      { status: 500 }
    );
  }

  const { error: logError } = await admin.from("refill_logs").insert({
    compartment_id: row.id,
    refilled_by: user.id,
    stock_before: stockBefore,
  });

  if (logError) {
    return NextResponse.json(
      { error: "Failed to record refill log" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    compartment_id: row.id,
    stock_before: stockBefore,
    stock_after: stockAfter,
  });
}
