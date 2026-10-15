interface ToolMetrics {
  calls: number;
  errors: number;
  totalDurationMs: number;
}

const toolMetrics = new Map<string, ToolMetrics>();
const startedAt = Date.now();

export function recordToolCall(tool: string, durationMs: number, isError: boolean): void {
  const current = toolMetrics.get(tool) ?? { calls: 0, errors: 0, totalDurationMs: 0 };
  current.calls += 1;
  if (isError) current.errors += 1;
  current.totalDurationMs += durationMs;
  toolMetrics.set(tool, current);
}

export function getMetricsSnapshot() {
  return {
    // Per-isolate only — Workers cold starts reset these counters.
    uptimeMs: Date.now() - startedAt,
    tools: Object.fromEntries(
      Array.from(toolMetrics.entries()).map(([tool, m]) => [
        tool,
        { ...m, avgDurationMs: m.calls ? Math.round(m.totalDurationMs / m.calls) : 0 },
      ]),
    ),
  };
}
