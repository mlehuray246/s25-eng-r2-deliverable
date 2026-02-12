"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownUp, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/* ----------------------------- Config ----------------------------- */
const CSV_URL = "/sample_animals.csv"; // must exist in /public

/* ----------------------------- Types ----------------------------- */
type Row = Record<string, string | number | null>;

interface ChartDatum {
  name: string;
  value: number;
  group: string; // herbivore/omnivore/carnivore/etc
  raw: Row;
}

/* ----------------------------- CSV Parser ----------------------------- */
function parseCSV(text: string): { rows: Row[]; headers: string[] } {
  const rows: string[][] = [];
  let cur = "";
  let inQuotes = false;
  let row: string[] = [];

  const pushCell = () => {
    row.push(cur);
    cur = "";
  };

  const pushRow = () => {
    if (row.length === 1 && row[0].trim() === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === ",") {
      pushCell();
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      pushCell();
      pushRow();
      continue;
    }
    cur += ch;
  }

  pushCell();
  pushRow();

  const headers = (rows[0] ?? []).map((h) => h.trim()).filter(Boolean);
  const data = rows.slice(1);

  const normalized: Row[] = data
    .filter((r) => r.some((c) => (c ?? "").toString().trim() !== ""))
    .map((r) => {
      const obj: Row = {};
      headers.forEach((h, idx) => {
        const v = r[idx];
        obj[h] = v == null || v.toString().trim() === "" ? null : v.toString().trim();
      });
      return obj;
    });

  return { rows: normalized, headers };
}

/* ----------------------------- Helpers ----------------------------- */
function niceLabel(s: string) {
  return s
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function toNumberLoose(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v).trim();
  if (!s) return null;

  const cleaned = s
    .replace(/,/g, "")
    .replace(/km\/h|kph|mph|m\/s|ms-1|ms\^-1/gi, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function pickDefaultName(headers: string[]) {
  const candidates = ["name", "animal", "species", "common_name", "scientific_name"];
  return headers.find((h) => candidates.includes(h.toLowerCase())) ?? headers[0] ?? "";
}

function pickDefaultValue(headers: string[], rows: Row[]) {
  return (
    headers.find((h) => h.toLowerCase().includes("speed")) ??
    headers.find((h) => rows.some((r) => toNumberLoose(r[h]) != null)) ??
    ""
  );
}

function pickDefaultGroup(headers: string[]) {
  const candidates = ["diet", "type", "trophic_level", "feeding", "category"];
  return headers.find((h) => candidates.includes(h.toLowerCase())) ?? "__none__";
}

function normalizeGroup(v: unknown) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "unknown";
  if (s.includes("herb")) return "herbivore";
  if (s.includes("omni")) return "omnivore";
  if (s.includes("carn")) return "carnivore";
  if (s.includes("insect")) return "insectivore";
  if (s.includes("pisc")) return "piscivore";
  if (s.includes("frug")) return "frugivore";
  return s;
}

function truncate(s: string, max = 10) {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

/* ----------------------------- Gentle Palette ----------------------------- */
// Soft, “pastel-ish” but still readable on light/dark backgrounds.
const GROUP_COLOR: Record<string, string> = {
  herbivore: "#86efac", // soft green
  omnivore: "#fde68a", // soft amber
  carnivore: "#fca5a5", // soft red
  insectivore: "#ddd6fe", // soft violet
  piscivore: "#93c5fd", // soft blue
  frugivore: "#99f6e4", // soft teal
  unknown: "#cbd5e1", // soft slate
};

const FALLBACK = ["#bfdbfe", "#bbf7d0", "#fde68a", "#fecaca", "#ddd6fe", "#99f6e4", "#cbd5e1"];

function getColor(group: string, idx: number) {
  return GROUP_COLOR[group] ?? FALLBACK[idx % FALLBACK.length];
}

/* ----------------------------- Tooltip ----------------------------- */
function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as ChartDatum | undefined;
  if (!p) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <div className="text-sm font-semibold">{p.name}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Value: <span className="font-semibold text-foreground">{p.value}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Type: <span className="font-semibold capitalize text-foreground">{p.group}</span>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">Tip: click bar to hide</div>
    </div>
  );
}

/* ----------------------------- Component ----------------------------- */
export default function AnimalSpeedGraph() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameKey, setNameKey] = useState("");
  const [valueKey, setValueKey] = useState("");
  const [groupKey, setGroupKey] = useState<string>("__none__");

  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState<string>("__none__");
  const [filterValue, setFilterValue] = useState<string>("__all__");
  const [sortDesc, setSortDesc] = useState(true);
  const [topN, setTopN] = useState(15);

  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(CSV_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch ${CSV_URL}`);

        const text = await res.text();
        const parsed = parseCSV(text);

        setRows(parsed.rows);
        setHeaders(parsed.headers);

        setNameKey(pickDefaultName(parsed.headers));
        setValueKey(pickDefaultValue(parsed.headers, parsed.rows));
        setGroupKey(pickDefaultGroup(parsed.headers));
      } catch (e: any) {
        setError(e?.message ?? "Failed to load CSV");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const numericHeaders = useMemo(
    () => headers.filter((h) => rows.some((r) => toNumberLoose(r[h]) != null)),
    [headers, rows],
  );

  const filterableHeaders = useMemo(
    () => headers.filter((h) => rows.some((r) => String(r[h] ?? "").trim() !== "")),
    [headers, rows],
  );

  const filterValues = useMemo(() => {
    if (filterKey === "__none__") return [];
    const set = new Set<string>();
    for (const r of rows) {
      const v = String(r[filterKey] ?? "").trim();
      if (v) set.add(v);
      if (set.size > 250) break;
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [filterKey, rows]);

  const data = useMemo<ChartDatum[]>(() => {
    if (!nameKey || !valueKey) return [];

    const base: ChartDatum[] = rows
      .map((r) => {
        const name = String(r[nameKey] ?? "").trim();
        const value = toNumberLoose(r[valueKey]);
        if (!name || value == null) return null;

        const grp = groupKey !== "__none__" ? normalizeGroup(r[groupKey]) : "unknown";
        return { name, value, group: grp, raw: r };
      })
      .filter(Boolean) as ChartDatum[];

    const filtered = base.filter((d) => {
      if (hidden.has(d.name)) return false;

      if (search.trim()) {
        const hay = `${d.name} ${Object.values(d.raw).join(" ")}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }

      if (filterKey !== "__none__" && filterValue !== "__all__") {
        const v = String(d.raw[filterKey] ?? "").trim();
        if (v !== filterValue) return false;
      }

      return true;
    });

    filtered.sort((a, b) => (sortDesc ? b.value - a.value : a.value - b.value));
    return filtered;
  }, [rows, nameKey, valueKey, groupKey, hidden, search, filterKey, filterValue, sortDesc]);

  const shown = useMemo(() => data.slice(0, topN), [data, topN]);

  const legendItems = useMemo(() => {
    const seen = new Set<string>();
    const items: { key: string; color: string }[] = [];
    shown.forEach((d, idx) => {
      if (seen.has(d.group)) return;
      seen.add(d.group);
      items.push({ key: d.group, color: getColor(d.group, idx) });
    });
    return items.sort((a, b) => a.key.localeCompare(b.key));
  }, [shown]);

  if (loading) return <div className="text-muted-foreground">Loading cleaned dataset…</div>;

  if (error) {
    return (
      <div className="space-y-2">
        <div className="font-medium text-red-600">Couldn’t load the cleaned dataset.</div>
        <div className="text-sm text-muted-foreground">{error}</div>
        <div className="text-sm text-muted-foreground">
          Put your cleaned CSV at <code>/public/cleaned_animals.csv</code> (served as <code>{CSV_URL}</code>).
        </div>
      </div>
    );
  }

  // More bars => more width; keep it readable without overloading.
  const minWidth = Math.max(900, shown.length * 55);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="rounded-lg border p-3">
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />

          <Select
            value={filterKey}
            onValueChange={(v) => {
              setFilterKey(v);
              setFilterValue("__all__");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No filter</SelectItem>
              {filterableHeaders.map((h) => (
                <SelectItem key={h} value={h}>
                  {niceLabel(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterValue} onValueChange={setFilterValue} disabled={filterKey === "__none__"}>
            <SelectTrigger>
              <SelectValue placeholder="Filter value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              {filterValues.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex w-full items-center gap-2 text-sm">
            Bars
            <input
              type="range"
              min={8}
              max={Math.min(40, Math.max(15, data.length || 15))}
              step={1}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="w-full"
            />
            <span className="rounded border px-2 py-0.5 text-xs">{topN}</span>
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Select value={nameKey} onValueChange={setNameKey}>
            <SelectTrigger>
              <SelectValue placeholder="Name column" />
            </SelectTrigger>
            <SelectContent>
              {headers.map((h) => (
                <SelectItem key={h} value={h}>
                  {niceLabel(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={valueKey} onValueChange={setValueKey}>
            <SelectTrigger>
              <SelectValue placeholder="Value column" />
            </SelectTrigger>
            <SelectContent>
              {numericHeaders.map((h) => (
                <SelectItem key={h} value={h}>
                  {niceLabel(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={groupKey} onValueChange={setGroupKey}>
            <SelectTrigger>
              <SelectValue placeholder="Color by (diet/type)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No grouping</SelectItem>
              {filterableHeaders.map((h) => (
                <SelectItem key={h} value={h}>
                  {niceLabel(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setSortDesc((v) => !v)}>
              <ArrowDownUp className="mr-2 h-4 w-4" />
              Sort {sortDesc ? "high → low" : "low → high"}
            </Button>

            {hidden.size > 0 ? (
              <Button variant="outline" onClick={() => setHidden(new Set())}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Restore ({hidden.size})
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Legend */}
      {legendItems.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {legendItems.map((it) => (
            <div key={it.key} className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: it.color }} />
              <span className="capitalize">{it.key}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Chart */}
      {shown.length === 0 ? (
        <div className="text-muted-foreground">No rows match your current search/filter.</div>
      ) : (
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">
              {niceLabel(valueKey || "Value")} (Top {shown.length})
            </div>
            <div className="text-xs text-muted-foreground">Matching: {data.length}</div>
          </div>

          {/* Horizontal scroll container so labels stay readable */}
          <div className="w-full overflow-x-auto">
            <div style={{ width: minWidth }} className="h-[520px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shown} margin={{ top: 12, right: 18, left: 12, bottom: 85 }} barCategoryGap={22}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-30}
                    height={85}
                    textAnchor="end"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => truncate(String(v ?? ""), 12)}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />

                  <Bar
                    dataKey="value"
                    // thicker bars + rounded tops
                    barSize={26}
                    radius={[10, 10, 2, 2]}
                    onClick={(d: any) => {
                      const nm = String(d?.name ?? "").trim();
                      if (nm) setHidden((prev) => new Set(prev).add(nm));
                    }}
                  >
                    {shown.map((d, idx) => (
                      <Cell key={`${d.name}-${idx}`} fill={getColor(d.group, idx)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            Hover for details. Click a bar to hide it (Restore to undo). Gentle colors are based on diet/type.
          </div>
        </div>
      )}
    </div>
  );
}
