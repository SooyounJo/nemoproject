"use client";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { name = "", text = "" } = req.body || {};
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_DEFAULT;
  try {
    if (!OPENAI_API_KEY) {
      // Fallback heuristic
      const guess = chooseFromText(name || text);
      res.status(200).json(guess);
      return;
    }
    // Lazy import to avoid bundling serverless
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: OPENAI_API_KEY });
    const schema = {
      type: "object",
      properties: {
        time: { type: "string", enum: ["night","dawn","day","afternoon","sunset"] },
        weather: { type: "string", enum: ["clear","cloudy","rainy","snowy","foggy","stormy"] },
        colorMood: { type: "string", enum: ["deep_blue","blue_green","navy_purple","warm_orange","gold","purple_pink","cold_white","mixed_cool_warm","dark_neutral","light_blue","green_pastel"] },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["time","weather","colorMood"],
      additionalProperties: false,
    };
    const prompt = `Classify window image metadata.
Name: ${name}
Text: ${text}
Return JSON only.`;
    const rsp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_schema", json_schema: { name: "ImageMeta", schema, strict: true } },
      temperature: 0.2,
    });
    const raw = rsp.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    res.status(200).json(parsed);
  } catch (e) {
    // Fallback heuristic on any error
    const guess = chooseFromText(name || text);
    res.status(200).json(guess);
  }
}

function chooseFromText(s = "") {
  const t = (s || "").toLowerCase();
  let weather = "clear";
  if (/rain|wet|drizzle/.test(t)) weather = "rainy";
  else if (/snow|flake/.test(t)) weather = "snowy";
  else if (/fog|mist|haze|smog/.test(t)) weather = "foggy";
  else if (/cloud/.test(t)) weather = "cloudy";
  else if (/storm|thunder|lightning/.test(t)) weather = "stormy";
  let time = "day";
  if (/night|moon|star/.test(t)) time = "night";
  else if (/dawn|sunrise|early/.test(t)) time = "dawn";
  else if (/afternoon|noon|pm/.test(t)) time = "afternoon";
  else if (/sunset|dusk|evening/.test(t)) time = "sunset";
  let colorMood = "dark_neutral";
  if (/blue|deep blue|navy/.test(t)) colorMood = "deep_blue";
  else if (/light blue|sky/.test(t)) colorMood = "light_blue";
  else if (/orange|warm|gold/.test(t)) colorMood = "warm_orange";
  else if (/gold/.test(t)) colorMood = "gold";
  else if (/green|mint/.test(t)) colorMood = "green_pastel";
  else if (/purple|violet|pink/.test(t)) colorMood = "purple_pink";
  else if (/cold white|white/.test(t)) colorMood = "cold_white";
  else if (/cool.*warm|mixed/.test(t)) colorMood = "mixed_cool_warm";
  return { time, weather, colorMood, tags: [] };
}


