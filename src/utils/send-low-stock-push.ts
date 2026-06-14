import type { SupabaseClient } from "@supabase/supabase-js";
import { getWebPush } from "@/utils/webpush";
import type { PushSubscription } from "@/types/database";

export async function sendLowStockPushNotifications(
  admin: SupabaseClient,
  productName: string | null,
  newStock: number
): Promise<void> {
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("*");

  if (error || !subscriptions?.length) {
    return;
  }

  let webpush;
  try {
    webpush = getWebPush();
  } catch {
    return;
  }

  const name = productName ?? "Product";
  const payload = JSON.stringify({
    title: "Low Stock Alert",
    body: `${name} is running low: ${newStock}kg remaining`,
    icon: "/icon-192.png",
  });

  await Promise.allSettled(
    (subscriptions as PushSubscription[]).map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : undefined;

        if (statusCode === 410 || statusCode === 404) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    })
  );
}
