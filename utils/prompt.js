// Maps questionnaire selections to a cohesive, dreamcore pastel prompt

function seasonText(choice) {
  switch (choice) {
    case "a":
      return "spring vibe, budding life, petals drifting in pink breeze";
    case "b":
      return "summer vibe, deep green leaves, dazzling sun, ocean breeze";
    case "c":
      return "autumn vibe, contemplative mood, rustling fallen leaves, soft sunlight";
    case "d":
      return "winter vibe, cozy warmth, breath in cold air, flickering bonfire light";
    default:
      return "present day vibe";
  }
}

function weatherText(choice) {
  const map = {
    A: "spring rain alley, gentle raindrops, petrichor, droplets on umbrella",
    B: "sunlit window, dust motes sparkling, soft warm light on skin",
    C: "noon beach, salty air, bright glints on waves, soft sand",
    D: "after a summer shower, crisp air, fresh scent, cooling skin",
    E: "windy hill, fluttering hair and clothes, wild grass aroma",
    F: "foggy dawn, muted world, dewy chill, hush of early morning",
    G: "autumn dusk sunset, long shadows, warm glow, calm air",
    H: "leaf-strewn alley, crunching footsteps, brittle leaves",
    I: "first snow night, quiet streets, floating snowflakes, muffled sound",
    J: "clear winter morning, sparkling frost, visible breath",
    K: "thunderstorm night, flickering lightning, low rumbles like heartbeat",
    L: "rain on window, warm coffee steam, lonely yet comforting",
  };
  return map[choice] || "calm weather";
}

function sceneryText(choice) {
  const map = {
    nature: "tranquil natural landscape with soft hills, gentle trees, quiet meadows, and open skies",
    city: "peaceful urban atmosphere with soft building silhouettes, gentle ambient lighting, and quiet streets fading into mist",
  };
  return map[choice] || "serene landscape";
}

function moodText(choice) {
  const map = {
    yellow: "afternoon yellow light, gentle sunbeams, languid sweetness",
    skyblue: "pale blue under clear sky, soft breeze, drifting clouds",
    ocean: "tranquil sea blue, soft ripples, cooling sound of waves",
    green: "spring fresh green, new sprouts swaying, airy freshness",
    peach: "peach dusk glow, air warming tenderly, cozy end of day",
    gray: "quiet rainy gray, umbrella rhythm, damp soil scent",
    cream: "warm cream indoor light, cozy lamp glow, mug warmth",
    navy: "deep navy night sky, stillness, shy starlight",
    brown: "woody brown afternoon, faint coffee aroma, dancing shadows",
    silver: "silvery pre-dawn air, crisp hush, breath slow and cool",
  };
  return map[choice] || "calm neutral tones";
}

// New 3-parameter builder: time, weather, healing
function timeOfDayText(choice) {
  const map = {
    predawn: "very early pre-dawn hush, darkest blue before light, world half-asleep",
    dawn: "first light barely seeping in, silhouettes waking softly",
    earlyMorning: "gentle early morning calm, pale sun rising, air still fresh",
    morning: "quiet morning brightness, soft beams through dust motes",
    noon: "soft midday brightness, diffused light filling the room",
    earlyAfternoon: "lightly warmed early afternoon tones, unhurried ambience",
    afternoon: "slow afternoon warmth, elongated tones, easy stillness",
    lateAfternoon: "deeper late afternoon glow, lengthening shadows, mellow pace",
    sunset: "hazy golden hour, softened edges, lingering warmth",
    blueHour: "blue-hour hush, cool indigo air with gentle glows",
    night: "quiet night calm, dim glow, muted ambience",
    midnight: "still midnight silence, minimal light, softly breathing darkness",
  };
  return map[choice] || "timeless serene moment";
}

function healingText(choice) {
  const map = {
    calm: "soothing calm that slows your breathing and clears the mind",
    comfort: "gentle comfort that feels like a safe embrace",
    hope: "soft hopefulness, a quiet spark that brightens within",
    rest: "deep restorative rest, a sanctuary for weary thoughts",
    focus: "quiet focused clarity, distractions fading to the edges",
    nostalgia: "tender nostalgia, a memory-like warmth without sorrow",
  };
  return map[choice] || "soothing calm that slows your breathing and clears the mind";
}

export function buildPrompt({ time, weather, healing }) {
  const timeDesc = timeOfDayText(time);
  const weatherDesc = weatherText(weather);
  const healingDesc = healingText(healing);

  // derive raw user healing phrase (free text allowed)
  const healingRaw = typeof healing === "string" && healing.trim().length > 0 ? healing.trim() : "";

  const prompt = `Create a non-scary healing dreamcore image as a lo-fi impressionist oil painting with soft, grainy brushstrokes.

Composition: A single window frame (3x3 grid panes) dominates the center. INSIDE the panes, show a hazy, abstract scene that reflects time/weather/healing; it is not a shadow on a wall but an actual dreamy view through the panes. Around the frame, keep soft wall and frame edges. The imagery must sit clearly WITHIN the window panes (not overlaid UI). Keep edges soft and analog, never sharp.

Scene cues:
- Time: ${timeDesc}
- Weather: ${weatherDesc}
- Healing intent: ${healingDesc}${healingRaw ? ` (user phrase: "${healingRaw}")` : ""}

From the healing phrase, infer two or three gentle, UNIVERSAL symbolic motifs (e.g., light, breeze, leaves, sea ripples, warm glow) that express the intent. Use them subtly INSIDE the window panes only; keep them abstract and non-literal if needed.

IMPORTANT: Absolutely NO Asian, Oriental, or Eastern cultural elements or motifs. No pagodas, bamboo, cherry blossoms, rice paddies, zen gardens, torii gates, or any culture-specific symbols. Keep the aesthetic neutral and universal. Never eerie or creepy.

Medium: Lo-fi oil painting with visible brushstrokes, grainy texture, and analog imperfections. Inspired by impressionist atmospheric light and dreamlike haziness. Add subtle film grain, light noise, and vintage paper texture. The painting should feel like a faded photograph from an old analog camera mixed with gentle watercolor bleeds.

Color Palette: Lo-fi muted pastel tones with heavy desaturation and slight color shift. Soft peachy pinks, gentle lavender grays, cream whites, dusty blues, and faded sage greens with slight vintage grading. Colors blend with wet-on-wet technique, washed-out and nostalgic. Subtle warm analog cast. Everything feels like morning mist or a fading memory.

Texture & Grain: Apply subtle film grain, light noise texture, and canvas weave pattern. Add slight blur and soft focus as if shot with vintage lens. Include gentle paper texture and watercolor-like color bleeding at edges. The overall feel should be lo-fi, cozy, and imperfect in a comforting way.

Light & Atmosphere: Diffused natural light through the window, with atmospheric haze and grain. Golden-hour glow or gentle overcast luminosity. Depth via atmospheric perspective; background dissolves into misty softness. Painterly, grainy light with subtle glow.

Framing details: 3x3 window grid, soft feathered frame edges, slight falloff vignette (≤8%). The imagery must remain inside panes; avoid explicit architectural details—keep them abstract if present.

Mood: Tranquil, nostalgic, lo-fi contemplative, emotionally healing. The scene must feel like a gentle memory, never eerie. This is a lo-fi sanctuary for the weary soul.

Style Guide (strict):
- Window framing: single sash with a 3x3 grid of panes; dreamy abstract imagery INSIDE panes only.
- Shadow character: soft penumbra, 60–80% opacity, feathered edges; optional faint silhouettes remain abstract.
- Edge softness: high; no hard edges anywhere; micro-contrast reduced.
- Contrast & DR: low contrast, compressed dynamic range; avoid crushed blacks and harsh whites.
- Focus: soft overall, slight central clarity; periphery gently blurred (natural vignette ≤ 8%).
- Grain level: subtle film grain (light), canvas weave visible on flat areas.
- Color temperature: warm‑neutral; avoid vivid saturation; keep pastel and washed‑out.
- Negative prompts: no faces, no text, no UI, no logos, no creepy vibes, no culture‑specific motifs.
`;

  return prompt;
}


