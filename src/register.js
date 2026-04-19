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
        description: "Total amount spent (supports 1k, 2.5m, 3b)",
        type: 3,
        required: false,
      },
      {
        name: "price_per_item",
        description: "Cost per item (supports 1k, 2.5m, 3b)",
        type: 3,
        required: false,
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
        description: "Total amount earned (supports 1k, 2.5m, 3b)",
        type: 3,
        required: false,
      },
      {
        name: "price_per_item",
        description: "Price per item sold (supports 1k, 2.5m, 3b)",
        type: 3,
        required: false,
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
  {
    name: "history",
    description: "View transaction history and profit trends",
  },
  {
    name: "calculate-ratio",
    description: "Calculate optimal Bones or Bone Blocks / Blaze Rod split for a budget",
    options: [
      {
        name: "budget",
        description: "Total amount to spend (supports 1k, 2.5m, 3b)",
        type: 3,
        required: true,
      },
      {
        name: "blaze_rod_price",
        description: "Price per Blaze Rod (supports 1k, 2.5m, 3b)",
        type: 3,
        required: true,
      },
      {
        name: "bone_price",
        description: "Price per Bone (supports 1k, 2.5m, 3b)",
        type: 3,
        required: false,
      },
      {
        name: "bone_block_price",
        description: "Price per Bone Block (supports 1k, 2.5m, 3b)",
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: "calculate-profit",
    description: "Estimate kelp output and profit from a budgeted recipe run",
    options: [
      {
        name: "budget",
        description: "Total amount to spend (supports 1k, 2.5m, 3b)",
        type: 3,
        required: true,
      },
      {
        name: "blaze_rod_price",
        description: "Price per Blaze Rod (supports 1k, 2.5m, 3b)",
        type: 3,
        required: true,
      },
      {
        name: "kelp_block_price",
        description: "Price per Dried Kelp Block (supports 1k, 2.5m, 3b)",
        type: 3,
        required: true,
      },
      {
        name: "bone_price",
        description: "Price per Bone (supports 1k, 2.5m, 3b)",
        type: 3,
        required: false,
      },
      {
        name: "bone_block_price",
        description: "Price per Bone Block (supports 1k, 2.5m, 3b)",
        type: 3,
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
