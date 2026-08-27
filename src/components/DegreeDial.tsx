import { qualityFor } from "@/lib/milk";
import { cn } from "@/lib/utils";

export function DegreeDial({
  degree,
  caption,
}: {
  degree: number | null;
  caption?: string | undefined;
}) {

  const quality = degree === null ? null : qualityFor(degree);
  const toneClass =
    quality?.tone === "good"
      ? "text-success"
      : quality?.tone === "warn"
        ? "text-warning"
        : quality?.tone === "bad"
          ? "text-destructive"
          : "text-muted-foreground";

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className={cn("num-xl", toneClass)}>
        {degree === null ? "--" : degree.toFixed(1)}
        <span className="ml-1 align-top text-2xl">°C</span>
      </div>
      {quality ? (
        <>
          <p className={cn("text-sm font-semibold", toneClass)}>{quality.label}</p>
          <p className="max-w-xs text-xs text-muted-foreground">{quality.advice}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No reading yet today</p>
      )}
      {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}
    </div>
  );
}
