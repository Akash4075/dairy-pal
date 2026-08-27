import { Mic, PencilLine, Trash2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { groupByDay, qualityFor, type Reading } from "@/lib/milk";
import { cn } from "@/lib/utils";

const sourceMeta = {
  manual: { icon: PencilLine, label: "Manual" },
  voice: { icon: Mic, label: "Voice" },
  esp32: { icon: Wifi, label: "Sensor" },
} as const;

function formatDay(day: string) {
  const today = new Date().toISOString().slice(0, 10);
  const date = new Date(`${day}T00:00:00`);
  if (day === today) return "Today";
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function ReadingList({
  readings,
  onDelete,
  limitDays,
}: {
  readings: Reading[];
  onDelete?: (id: string) => void;
  limitDays?: number;
}) {
  const days = groupByDay(readings);
  const shown = limitDays ? days.slice(0, limitDays) : days;

  if (shown.length === 0) {
    return (
      <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
        No readings yet. Speak a degree or type it in to start today&apos;s log.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {shown.map((group) => (
        <div key={group.day} className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold">{formatDay(group.day)}</h3>
            <p className="text-xs text-muted-foreground">
              avg {group.avg}°C · min {group.min}°C · max {group.max}°C · {group.readings.length}{" "}
              reading{group.readings.length > 1 ? "s" : ""}
            </p>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {group.readings.map((reading) => {
              const meta = sourceMeta[reading.source];
              const Icon = meta.icon;
              const tone = qualityFor(reading.degree).tone;
              return (
                <li key={reading.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "font-semibold tabular-nums",
                        tone === "good" && "text-success",
                        tone === "warn" && "text-warning",
                        tone === "bad" && "text-destructive",
                      )}
                    >
                      {reading.degree.toFixed(1)}°C
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {new Date(reading.createdAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {meta.label}
                      {reading.note ? ` · “${reading.note}”` : ""}
                    </p>
                  </div>
                  {onDelete ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete reading"
                      onClick={() => onDelete(reading.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
