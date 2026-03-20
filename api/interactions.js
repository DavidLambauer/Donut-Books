import { InteractionType, InteractionResponseType, verifyKey } from "discord-interactions";
import { handleExpense } from "../src/commands/expense.js";
import { handleSale } from "../src/commands/sale.js";
import { handleBalance } from "../src/commands/balance.js";
import { handlePayout } from "../src/commands/payout.js";
import { handleCalculate } from "../src/commands/calculate.js";
import { handleHistory } from "../src/commands/history.js";

// Disable Vercel's automatic body parsing so we get the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method not allowed");
  }

  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  const rawBody = await readBody(req);

  const isValid = await verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
  if (!isValid) {
    return res.status(401).end("Invalid request signature");
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === InteractionType.PING) {
    return res.json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data;

    const commands = {
      expense: handleExpense,
      sale: handleSale,
      balance: handleBalance,
      payout: handlePayout,
      calculate: handleCalculate,
      history: handleHistory,
    };

    const commandHandler = commands[name];
    if (!commandHandler) {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "Unknown command." },
      });
    }

    try {
      const response = await commandHandler(interaction);
      return res.json(response);
    } catch (error) {
      console.error(`Error handling /${name}:`, error);
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "Something went wrong. Please try again." },
      });
    }
  }

  return res.status(400).end("Unknown interaction type");
}
