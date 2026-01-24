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

/* ================= BNB POLLING ================= */

const bnbContract = new ethers.Contract(
  BNB_TOKEN,
  ERC20_ABI,
  bscProvider
);

let lastBnb = null;
let bnbDecimals = 18;

(async () => {
  try {
    bnbDecimals = await bnbContract.decimals();

    const raw = await bnbContract.balanceOf(BNB_POOL);

    lastBnb = Number(
      ethers.formatUnits(raw, bnbDecimals)
    );

    console.log("🟡 BNB init:", lastBnb);
  } catch {}
})();

setInterval(async () => {
  try {
    if (lastBnb === null) return;

    const raw = await bnbContract.balanceOf(BNB_POOL);

    const cur = Number(
      ethers.formatUnits(raw, bnbDecimals)
    );

    const diff = cur - lastBnb;

    if (diff >= BNB_MIN) {
      bot.sendMessage(
        CHAT_ID,
        `🚨 BNB NẠP POOL +${diff} ROAM\nBalance: ${cur}`
      );
    }

    lastBnb = cur;
  } catch {
    console.log("BNB poll error");
  }
}, 60_000);
