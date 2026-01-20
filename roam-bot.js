/****************************************************
 * ROAM POOL ALERT BOT (SOLANA + BNB)
 * - Theo dõi dev nạp pool
 * - Gửi thông báo Telegram
 * - Chạy tốt trên Render / VPS
 ****************************************************/

import { Connection, PublicKey } from "@solana/web3.js";
import TelegramBot from "node-telegram-bot-api";
import { ethers } from "ethers";

/* ================= TELEGRAM ================= */

// ⚠️ DÙNG ENV (Render / Cloud)
const TG_TOKEN = process.env.TG_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!TG_TOKEN || !CHAT_ID) {
  console.error("❌ THIẾU TG_TOKEN hoặc CHAT_ID trong ENV");
  process.exit(1);
}

const bot = new TelegramBot(TG_TOKEN, { polling: false });

/* ================= CONFIG ================= */

// ===== SOLANA =====
const SOL_RPC = "https://api.mainnet-beta.solana.com";
const SOL_MINT = new PublicKey(
  "RoamA1USA8xjvpTJZ6RvvxyDRzNh6GCA1zVGKSiMVkn"
);

// POOL TOKEN ACCOUNT (ĐÃ XÁC NHẬN)
const SOL_POOL_TOKEN_ACCOUNT =
  "rVbzVr3ewmAn2YTD88KvsiKhfkxDngvGoh8DrRzmU5X";

// DEV WALLET (OPTIONAL – dùng để check thêm)
const SOL_DEV_WALLET =
  "DSjPt6AtYu7NvKvVzxPkL2BMxrA3M4zK9jQaN1yunktg";

// số ROAM tối thiểu mới báo
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

/* ================= SOLANA LISTENER ================= */

const solConnection = new Connection(SOL_RPC, "confirmed");

solConnection.onLogs("all", async (logs) => {
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

      // chỉ quan tâm pool token account
      if (p.owner !== SOL_POOL_TOKEN_ACCOUNT) continue;

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
    // im lặng cho đỡ spam log
  }
});

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

