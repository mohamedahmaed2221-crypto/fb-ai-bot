const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "my_verify_token_123";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT ||
  "أنت مساعد ذكي لصفحة فيسبوك. ردودك قصيرة وودودة ومفيدة باللغة العربية. رد على رسائل العملاء بشكل احترافي ومتعاطف. لا تزيد عن 3 جمل في ردك.";

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object !== "page") return res.sendStatus(404);
  res.sendStatus(200);
  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message || event.message.is_echo) continue;
      const senderId = event.sender.id;
      const userMessage = event.message.text;
      if (!userMessage) continue;
      try {
        const aiReply = await getAIReply(userMessage);
        await sendMessage(senderId, aiReply);
      } catch (err) {
        console.error("خطأ:", err.message);
      }
    }
  }
});

async function getAIReply(userMessage) {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userMessage }] }]
    }
  );
  return response.data.candidates[0].content.parts[0].text;
}

async function sendMessage(recipientId, text) {
  await axios.post(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    { recipient: { id: recipientId }, message: { text } }
  );
}

app.get("/", (req, res) => res.send("Facebook AI Bot is running!"));

app.get("/", (req, res) => res.send("Facebook AI Bot is running!"));
app.get("/health", (req, res) => res.send("OK"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bot running on port ${PORT}`);
  setInterval(() => {
    require('https').get('https://fb-ai-bot-production-718e.up.railway.app/health');
  }, 14 * 60 * 1000);
});
