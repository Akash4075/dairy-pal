import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ReadingList } from "@/components/ReadingList";
import { Button } from "@/components/ui/button";
import { groupByDay, loadReadings, saveReadings, type Reading } from "@/lib/milk";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Daily Milk Degree Logs — MilkMitra" },
      {
        name: "description",
        content:
          "Day-by-day milk temperature history with averages, highs and lows from voice, manual and ESP32 sensor readings.",
      },
      { property: "og:title", content: "Daily Milk Degree Logs — MilkMitra" },
      {
        property: "og:description",
        content: "Track milk degree averages, highs and lows for every day of collection.",
      },
    ],
  }),
  component: Logs,
});

function Logs() {
  const [readings, setReadings] = useState<Reading[]>([]);

  useEffect(() => {
    setReadings(loadReadings());
  }, []);

  const days = useMemo(() => groupByDay(readings), [readings]);
  const chartData = useMemo(
    () =>
      [...days]
        .reverse()
        .slice(-14)
        .map((d) => ({
          day: d.day.slice(5),
          avg: d.avg,
          max: d.max,
        })),
    [days],
  );

  const removeReading = (id: string) => {
    setReadings((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveReadings(next);
      return next;
    });
  };

  const exportCsv = () => {
    const rows = [
      ["date", "time", "degree_c", "source", "note"],
      ...readings.map((r) => [
        r.createdAt.slice(0, 10),
        new Date(r.createdAt).toLocaleTimeString(),
        String(r.degree),
        r.source,
        r.note ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "milk-degree-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/">
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Daily milk logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {readings.length} reading(s) across {days.length} day(s).
          </p>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={readings.length === 0}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      {chartData.length > 1 ? (
        <div className="surface mt-6 p-4">
          <h2 className="mb-3 text-base">Average degree per day</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis unit="°" fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip />
                <Line type="monotone" dataKey="avg" stroke="var(--color-chart-1)" strokeWidth={2} />
                <Line type="monotone" dataKey="max" stroke="var(--color-chart-2)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <ReadingList readings={readings} onDelete={removeReading} />
      </div>
    </main>
  );
}
