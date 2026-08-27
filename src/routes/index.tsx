import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Mic, MicOff, Plus, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import cowPhoto from "@/assets/cow.jpg";
import { DegreeDial } from "@/components/DegreeDial";
import { ReadingList } from "@/components/ReadingList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEsp32 } from "@/hooks/use-esp32";
import { useSpeechDegree } from "@/hooks/use-speech-degree";
import {
  loadReadings,
  makeReading,
  round1,
  saveReadings,
  type Reading,
  type Source,
} from "@/lib/milk";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MilkMitra — Milk Degree Tracker for Dairy Farmers" },
      {
        name: "description",
        content:
          "Record milk degree by voice or by hand, read live temperature from your ESP32 Wi-Fi sensor, and keep daily milk logs.",
      },
      { property: "og:title", content: "MilkMitra — Milk Degree Tracker for Dairy Farmers" },
      {
        property: "og:description",
        content:
          "Speak the milk degree, tap it in manually, or pull live readings from an ESP32 sensor over Wi-Fi.",
      },
    ],
  }),
  component: Home,
});

const LANGS = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिंदी" },
  { code: "mr-IN", label: "मराठी" },
];

function Home() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [manual, setManual] = useState("");
  const [lang, setLang] = useState("en-IN");
  const device = useEsp32();

  useEffect(() => {
    setReadings(loadReadings());
  }, []);

  const addReading = useCallback((degree: number, source: Source, note?: string) => {
    const reading = makeReading(degree, source, note);
    setReadings((prev) => {
      const next = [reading, ...prev];
      saveReadings(next);
      return next;
    });
    toast.success(`Saved ${degree.toFixed(1)}°C`, {
      description:
        source === "voice" ? "Heard from your voice" : source === "esp32" ? "From Wi-Fi sensor" : "Entered manually",
    });
  }, []);

  const speech = useSpeechDegree((degree, transcript) => addReading(degree, "voice", transcript));

  const latest = readings[0] ?? null;
  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return readings.filter((r) => r.createdAt.slice(0, 10) === today).length;
  }, [readings]);

  const removeReading = (id: string) => {
    setReadings((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveReadings(next);
      return next;
    });
  };

  const submitManual = () => {
    const value = Number(manual.replace(",", "."));
    if (!manual.trim() || !Number.isFinite(value)) {
      toast.error("Enter a number like 36.5");
      return;
    }
    addReading(round1(value), "manual");
    setManual("");
  };

  const readSensor = async (save: boolean) => {
    const value = await device.read();
    if (value === null) return;
    if (save) addReading(value, "esp32");
  };

  return (
    <main className="min-h-screen">
      <section className="hero-wash border-b border-border">
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-5 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              For dairy farmers
            </p>
            <h1 className="mt-3 text-4xl leading-tight md:text-5xl">
              Say the milk degree. We write the log.
            </h1>
            <p className="mt-4 max-w-md text-sm text-muted-foreground md:text-base">
              Speak “today milk degree is 36”, type it by hand, or let your ESP32 Wi-Fi sensor send
              the temperature straight into today&apos;s record.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => (speech.listening ? speech.stop() : speech.start(lang))}>
                {speech.listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                {speech.listening ? "Stop listening" : "Speak a degree"}
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/logs">See daily logs</Link>
              </Button>
            </div>
          </div>
          <div className="surface overflow-hidden p-0">
            <img
              src={cowPhoto}
              alt="Dairy cow looking at the camera"
              width={1024}
              height={1024}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-5 px-5 py-8 md:grid-cols-2">
        <div className="surface flex flex-col items-center gap-4 p-6">
          <p className="text-sm font-semibold text-muted-foreground">Latest milk degree</p>
          <DegreeDial
            degree={latest ? latest.degree : null}
            caption={
              latest
                ? `${new Date(latest.createdAt).toLocaleString()} · ${latest.source}`
                : undefined
            }
          />
          <p className="text-xs text-muted-foreground">{todayCount} reading(s) recorded today</p>
        </div>

        <div className="surface flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-lg">Voice entry</h2>
            <p className="text-sm text-muted-foreground">
              Tap the mic and say the degree out loud. Numbers in words work too.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {LANGS.map((l) => (
              <Button
                key={l.code}
                size="sm"
                variant={lang === l.code ? "default" : "outline"}
                onClick={() => setLang(l.code)}
              >
                {l.label}
              </Button>
            ))}
          </div>
          <Button
            size="lg"
            variant={speech.listening ? "destructive" : "default"}
            onClick={() => (speech.listening ? speech.stop() : speech.start(lang))}
          >
            {speech.listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            {speech.listening ? "Listening… tap to stop" : "Start speaking"}
          </Button>
          {speech.transcript ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">“{speech.transcript}”</p>
          ) : null}
          {speech.error ? <p className="text-sm text-destructive">{speech.error}</p> : null}
          {!speech.supported ? (
            <p className="text-xs text-muted-foreground">
              This browser has no speech engine — use manual entry instead.
            </p>
          ) : null}
        </div>

        <div className="surface flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-lg">Manual entry</h2>
            <p className="text-sm text-muted-foreground">Type the degree shown on the thermometer.</p>
          </div>
          <div className="flex gap-2">
            <Input
              inputMode="decimal"
              placeholder="36.5"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitManual();
              }}
              aria-label="Milk degree in Celsius"
            />
            <Button onClick={submitManual}>
              <Plus className="size-4" />
              Save
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[4, 6, 25, 36].map((preset) => (
              <Button key={preset} size="sm" variant="outline" onClick={() => addReading(preset, "manual")}>
                {preset}°C
              </Button>
            ))}
          </div>
        </div>

        <div className="surface flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg">ESP32 Wi-Fi sensor</h2>
              <p className="text-sm text-muted-foreground">
                Enter the address your ESP32 prints on serial, then read the live temperature.
              </p>
            </div>
            <span
              className={
                device.status === "online"
                  ? "flex items-center gap-1 text-xs font-semibold text-success"
                  : device.status === "offline"
                    ? "flex items-center gap-1 text-xs font-semibold text-destructive"
                    : "flex items-center gap-1 text-xs font-semibold text-muted-foreground"
              }
            >
              {device.status === "online" ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
              {device.status}
            </span>
          </div>
          <Input
            placeholder="http://192.168.1.50/temperature"
            value={device.url}
            onChange={(e) => device.updateUrl(e.target.value)}
            aria-label="ESP32 endpoint URL"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => void readSensor(false)}>
              <RefreshCw className="size-4" />
              Read now
            </Button>
            <Button onClick={() => void readSensor(true)}>Read &amp; save</Button>
            <div className="ml-auto flex items-center gap-2">
              <Switch id="auto" checked={device.autoPoll} onCheckedChange={device.setAutoPoll} />
              <Label htmlFor="auto" className="text-sm">
                Auto every 15s
              </Label>
            </div>
          </div>
          <div className="rounded-xl bg-muted px-4 py-3 text-sm">
            Live sensor:{" "}
            <strong className="tabular-nums">
              {device.temperature === null ? "--" : `${device.temperature.toFixed(1)}°C`}
            </strong>
            {device.lastSeen ? (
              <span className="text-muted-foreground">
                {" "}
                · updated {new Date(device.lastSeen).toLocaleTimeString()}
              </span>
            ) : null}
          </div>
          {device.error ? <p className="text-sm text-destructive">{device.error}</p> : null}
          <p className="text-xs text-muted-foreground">
            Keep the phone on the same Wi-Fi as the ESP32. The sketch should reply with JSON like{" "}
            <code>{'{"temperature": 36.4}'}</code> and send{" "}
            <code>Access-Control-Allow-Origin: *</code>.
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl">Recent log</h2>
          <Button variant="ghost" asChild>
            <Link to="/logs">All daily logs</Link>
          </Button>
        </div>
        <ReadingList readings={readings} onDelete={removeReading} limitDays={2} />
      </section>
    </main>
  );
}
