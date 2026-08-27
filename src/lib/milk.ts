export type Source = "manual" | "voice" | "esp32";

export type Reading = {
  id: string;
  degree: number;
  source: Source;
  note?: string;
  createdAt: string; // ISO
};

const READINGS_KEY = "milkmitra.readings.v1";
const DEVICE_KEY = "milkmitra.device.v1";

export function loadReadings(): Reading[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(READINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Reading[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReadings(readings: Reading[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READINGS_KEY, JSON.stringify(readings));
}

export function loadDeviceUrl(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(DEVICE_KEY) ?? "";
}

export function saveDeviceUrl(url: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEVICE_KEY, url);
}

export function makeReading(degree: number, source: Source, note?: string): Reading {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    degree,
    source,
    ...(note ? { note } : {}),
    createdAt: new Date().toISOString(),
  };
}

const WORD_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/** Pull a milk degree out of free speech, e.g. "today milk degree is 36.5". */
export function parseDegreeFromSpeech(text: string): number | null {
  const lower = text.toLowerCase().replace(/,/g, "");

  const digit = lower.match(/(\d+(?:\.\d+)?)\s*(?:point\s*(\d))?/);
  if (digit) {
    const base = Number(digit[1]);
    const frac = digit[2];
    const value = frac && !digit[1]!.includes(".") ? Number(`${base}.${frac}`) : base;
    if (Number.isFinite(value)) return round1(value);
  }

  // spoken words: "thirty six point five"
  const words = lower.split(/[\s-]+/);
  let total: number | null = null;
  let decimal: number | null = null;
  let seenPoint = false;
  for (const w of words) {
    if (w === "point" || w === "decimal") {
      if (total !== null) seenPoint = true;
      continue;
    }
    const n = WORD_NUMBERS[w];
    if (n === undefined) {
      if (total !== null) break;
      continue;
    }
    if (seenPoint) {
      decimal = n;
      break;
    }
    total = total === null ? n : total + n;
  }
  if (total === null) return null;
  return round1(decimal !== null ? Number(`${total}.${decimal}`) : total);
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function qualityFor(degree: number): {
  label: string;
  tone: "good" | "warn" | "bad";
  advice: string;
} {
  if (degree <= 6)
    return { label: "Chilled — Excellent", tone: "good", advice: "Ideal storage temperature." };
  if (degree <= 10)
    return { label: "Cool — Good", tone: "good", advice: "Safe. Keep the chiller running." };
  if (degree <= 20)
    return { label: "Warm — Deliver soon", tone: "warn", advice: "Send to the dairy quickly." };
  if (degree <= 30)
    return { label: "Warm — Risky", tone: "warn", advice: "Cool the milk within the hour." };
  return { label: "Fresh from cow / Hot", tone: "bad", advice: "Chill immediately to avoid spoiling." };
}

export function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function groupByDay(readings: Reading[]) {
  const map = new Map<string, Reading[]>();
  for (const r of readings) {
    const key = dayKey(r.createdAt);
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, list]) => {
      const sorted = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      const avg = round1(list.reduce((s, r) => s + r.degree, 0) / list.length);
      return {
        day,
        readings: sorted,
        avg,
        min: round1(Math.min(...list.map((r) => r.degree))),
        max: round1(Math.max(...list.map((r) => r.degree))),
      };
    });
}
