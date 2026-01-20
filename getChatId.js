import TelegramBot from "node-telegram-bot-api";

const TOKEN = "7986795195:AAG_vTa2BZUdZXVRNuqSvkaaaCf-t5beMvE";

const bot = new TelegramBot(TOKEN, { polling: true });

console.log("🤖 Bot đang chạy...");
console.log("👉 Mở Telegram, vào bot và nhắn: hi");

bot.on("message", (msg) => {
  console.log("✅ CHAT_ID =", msg.chat.id);
  console.log("💬 MESSAGE =", msg.text);
});

