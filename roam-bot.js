/****************************************************
 * ROAM POOL ALERT BOT (SOL + BNB)
 * BALANCE POLLING VERSION (STABLE)
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

// ===== SOL =====

const SOL_RPC = "https://api.mainnet-beta.solana.com";
const sol = new Connection(SOL_RPC, "confirmed");

const SOL_POOL = new PublicKey(
  "rVbzVr3ewmAn2YTD88KvsiKhfkxDngvGoh8DrRzmU5X"
);

const SOL_MIN = 100;


// ===== BNB =====

const BSC_RPC = "https://bsc-dataseed.binance.org";
const bsc = new ethers.JsonRpcProvider(BSC_RPC);

const BNB_POOL =
  "0x30D59a44930B3994c116846EFe55fC8fcF608aa8".toLowerCase();

const ROAM_TOKEN =
  "0x3fefe29da25bea166fb5f6ade7b5976d2b0e586b".toLowerCase();

const BNB_MIN = 1000; // chỉnh tuỳ


/* ================= START ================= */

console.log("🚀 ROAM BOT STARTED (BALANCE MODE)");
bot.sendMessage(CHAT_ID, "✅ ROAM BOT ONLINE (SOL + BNB)");


/* ================= SOL ================= */

let lastSol = null;

async function getSol() {
  const r = await sol.getTokenAccountBalance(SOL_POOL);
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
        `🚨 ROAM SOL – DEV NẠP POOL\n+${diff} ROAM\nBalance: ${cur}`
      );
    }

    lastSol = cur;

  } catch {
    console.log("SOL poll error");
  }

}, 60_000);


/* ================= BNB ================= */

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
  } catch {}
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

  } catch {
    console.log("BNB poll error");
  }

}, 60_000);
