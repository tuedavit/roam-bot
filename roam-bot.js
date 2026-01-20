/****************************************************
 * ROAM POOL ALERT BOT (SOLANA + BNB)
 * + MINI WEB SERVER (UPTIME PING)
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
/* Dùng cho Render + UptimeRobot */

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ROAM BOT IS RUNNING 🚀");
  })
  .listen(PORT, () => {
    console.log(`🌐 Web server listening on port ${PORT}`);
  });

/* ================= CONFIG ================= */

// ===== SOLANA =====
// 👉 RPC nhẹ + ổn định hơn
const SOL_RPC = "https://rpc.ankr.com/solana";

const SOL_MINT = new PublicKey(
  "RoamA1USA8xjvpTJZ6RvvxyDRzNh6GCA1zVGKSiMVkn"
);

// 🔥 POOL TOKEN ACCOUNT (CHỈ NGHE ĐÚNG CÁI NÀY)
const SOL_POOL_TOKEN_ACCOUNT = new PublicKey(
  "rVbzVr3ewmAn2YTD88KvsiKhfkxDngvGoh8DrRzmU5X"
);

const SOL_MIN_AMOUNT = 50;

// ===== BNB =====
const BSC_WSS = "wss://bsc-ws-node.nariox.org:443";

const BNB_TOKEN =
  "0x3fefe29da25bea166fb5f6ade7b5976d2b0e586b";

const BNB_POOL =
  "0xEf74d1FCEEA7d142d7A64A6AF969955839A17B83";

const BNB_DEV =
  "0x5555601c3f86d0fF98b3a09C17fe5E0C597EC0Ce";

const BNB_MIN_AMOUNT = 50;

/* ================= START ================= */

console.log("🚀 ROAM BOT STARTED (SOL + BNB)");
bot.sendMessage(CHAT_ID, "✅ ROAM BOT ĐÃ KHỞI ĐỘNG");

/* ================= SOLANA LISTENER (NHẸ) ================= */

const solConnection = new Connection(SOL_RPC, "confirmed");

/**
 * 🔥 FIX OOM:
 * - KHÔNG dùng onLogs("all")
 * - Chỉ nghe LOG của POOL token account
 */
solConnection.onLogs(
  SOL_POOL_TOKEN_ACCOUNT,
  async (logs) => {
    try {
      const tx = await solConnection.getParsedTransaction(logs.signature, {
        maxSupportedTransactionVersion: 0,
      });
      if (!tx || !tx.meta) return;

      const pre = tx.meta.preTokenBalances || [];
      const post = tx.meta.postTokenBalances || [];

      for (let i = 0; i < post.length; i++) {
        const p = post[i];
        if (p.mint !== SOL_MINT.toString()) continue;
        if (p.owner !== SOL_POOL_TOKEN_ACCOUNT.toString()) continue;

        const before = pre[i]?.uiTokenAmount.uiAmount || 0;
        const after = p.uiTokenAmount.uiAmount || 0;
        const diff = after - before;

        if (diff >= SOL_MIN_AMOUNT) {
          bot.sendMessage(
            CHAT_ID,
            `🚨 ROAM SOL – DEV NẠP POOL\n\n+${diff} ROAM\nTx:\nhttps://solscan.io/tx/${logs.signature}`
          );
        }
      }
    } catch (e) {
      // im lặng để không leak RAM
    }
  },
  "confirmed"
);

/* ================= BNB LISTENER ================= */

const bscProvider = new ethers.WebSocketProvider(BSC_WSS);

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const bnbContract = new ethers.Contract(
  BNB_TOKEN,
  ERC20_ABI,
  bscProvider
);

bnbContract.on("Transfer", (from, to, value, event) => {
  try {
    if (
      from.toLowerCase() !== BNB_DEV.toLowerCase() ||
      to.toLowerCase() !== BNB_POOL.toLowerCase()
    )
      return;

    const amount = Number(ethers.formatUnits(value, 18));
    if (amount >= BNB_MIN_AMOUNT) {
      bot.sendMessage(
        CHAT_ID,
        `🚨 ROAM BNB – DEV NẠP POOL\n\n+${amount} ROAM\nTx:\nhttps://bscscan.com/tx/${event.transactionHash}`
      );
    }
  } catch (e) {
    // ignore
  }
});
