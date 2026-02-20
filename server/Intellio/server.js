import express from "express";
import cors from "cors";
import { InferenceClient } from "@huggingface/inference";
import express from "express";
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const client = new InferenceClient(process.env.HF_TOKEN);

app.get("/", (req, res) => {
  res.json({ status: "Intellio backend running!" });
});

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    const response = await client.chatCompletion({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [
        {
          role: "system",
          content: "You are Intellio, a helpful AI assistant. Keep answers clear and concise.",
        },
        ...messages,
      ],
      max_tokens: 300,
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    const imageBlob = await client.textToImage({
      model: "stabilityai/stable-diffusion-xl-base-1.0",
      inputs: prompt,
      parameters: { num_inference_steps: 30 },
    });
    const buffer = Buffer.from(await imageBlob.arrayBuffer());
    const base64 = buffer.toString("base64");
    res.json({ image: `data:image/png;base64,${base64}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(7860, () => console.log("Server running on port 7860"));