import "dotenv/config";

const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const commands = [
  {
    name: "expense",
    description: "Log a supply purchase for the kelp farm",
    options: [
      {
        name: "item",
        description: "What you bought",
        type: 3,
        required: true,
        choices: [
          { name: "Bone Blocks", value: "Bone Blocks" },
          { name: "Bones", value: "Bones" },
          { name: "Blaze Rods", value: "Blaze Rods" },
          { name: "Chests", value: "Chests" },
          { name: "Shulker Shells", value: "Shulker Shells" },
          { name: "Shulkers", value: "Shulkers" },
        ],
      },
      {
        name: "quantity",
        description: "How many you bought",
        type: 4,
        required: true,
      },
      {
        name: "total",
        description: "Total amount spent",
        type: 10,
        required: true,
      },
    ],
  },
  {
    name: "sale",
    description: "Log a Dried Kelp Block sale",
    options: [
      {
        name: "quantity",
        description: "How many Dried Kelp Blocks sold",
        type: 4,
        required: true,
      },
      {
        name: "total",
        description: "Total amount earned",
        type: 10,
        required: true,
      },
    ],
  },
  {
    name: "balance",
    description: "View current cycle expenses, revenue, and profit breakdown",
  },
  {
    name: "payout",
    description: "Settle the current cycle and calculate who gets what",
  },
  {
    name: "calculate",
    description: "Calculate how many Blaze Rods you need for your Bones/Bone Blocks",
    options: [
      {
        name: "bones",
        description: "Number of Bones",
        type: 4,
        required: false,
      },
      {
        name: "bone_blocks",
        description: "Number of Bone Blocks",
        type: 4,
        required: false,
      },
    ],
  },
];

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Failed to register commands: ${response.status} ${text}`);
    process.exit(1);
  }

  console.log("Commands registered successfully!");
  const data = await response.json();
  console.log(`Registered ${data.length} commands.`);
}

registerCommands();
