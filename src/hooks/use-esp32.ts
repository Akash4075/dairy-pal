import { useCallback, useEffect, useRef, useState } from "react";
import { loadDeviceUrl, round1, saveDeviceUrl } from "@/lib/milk";

export type DeviceStatus = "idle" | "connecting" | "online" | "offline";

function extractTemperature(payload: unknown): number | null {
  if (typeof payload === "number" && Number.isFinite(payload)) return payload;
  if (typeof payload === "string") {
    const match = payload.match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["temperature", "temp", "degree", "milkTemp", "value", "c"]) {
      const found = extractTemperature(obj[key]);
      if (found !== null) return found;
    }
  }
  return null;
}

export function useEsp32() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<DeviceStatus>("idle");
  const [temperature, setTemperature] = useState<number | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoPoll, setAutoPoll] = useState(false);
  const urlRef = useRef("");

  useEffect(() => {
    const saved = loadDeviceUrl();
    setUrl(saved);
    urlRef.current = saved;
  }, []);

  const updateUrl = useCallback((next: string) => {
    setUrl(next);
    urlRef.current = next;
    saveDeviceUrl(next);
  }, []);

  const read = useCallback(async (): Promise<number | null> => {
    const target = urlRef.current.trim();
    if (!target) {
      setError("Enter your ESP32 address first, e.g. http://192.168.1.50/temperature");
      return null;
    }
    setStatus("connecting");
    setError(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(target, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Device replied ${res.status}`);
      const text = await res.text();
      let value: number | null = null;
      try {
        value = extractTemperature(JSON.parse(text));
      } catch {
        value = extractTemperature(text);
      }
      if (value === null) throw new Error("Could not read a temperature from the device response");
      const rounded = round1(value);
      setTemperature(rounded);
      setLastSeen(new Date().toISOString());
      setStatus("online");
      return rounded;
    } catch (err) {
      setStatus("offline");
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "Device did not answer in time. Check that the phone is on the same Wi-Fi."
          : (err as Error).message,
      );
      return null;
    }
  }, []);

  useEffect(() => {
    if (!autoPoll) return;
    void read();
    const id = setInterval(() => void read(), 15000);
    return () => clearInterval(id);
  }, [autoPoll, read]);

  return {
    url,
    updateUrl,
    status,
    temperature,
    lastSeen,
    error,
    autoPoll,
    setAutoPoll,
    read,
  };
}
