/****************************************************
 * ROAM POOL ALERT BOT (SOLANA + BNB)
 * - Solana: realtime (pool-only)
 * - BNB: HTTP polling (1 phút)
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
const SOL_RPC = "https://rpc.ankr.com/solana";

const SOL_MINT = new PublicKey(
  "RoamA1USA8xjvpTJZ6RvvxyDRzNh6GCA1zVGKSiMVkn"
);

const SOL_POOL = new PublicKey(
  "rVbzVr3ewmAn2YTD88KvsiKhfkxDngvGoh8DrRzmU5X"
);

const SOL_MIN_AMOUNT = 50;

// ===== BNB =====
const BSC_HTTP = "https://rpc.ankr.com/bsc";

const BNB_TOKEN =
  "0x3fefe29da25bea166fb5f6ade7b5976d2b0e586b";

const BNB_POOL =
  "0xEf74d1FCEEA7d142d7A64A6AF969955839A17B83";

const BNB_DEV =
  "0x5555601c3f86d0fF98b3a09C17fe5E0C597EC0Ce";

const BNB_MIN_AMOUNT = 50;

// ⏱️ CHECK MỖI 60 GIÂY (bạn có thể đổi 120000 = 2 phút)
const BNB_POLL_INTERVAL = 60_000;

/* ================= START ================= */

console.log("🚀 ROAM BOT STARTED (SOL + BNB)");
bot.sendMessage(CHAT_ID, "✅ ROAM BOT ĐÃ KHỞI ĐỘNG");

/* ================= SOLANA LISTENER ================= */

const solConnection = new Connection(SOL_RPC, "confirmed");

solConnection.onLogs(
  SOL_POOL,
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
        if (p.owner !== SOL_POOL.toString()) continue;

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
    } catch {}
  },
  "confirmed"
);

/* ================= BNB POLLING (HTTP – 1 PHÚT) ================= */

const bscProvider = new ethers.JsonRpcProvider(BSC_HTTP);

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const bnbContract = new ethers.Contract(
  BNB_TOKEN,
  ERC20_ABI,
  bscProvider
);

let lastBlock = await bscProvider.getBlockNumber();

setInterval(async () => {
  try {
    const currentBlock = await bscProvider.getBlockNumber();
    if (currentBlock <= lastBlock) return;

    const events = await bnbContract.queryFilter(
      "Transfer",
      lastBlock + 1,
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

    lastBlock = currentBlock;
  } catch (e) {
    console.log("BNB poll error (ignored)");
  }
}, BNB_POLL_INTERVAL);
