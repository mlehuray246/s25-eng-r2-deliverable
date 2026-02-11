"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, ArrowDownUp, RefreshCw } from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type Row = Record<string, string | number | null>;

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

function niceLabel(s: string) {
  return s
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

/* ----------------------------- Component ----------------------------- */

export default function AnimalSpeedGraph() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameKey, setNameKey] = useState("");
  const [valueKey, setValueKey] = useState("");

  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [topN, setTopN] = useState(30);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/sample_animals.csv", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch /sample_animals.csv");

        const text = await res.text();
        const parsed = parseCSV(text);

        setRows(parsed.rows);
        setHeaders(parsed.headers);

        const defaultName =
          parsed.headers.find((h) =>
            ["name", "animal", "species", "common_name"].includes(h.toLowerCase())
          ) ?? parsed.headers[0];

        const defaultValue =
          parsed.headers.find((h) => h.toLowerCase().includes("speed")) ??
          parsed.headers.find((h) => parsed.rows.some((r) => toNumberLoose(r[h]) != null)) ??
          "";

        setNameKey(defaultName ?? "");
        setValueKey(defaultValue ?? "");
      } catch (e: any) {
        setError(e?.message ?? "Failed to load CSV");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const numericHeaders = useMemo(() => {
    return headers.filter((h) => rows.some((r) => toNumberLoose(r[h]) != null));
  }, [headers, rows]);

  const data = useMemo(() => {
    if (!nameKey || !valueKey) return [];

    const filtered = rows
      .map((r) => {
        const name = String(r[nameKey] ?? "").trim();
        const value = toNumberLoose(r[valueKey]);
        return { ...r, __name: name, __value: value };
      })
      .filter((r: any) => {
        if (!r.__name) return false;
        if (r.__value == null) return false;
        if (deleted.has(r.__name)) return false;

        if (search.trim()) {
          const hay = `${r.__name} ${Object.values(r).join(" ")}`.toLowerCase();
          if (!hay.includes(search.toLowerCase())) return false;
        }

        return true;
      });

    filtered.sort((a: any, b: any) => (sortDesc ? b.__value - a.__value : a.__value - b.__value));

    return filtered;
  }, [rows, nameKey, valueKey, deleted, search, sortDesc]);

  const shown = useMemo(() => data.slice(0, topN), [data, topN]);
  const max = useMemo(() => Math.max(...shown.map((r: any) => r.__value as number), 1), [shown]);

  if (loading) return <div className="text-muted-foreground">Loading CSV…</div>;

  if (error) {
    return (
      <div className="space-y-2">
        <div className="font-medium text-red-600">Couldn’t load the CSV.</div>
        <div className="text-sm text-muted-foreground">{error}</div>
        <div className="text-sm text-muted-foreground">
          Make sure the file exists at <code>/public/sample_animals.csv</code> and restart dev server.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid gap-3 md:grid-cols-3">
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />

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
            <SelectValue placeholder="Numeric column" />
          </SelectTrigger>
          <SelectContent>
            {numericHeaders.map((h) => (
              <SelectItem key={h} value={h}>
                {niceLabel(h)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => setSortDesc((v) => !v)}>
          <ArrowDownUp className="mr-2 h-4 w-4" />
          Sort {sortDesc ? "fast → slow" : "slow → fast"}
        </Button>

        <label className="flex items-center gap-2 text-sm">
          Top N
          <input
            type="range"
            min={5}
            max={Math.min(200, Math.max(20, data.length || 20))}
            step={1}
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="w-36 accent-indigo-500"
          />
          <span className="rounded border px-2 py-0.5 text-xs">{topN}</span>
        </label>

        {deleted.size > 0 ? (
          <Button variant="outline" onClick={() => setDeleted(new Set())}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Restore deleted ({deleted.size})
          </Button>
        ) : null}
      </div>

      <div className="h-px w-full bg-border" />

      {/* Bars */}
      {shown.length === 0 ? (
        <div className="text-muted-foreground">No rows match your search / selection.</div>
      ) : (
        <div className="space-y-2">
          {shown.map((r: any) => {
            const value = r.__value as number;
            const pct = Math.max(2, Math.round((value / max) * 100));
            return (
              <div key={r.__name} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.__name}</div>
                    <div className="text-xs text-muted-foreground">{value}</div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleted((prev) => new Set(prev).add(r.__name))}
                    aria-label={`Delete ${r.__name}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                <div className="mt-2 h-3 w-full rounded bg-muted">
                  <div
                    className="h-3 rounded bg-indigo-500 transition-all"
                    style={{ width: `${pct}%` }}
                    title={`${value}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
