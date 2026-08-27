import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEsp32 } from "@/hooks/use-esp32";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "ESP32 Sensor Settings — MilkMitra" },
      {
        name: "description",
        content:
          "Connect your ESP32 Wi-Fi milk temperature sensor: set the device address, test the connection and turn on auto refresh.",
      },
      { property: "og:title", content: "ESP32 Sensor Settings — MilkMitra" },
      {
        property: "og:description",
        content: "Set up and test the Wi-Fi connection to your ESP32 milk temperature sensor.",
      },
    ],
  }),
  component: Settings,
});

const SKETCH = `#include <WiFi.h>
#include <WebServer.h>

WebServer server(80);

void handleTemp() {
  float c = readMilkSensor();           // your DS18B20 / thermistor read
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json",
              "{\\"temperature\\": " + String(c, 1) + "}");
}

void setup() {
  WiFi.begin("YOUR_WIFI", "PASSWORD");
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println(WiFi.localIP());       // use this IP in the app
  server.on("/temperature", handleTemp);
  server.begin();
}

void loop() { server.handleClient(); }`;

function Settings() {
  const device = useEsp32();

  const test = async () => {
    const value = await device.read();
    if (value !== null) toast.success(`Connected — sensor reads ${value.toFixed(1)}°C`);
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/">
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </Button>

      <h1 className="text-3xl">ESP32 connection</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect the app to your ESP32 over Wi-Fi HTTP. Settings are saved on this device.
      </p>

      <div className="surface mt-6 flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg">Device address</h2>
            <p className="text-sm text-muted-foreground">
              Use the IP the ESP32 prints on the serial monitor.
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
        <div className="space-y-2">
          <Label htmlFor="device-url">Endpoint URL</Label>
          <Input
            id="device-url"
            placeholder="http://192.168.1.50/temperature"
            value={device.url}
            onChange={(e) => device.updateUrl(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void test()}>
            <RefreshCw className="size-4" />
            Test connection
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Switch id="auto" checked={device.autoPoll} onCheckedChange={device.setAutoPoll} />
            <Label htmlFor="auto" className="text-sm">
              Auto refresh every 15s
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
      </div>

      <div className="surface mt-5 p-6">
        <h2 className="text-lg">Checklist</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• Phone and ESP32 must be on the same Wi-Fi network.</li>
          <li>
            • The device should reply with JSON like <code>{'{"temperature": 36.4}'}</code> (plain
            numbers also work).
          </li>
          <li>
            • The sketch must send <code>Access-Control-Allow-Origin: *</code> so the browser accepts
            the reply.
          </li>
          <li>
            • Browsers block plain <code>http://</code> calls from a secure page — open this app over
            http, or serve the ESP32 through https.
          </li>
        </ul>
      </div>

      <div className="surface mt-5 p-6">
        <h2 className="text-lg">Example ESP32 sketch</h2>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-4 text-xs leading-relaxed">
          {SKETCH}
        </pre>
      </div>
    </main>
  );
}
