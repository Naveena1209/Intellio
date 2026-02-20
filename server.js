import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { InferenceClient } from "@huggingface/inference";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new InferenceClient(process.env.HF_TOKEN);

// Chat route
app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await client.chatCompletion({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [
        {
          role: "system",
          content:
            "You are Orion, a helpful AI assistant with chat and image generation abilities. Keep answers clear and concise. Never suggest external tools like DALL-E or Midjourney — image generation is built into this app.",
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

// Image generation route
app.post("/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;

    const imageBlob = await client.textToImage({
      model: "stabilityai/stable-diffusion-xl-base-1.0",
      inputs: prompt,
      parameters: {
        num_inference_steps: 30,
      },
    });

    const buffer = Buffer.from(await imageBlob.arrayBuffer());
    const base64 = buffer.toString("base64");

    res.json({ image: `data:image/png;base64,${base64}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
