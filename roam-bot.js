/****************************************************
 * ROAM POOL ALERT BOT (SOL + BNB)
 * - NO WebSocket (anti 401)
 * - HTTP polling mỗi 1 phút
 * - Có web ping cho Render / UptimeRobot
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
  console.error("❌ THIẾU TG_TOKEN hoặc CHAT_ID");
  process.exit(1);
}

/* ================= TELEGRAM ================= */

const bot = new TelegramBot(TG_TOKEN, { polling: false });

/* ================= MINI WEB SERVER ================= */

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ROAM BOT IS RUNNING 🚀");
  })
  .listen(PORT, () => {
    console.log(`🌐 Web listening on ${PORT}`);
  });

/* ================= CONFIG ================= */

// ===== SOLANA =====
const SOL_RPC = "https://api.mainnet-beta.solana.com";
const solConnection = new Connection(SOL_RPC, "confirmed");

const SOL_MINT = new PublicKey(
  "RoamA1USA8xjvpTJZ6RvvxyDRzNh6GCA1zVGKSiMVkn"
);

// POOL TOKEN ACCOUNT
const SOL_POOL = "rVbzVr3ewmAn2YTD88KvsiKhfkxDngvGoh8DrRzmU5X";
const SOL_MIN_AMOUNT = 50;

// ===== BNB =====
const BSC_HTTP = "https://rpc.ankr.com/bsc";
const bscProvider = new ethers.JsonRpcProvider(BSC_HTTP);

const BNB_TOKEN =
  "0x3fefe29da25bea166fb5f6ade7b5976d2b0e586b";

const BNB_POOL =
  "0xEf74d1FCEEA7d142d7A64A6AF969955839A17B83";

const BNB_DEV =
  "0x5555601c3f86d0fF98b3a09C17fe5E0C597EC0Ce";

const BNB_MIN_AMOUNT = 50;

// ⏱️ polling 1 phút
const POLL_INTERVAL = 60_000;

/* ================= START ================= */

console.log("🚀 ROAM BOT STARTED (HTTP POLLING)");
bot.sendMessage(CHAT_ID, "✅ ROAM BOT ĐÃ KHỞI ĐỘNG (HTTP polling)");

/* ================= SOLANA (BALANCE POLLING – NO WS) ================= */

import { Connection, PublicKey } from "@solana/web3.js";

// RPC public (không key, ổn định với polling)
const SOL_RPC = "https://api.mainnet-beta.solana.com";
const solConnection = new Connection(SOL_RPC, "confirmed");

// ROAM mint
const SOL_MINT = new PublicKey(
  "RoamA1USA8xjvpTJZ6RvvxyDRzNh6GCA1zVGKSiMVkn"
);

// 🔥 TOKEN ACCOUNT PHÂN PHỐI (POOL RÚT)
const SOL_POOL_TOKEN_ACCOUNT = new PublicKey(
  "rVbzVr3ewmAn2YTD88KvsiKhfkxDngvGoh8DrRzmU5X"
);

// Ngưỡng báo (tuỳ chỉnh)
const SOL_MIN_AMOUNT = 100; // ví dụ 100 ROAM

// Chu kỳ polling (1–2 phút)
const SOL_POLL_INTERVAL = 60_000; // 60s (đổi 120_000 nếu muốn 2 phút)

// Lưu balance lần trước
let lastSolBalance = null;

// Hàm lấy balance UI (ROAM)
async function getPoolBalance() {
  const res = await solConnection.getTokenAccountBalance(
    SOL_POOL_TOKEN_ACCOUNT
  );
  return res?.value?.uiAmount ?? 0;
}

// Init balance ban đầu
(async () => {
  try {
    lastSolBalance = await getPoolBalance();
    console.log("🔵 SOL init balance:", lastSolBalance);
  } catch (e) {
    console.log("SOL init error (ignored)");
  }
})();

// Polling
setInterval(async () => {
  try {
    const current = await getPoolBalance();
    if (lastSolBalance === null) {
      lastSolBalance = current;
      return;
    }

    const diff = current - lastSolBalance;
    if (diff >= SOL_MIN_AMOUNT) {
      bot.sendMessage(
        CHAT_ID,
        `🚨 ROAM SOL – DEV NẠP POOL\n\n+${diff} ROAM\nBalance hiện tại: ${current}`
      );
    }

    lastSolBalance = current;
  } catch (e) {
    console.log("SOL poll error (ignored)");
  }
}, SOL_POLL_INTERVAL);


/* ================= BNB POLLING ================= */

let lastBnbBlock = await bscProvider.getBlockNumber();

setInterval(async () => {
  try {
    const currentBlock = await bscProvider.getBlockNumber();
    if (currentBlock <= lastBnbBlock) return;

    const contract = new ethers.Contract(
      BNB_TOKEN,
      ["event Transfer(address indexed from, address indexed to, uint256 value)"],
      bscProvider
    );

    const events = await contract.queryFilter(
      "Transfer",
      lastBnbBlock + 1,
      currentBlock
    );

    for (const e of events) {
      const { from, to, value } = e.args;
      if (
        from.toLowerCase() !== BNB_DEV.toLowerCase() ||
        to.toLowerCase() !== BNB_POOL.toLowerCase()
      )
        continue;

      const amount = Number(ethers.formatUnits(value, 18));
      if (amount >= BNB_MIN_AMOUNT) {
        bot.sendMessage(
          CHAT_ID,
          `🚨 ROAM BNB – DEV NẠP POOL\n\n+${amount} ROAM\nTx:\nhttps://bscscan.com/tx/${e.transactionHash}`
        );
      }
    }

    lastBnbBlock = currentBlock;
  } catch (e) {
    console.log("BNB poll error (ignored)");
  }
}, POLL_INTERVAL);
