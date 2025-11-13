import OpenAI from "openai";
import { buildPrompt } from "../../utils/prompt";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  try {
    const { time = "afternoon", weather = "B", healing = "calm" } = req.body || {};
    const prompt = buildPrompt({ time, weather, healing });

    const openai = new OpenAI({ apiKey });

    const result = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      size: "1024x1024",
      quality: "hd",
      response_format: "b64_json",
    });

    const imageBase64 = result.data?.[0]?.b64_json;
    if (!imageBase64) {
      return res.status(502).json({ error: "No image returned" });
    }

    return res.status(200).json({
      prompt,
      image: `data:image/png;base64,${imageBase64}`,
    });
  } catch (err) {
    const message = err?.response?.data || err?.message || "Unknown error";
    return res.status(500).json({ error: String(message) });
  }
}


