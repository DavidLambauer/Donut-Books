import { verifyKey } from "discord-interactions";

export async function verifyDiscordRequest(req) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  const isValid = await verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
  return isValid;
}

export function formatNumber(num) {
  return Number(num).toLocaleString("en-US");
}
