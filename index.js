require("dotenv").config();

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is alive 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Keep alive running on port ${PORT}`);
});


const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const QRCode = require("qrcode");

// ================== CẤU HÌNH ==================
const BOT_TOKEN = process.env.BOT_TOKEN;

// 🔴 SỬA 2 DÒNG DƯỚI
const ROLE_ID = "1076385318263062609";

// Thông tin ngân hàng
const BANK_NAME = "MB Bank";
const BANK_ACCOUNT = "150320071111";
const BANK_OWNER = "LE KY QUANG MINH";
// ===============================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("clientReady", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.content.startsWith("!thanhtoan")) return;

  // Chỉ admin được dùng
  if (!message.member.permissions.has("Administrator")) {
  return message.reply("❌ Bạn cần quyền **Administrator** để dùng lệnh này.");
}

  const args = message.content.split(" ");
  const product = args[1];
  const price = args[2];

  if (!product || !price || isNaN(price)) {
    return message.reply("❌ Cú pháp đúng: `!thanhtoan [Mặt hàng] [Giá]`");
  }

  // Embed xác nhận
  const confirmEmbed = new EmbedBuilder()
    .setTitle("🛒 XÁC NHẬN ĐƠN HÀNG")
    .setColor("Blue")
    .addFields(
      { name: "📦 Mặt hàng", value: product, inline: true },
      { name: "💰 Giá", value: `${Number(price).toLocaleString()} VNĐ`, inline: true }
    )
    .setFooter({ text: "Vui lòng xác nhận hoặc hủy đơn hàng" });

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm_payment")
      .setLabel("✅ Xác nhận")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("cancel_payment")
      .setLabel("❌ Hủy")
      .setStyle(ButtonStyle.Danger)
  );

  await message.channel.send({
    embeds: [confirmEmbed],
    components: [confirmRow]
  });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // ❌ HỦY ĐƠN
  if (interaction.customId === "cancel_payment") {
    return interaction.update({
      content: "❌ Đơn hàng đã bị hủy.",
      embeds: [],
      components: []
    });
  }

  // ✅ XÁC NHẬN → GỬI THANH TOÁN
  if (interaction.customId === "confirm_payment") {
    const rawProduct = interaction.message.embeds[0].fields[0].value;
    const orderId = Date.now();
    const product = `${rawProduct}_${orderId}`;   
    const price = interaction.message.embeds[0].fields[1].value.replace(/\D/g, "");

    // QR MB (chuẩn VietQR đơn giản)
    const amount = price;
    const addInfo = encodeURIComponent(product);

    const vietqrUrl =
  `https://img.vietqr.io/image/MB-150320071111-compact2.png` +
  `?amount=${price}&addInfo=${encodeURIComponent(product)}`;

    const paymentEmbed = new EmbedBuilder()
      .setTitle("💳 THÔNG TIN THANH TOÁN")
      .setColor("Green")
      .addFields(
        { name: "🏦 Ngân hàng", value: BANK_NAME, inline: true },
        { name: "💳 STK", value: BANK_ACCOUNT, inline: true },
        { name: "👤 Người nhận", value: BANK_OWNER, inline: false },
        { name: "🧾 Nội dung chuyển khoản", value: product, inline: true },
        { name: "💰 Số tiền", value: `${Number(price).toLocaleString()} VNĐ`, inline: true },
        { name: "🎫 Thanh toán khác", value: "Liên hệ Admin nếu muốn thanh toán bằng thẻ cào", inline: false }
      )
      .setImage(vietqrUrl)
      .setFooter({ text: "Sau khi chuyển khoản, bấm ĐÃ CHUYỂN KHOẢN" });

    const paidRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("paid_done")
        .setLabel("✅ Đã chuyển khoản")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.update({
      embeds: [paymentEmbed],
      components: [paidRow],
    });
  }

  // 💸 ĐÃ THANH TOÁN
  if (interaction.customId === "paid_done") {
    const buyer = interaction.user;

    const embed = new EmbedBuilder()
      .setTitle("📸 GỬI ẢNH XÁC NHẬN")
      .setColor("Yellow")
      .setDescription(
        `<@${buyer.id}> vui lòng **gửi ảnh chụp màn hình giao dịch** vào kênh này.`
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
       .setCustomId("admin_confirm")
       .setLabel("✅ Admin xác nhận")
       .setStyle(ButtonStyle.Success)
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

 // ADMIN CONFIRM
if (interaction.customId === "admin_confirm") {
  if (!interaction.member.permissions.has("Administrator")) {
    return interaction.reply({
      content: "❌ Chỉ Admin mới xác nhận được.",
      ephemeral: true
    });
  }

  const invoiceId = `HD-${Date.now()}`;
  const roleId = "1076385318263062609";

  const embed = new EmbedBuilder()
    .setTitle("🧾 HÓA ĐƠN")
    .setColor("Green")
    .addFields(
      { name: "🆔 Mã hóa đơn", value: invoiceId },
      { name: "👤 Khách hàng", value: `<@${interaction.user.id}>` },
      { name: "📅 Thời gian", value: `<t:${Math.floor(Date.now()/1000)}:f>` }
    );

  await interaction.update({
    content: `<@&${roleId}> Đơn hàng hoàn thành`,
    embeds: [embed],
    components: []
  });
 }
});
  

client.login(BOT_TOKEN);
