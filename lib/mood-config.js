// JSDoc types (JS only)
/**
 * @typedef {"night"|"dawn"|"day"|"afternoon"|"sunset"} TimeSlot
 * @typedef {"clear"|"cloudy"|"rainy"|"snowy"|"foggy"|"stormy"} WeatherType
 * @typedef {"deep_blue"|"blue_green"|"navy_purple"|"warm_orange"|"gold"|"purple_pink"|"cold_white"|"mixed_cool_warm"|"dark_neutral"|"light_blue"|"green_pastel"} ColorMood
 * @typedef {{ id:string, time:TimeSlot, weather:WeatherType, colorMood:ColorMood, tags:string[] }} WindowImageMeta
 */

// Folder (1..9) ↔ Color Mood
export const FOLDER_TO_MOOD = {
  1: "deep_blue",
  2: "light_blue",
  3: "warm_orange", // also 'gold' related
  4: "mixed_cool_warm",
  5: "cold_white",
  6: "navy_purple",
  7: "dark_neutral",
  8: "cold_white",
  9: "green_pastel",
};

// Time bin order for progress: 2 → 3 → 5 → 4 → 1
export const TIME_BIN_ORDER = /** @type {TimeSlot[]} */ ([
  "dawn", "day", "afternoon", "sunset", "night",
]);
export const TIME_TO_SET = /** @type {Record<TimeSlot, number>} */ ({
  night: 1, dawn: 2, day: 3, afternoon: 5, sunset: 4,
});

export const TIME_SLOTS = /** @type {TimeSlot[]} */ ([
  "night", "dawn", "day", "afternoon", "sunset",
]);
export const USED_WEATHER_TYPES = /** @type {WeatherType[]} */ ([
  "clear","cloudy","foggy",
]);
export const USED_COLOR_MOODS = /** @type {ColorMood[]} */ ([
  "deep_blue","blue_green","navy_purple","warm_orange","gold","purple_pink","cold_white","mixed_cool_warm","dark_neutral","light_blue","green_pastel",
]);

// Minimal seed sets (can be extended)
/** @type {WindowImageMeta[]} */
export const nightSet1 = [
  { id:"1-1", time:"night", weather:"clear", colorMood:"deep_blue", tags:["stars","curtain"] },
  { id:"1-2", time:"night", weather:"clear", colorMood:"mixed_cool_warm", tags:["city_lights"] },
  { id:"1-3", time:"night", weather:"foggy", colorMood:"cold_white", tags:["light_columns"] },
  { id:"1-11", time:"night", weather:"clear", colorMood:"gold", tags:["golden_light"] },
];
/** @type {WindowImageMeta[]} */
export const dawnSet2 = [
  { id:"2-1", time:"dawn", weather:"clear", colorMood:"warm_orange", tags:["sunrise"] },
  { id:"2-2", time:"dawn", weather:"foggy", colorMood:"blue_green", tags:["mist"] },
  { id:"2-3", time:"dawn", weather:"cloudy", colorMood:"navy_purple", tags:["deep_blur"] },
];
/** @type {WindowImageMeta[]} */
export const daySet3 = [
  { id:"3-2", time:"day", weather:"clear", colorMood:"blue_green", tags:["forest_light"] },
  { id:"3-11", time:"day", weather:"clear", colorMood:"light_blue", tags:["light_blue_sky"] },
  { id:"3-13", time:"day", weather:"foggy", colorMood:"green_pastel", tags:["soft_pastel"] },
  { id:"3-16", time:"day", weather:"clear", colorMood:"warm_orange", tags:["daylight_warm"] },
];
/** @type {WindowImageMeta[]} */
export const sunsetSet4 = [
  { id:"4-1", time:"sunset", weather:"clear", colorMood:"warm_orange", tags:["golden_light"] },
  { id:"4-2", time:"sunset", weather:"clear", colorMood:"gold", tags:["sunset_glow"] },
  { id:"4-4", time:"sunset", weather:"clear", colorMood:"mixed_cool_warm", tags:["blue_to_orange"] },
];
/** @type {WindowImageMeta[]} */
export const afternoonSet5 = [
  { id:"5-2", time:"afternoon", weather:"clear", colorMood:"gold", tags:["warm_light"] },
  { id:"5-4", time:"afternoon", weather:"foggy", colorMood:"light_blue", tags:["pale_light"] },
  { id:"5-7", time:"afternoon", weather:"clear", colorMood:"cold_white", tags:["sunrays"] },
  { id:"5-11", time:"afternoon", weather:"foggy", colorMood:"green_pastel", tags:["mint_glow"] },
];

export const allWindowImages = [
  ...nightSet1, ...dawnSet2, ...daySet3, ...sunsetSet4, ...afternoonSet5,
];

// Similar mood fallbacks
export const MOOD_FALLBACKS = {
  warm_orange:["gold","mixed_cool_warm"],
  deep_blue:["navy_purple","dark_neutral"],
  light_blue:["blue_green","cold_white"],
  blue_green:["light_blue","green_pastel"],
  navy_purple:["deep_blue","dark_neutral"],
  cold_white:["light_blue","dark_neutral"],
  mixed_cool_warm:["warm_orange","gold"],
  dark_neutral:["deep_blue","cold_white"],
  green_pastel:["blue_green","light_blue"],
  gold:["warm_orange","mixed_cool_warm"],
  purple_pink:["navy_purple","warm_orange"],
};


