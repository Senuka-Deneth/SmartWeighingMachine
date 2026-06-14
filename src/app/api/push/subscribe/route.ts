import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

interface PushSubscribeBody {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
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

  let body: PushSubscribeBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { endpoint, keys } = body;

  if (
    typeof endpoint !== "string" ||
    endpoint.length === 0 ||
    !keys ||
    typeof keys.p256dh !== "string" ||
    typeof keys.auth !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid subscription object" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { error: upsertError } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (upsertError) {
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
