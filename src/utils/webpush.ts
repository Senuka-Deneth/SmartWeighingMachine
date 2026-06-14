import webpush from "web-push";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) {
    return;
  }

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new Error("VAPID environment variables are not configured.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export function getWebPush() {
  ensureVapidConfigured();
  return webpush;
}
