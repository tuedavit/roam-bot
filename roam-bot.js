/****************************************************
 * ROAM POOL ALERT BOT (SOL + BNB)
 * FINAL VERSION – STABLE
 ****************************************************/

import { Connection, PublicKey } from "@solana/web3.js";
import TelegramBot from "node-telegram-bot-api";
import { ethers } from "ethers";
import http from "http";

/* ================= ENV ================= */

const TG_TOKEN = process.env.TG_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const PORT = process.env.PORT || 3000;

if (!TG_TOKEN || !CHAT_ID) {
  console.error("❌ Missing TG_TOKEN or CHAT_ID");
  process.exit(1);
}

/* ================= TELEGRAM ================= */

const bot = new TelegramBot(TG_TOKEN, { polling: false });

/* ================= WEB KEEP ALIVE ================= */

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ROAM BOT RUNNING 🚀");
  })
  .listen(PORT, () => {
    console.log("🌐 Web listening on", PORT);
  });

/* ================= CONFIG ================= */

// ===== SOL =====
const SOL_RPC = "https://api.mainnet-beta.solana.com";
const solConnection = new Connection(SOL_RPC, "confirmed");

const SOL_POOL = new PublicKey(
  "rVbzVr3ewmAn2YTD88KvsiKhfkxDngvGoh8DrRzmU5X"
);

const SOL_MIN = 100;

// ===== BNB =====
const BSC_RPC = "https://bsc-dataseed.binance.org";

const bscProvider = new ethers.JsonRpcProvider(BSC_RPC);

const BNB_TOKEN =
  "0x3fefe29da25bea166fb5f6ade7b5976d2b0e586b";

const BNB_POOL =
  "0xEf74d1FCEEA7d142d7A64A6AF969955839A17B83";

const BNB_MIN = 50;

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

/* ================= START ================= */

console.log("🚀 ROAM BOT STARTED");
bot.sendMessage(CHAT_ID, "✅ ROAM BOT ONLINE");

/* ================= SOL POLLING ================= */

let lastSol = null;

async function getSol() {
  const r = await solConnection.getTokenAccountBalance(SOL_POOL);
  return r?.value?.uiAmount ?? 0;
}

(async () => {
  try {
    lastSol = await getSol();
    console.log("🔵 SOL init:", lastSol);
  } catch {}
})();

setInterval(async () => {
  try {
    const cur = await getSol();
    if (lastSol === null) return;

    const diff = cur - lastSol;

    if (diff >= SOL_MIN) {
      bot.sendMessage(
        CHAT_ID,
        `🚨 SOL NẠP POOL +${diff} ROAM\nBalance: ${cur}`
      );
    }

    lastSol = cur;
  } catch {}
}, 60_000);

/* ================= BNB EVENT LOG DETECTION ================= */

const BSC_RPC = "https://bsc-dataseed.binance.org";

const bscProvider = new ethers.JsonRpcProvider(BSC_RPC);

// Pool ROAM (PAIR CONTRACT - NOT TOKEN)
const BNB_POOL =
  "0xEf74d1FCEEA7d142d7A64A6AF969955839A17B83".toLowerCase();

// Event topics (keccak hash)
const TOPIC_SYNC =
  "0x1c411e9a96e6d6aeaa2a4a4f7e9c4b7f2d78b5f6c3fbb6b7e3c3a0f3f2c7f3f9";

const TOPIC_MINT =
  "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fba7c4f8b9cfcba1d6a";

const TOPIC_BURN =
  "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496";

// Track block
let lastBnbChecked = 0;

// Init block
(async () => {
  lastBnbChecked = await bscProvider.getBlockNumber();
  console.log("🟡 BNB start block:", lastBnbChecked);
})();

// Poll logs
setInterval(async () => {
  try {
    const currentBlock = await bscProvider.getBlockNumber();

    if (currentBlock <= lastBnbChecked) return;

    const logs = await bscProvider.getLogs({
      fromBlock: lastBnbChecked + 1,
      toBlock: currentBlock,
      address: BNB_POOL,
      topics: [[TOPIC_SYNC, TOPIC_MINT, TOPIC_BURN]]
    });

    for (const log of logs) {
      let type = "UNKNOWN";

      if (log.topics[0] === TOPIC_SYNC) type = "SYNC";
      if (log.topics[0] === TOPIC_MINT) type = "ADD LP";
      if (log.topics[0] === TOPIC_BURN) type = "REMOVE LP";

      const tx = log.transactionHash;

      bot.sendMessage(
        CHAT_ID,
        `🚨 ROAM BNB – ${type}\n\nTx:\nhttps://bscscan.com/tx/${tx}`
      );
    }

    if (logs.length > 0) {
      console.log(`🟡 BNB events: ${logs.length}`);
    }

    lastBnbChecked = currentBlock;

  } catch (e) {
    console.log("BNB log scan error");
  }
}, 60_000);
