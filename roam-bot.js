/****************************************************
 * ROAM POOL ALERT BOT (SOL + BNB)
 * FULL STABLE VERSION - DINHTHACH
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

/* ================= KEEP ALIVE ================= */

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("ROAM BOT RUNNING");
}).listen(PORT, () => {
  console.log("🌐 Web listening on", PORT);
});

/* ================= CONFIG ================= */

// ===== SOLANA =====

const SOL_RPC = "https://api.mainnet-beta.solana.com";
const sol = new Connection(SOL_RPC, "confirmed");

// Pool token account SOL
const SOL_POOL = new PublicKey(
  "rVbzVr3ewmAn2YTD88KvsiKhfkxDngvGoh8DrRzmU5X"
);

const SOL_MIN = 100;


// ===== BSC =====

// Ankr RPC (YOUR KEY)
const BSC_RPC =
  "https://rpc.ankr.com/bsc/07fc082002e3d1636e2f2683138d132d9e00678cf2add5cdacccffaa127f1d29";

const bsc = new ethers.JsonRpcProvider(BSC_RPC);

// Pancake Pair ROAM/USDT
const BNB_POOL =
  "0x30D59a44930B3994c116846EFe55fC8fcF608aa8".toLowerCase();

// ROAM token
const ROAM_TOKEN =
  "0x3fefe29da25bea166fb5f6ade7b5976d2b0e586b".toLowerCase();

const BNB_MIN = 1000;


/* ================= START ================= */

console.log("🚀 ROAM BOT STARTED (FULL STABLE)");
bot.sendMessage(CHAT_ID, "✅ ROAM BOT ONLINE (SOL + BNB)");


/* ================= SOL POLLING ================= */

let lastSol = null;

async function getSolBalance() {
  const r = await sol.getTokenAccountBalance(SOL_POOL);
  return r?.value?.uiAmount ?? 0;
}

(async () => {
  try {
    lastSol = await getSolBalance();
    console.log("🔵 SOL init:", lastSol);
  } catch (e) {
    console.log("SOL init error:", e.message);
  }
})();

setInterval(async () => {
  try {

    const cur = await getSolBalance();

    if (lastSol === null) return;

    const diff = cur - lastSol;

    if (diff >= SOL_MIN) {

      bot.sendMessage(
        CHAT_ID,
        `🚨 ROAM SOL – DEV NẠP POOL\n+${diff} ROAM\nBalance: ${cur}`
      );
    }

    lastSol = cur;

  } catch (e) {
    console.log("SOL poll error:", e.message);
  }

}, 60_000);


/* ================= BNB POLLING ================= */

const PAIR_ABI = [
  "function getReserves() view returns (uint112,uint112,uint32)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];

const pair = new ethers.Contract(
  BNB_POOL,
  PAIR_ABI,
  bsc
);

let lastBnb = null;


async function getBnbReserve() {

  const [r0, r1] = await pair.getReserves();

  const t0 = (await pair.token0()).toLowerCase();
  const t1 = (await pair.token1()).toLowerCase();

  if (t0 === ROAM_TOKEN) {
    return Number(ethers.formatUnits(r0, 18));
  }

  if (t1 === ROAM_TOKEN) {
    return Number(ethers.formatUnits(r1, 18));
  }

  return 0;
}


(async () => {
  try {
    lastBnb = await getBnbReserve();
    console.log("🟡 BNB init:", lastBnb);
  } catch (e) {
    console.log("BNB init error:", e.message);
  }
})();


setInterval(async () => {

  try {

    const cur = await getBnbReserve();

    if (lastBnb === null) return;

    const diff = cur - lastBnb;

    if (diff >= BNB_MIN) {

      bot.sendMessage(
        CHAT_ID,
        `🚨 ROAM BNB – DEV NẠP POOL\n+${diff} ROAM\nReserve: ${cur}`
      );
    }

    lastBnb = cur;

  } catch (e) {
    console.log("BNB poll error:", e.message);
  }

}, 60_000);
