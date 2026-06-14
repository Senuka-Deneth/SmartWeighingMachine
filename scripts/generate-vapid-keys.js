// Run with `node scripts/generate-vapid-keys.js`, then paste the output into .env.local as shown below:
//
// NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>
// VAPID_PRIVATE_KEY=<privateKey>
// VAPID_SUBJECT=mailto:admin@example.com

const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("Add these to .env.local:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("VAPID_SUBJECT=mailto:admin@example.com");
