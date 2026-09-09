"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { categoriesFor, UNITS, unitLabel } from "@/lib/catalog";
import { afterPrep, exceedsPar } from "@/lib/par";
import type { InventoryItem, ItemType, ReportLine } from "@/lib/types";
import { Modal } from "./Modal";

type Draft = Record<
  string,
  { onHand: string; madeToday: string; orderQty: string; reason: string }
>;

function today() {
  return new Date().toLocaleDateString("en-CA");
}

function num(value: string) {
  if (value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function blank(value?: number) {
  return value === undefined || value === null ? "" : String(value);
}

function emptyRow() {
  return { onHand: "", madeToday: "", orderQty: "", reason: "" };
}

function storageKey(type: ItemType, date: string) {
  return `tamaras-draft-${type}-${date}`;
}

export function InventorySheet({
  type,
  title,
  subtitle,
}: {
  type: ItemType;
  title: string;
  subtitle: string;
}) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [admin, setAdmin] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(today);
  const [reportId, setReportId] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [pendingReasons, setPendingReasons] = useState<InventoryItem[]>([]);
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", category: "", unit: "each", par: "" });
  const ready = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qDate = params.get("date");
    const qReport = params.get("report");
    if (qDate) setDate(qDate);
    if (qReport) setReportId(qReport);
  }, []);

  useEffect(() => {
    let cancelled = false;
    ready.current = false;
    async function load() {
      try {
        const [itemsRes, draftRes, reportRes] = await Promise.all([
          fetch(`/api/items?type=${type}`),
          fetch(`/api/drafts?type=${type}&date=${date}`),
          reportId ? fetch(`/api/reports?id=${reportId}`) : Promise.resolve(null),
        ]);
        const itemsData = await itemsRes.json();
        const draftData = await draftRes.json();
        const reportData = reportRes ? await reportRes.json() : null;
        if (cancelled) return;
        const loaded: InventoryItem[] = itemsData.items || [];
        setItems(loaded);
        setAdmin(Boolean(itemsData.admin));

        const next: Draft = {};
        const opened = reportData?.report as { submittedBy?: string; date?: string; lines?: ReportLine[] } | undefined;
        const serverDraft = draftData.draft as { submittedBy?: string; lines?: ReportLine[] } | null;
        if (opened?.lines?.length) {
          setSubmittedBy(opened.submittedBy || "");
          if (opened.date) setDate(opened.date);
          for (const line of opened.lines) {
            next[line.itemId] = {
              onHand: blank(line.onHand),
              madeToday: blank(line.madeToday),
              orderQty: blank(line.orderQty),
              reason: line.overParReason || "",
            };
          }
          setStatus(`Opened sent ${type} report for ${opened.date || date}. You can review, save a new draft, or send again.`);
        } else if (serverDraft?.lines?.length) {
          setSubmittedBy(serverDraft.submittedBy || "");
          for (const line of serverDraft.lines) {
            next[line.itemId] = {
              onHand: blank(line.onHand),
              madeToday: blank(line.madeToday),
              orderQty: blank(line.orderQty),
              reason: line.overParReason || "",
            };
          }
          setStatus(`Loaded saved ${type} sheet for ${date}. You can keep editing, then save or send.`);
        } else {
          const localRaw = localStorage.getItem(storageKey(type, date));
          if (localRaw) {
            const local = JSON.parse(localRaw) as { draft?: Draft; submittedBy?: string };
            setDraft(local.draft || {});
            setSubmittedBy(local.submittedBy || "");
            setStatus("Loaded your saved progress on this device.");
            ready.current = true;
            return;
          }
          for (const item of loaded) {
            next[item.id] = {
              ...emptyRow(),
              onHand: blank(item.lastOnHand),
            };
          }
          setStatus("");
        }
        setDraft(next);
        ready.current = true;
      } catch {
        if (!cancelled) setStatus("Could not load inventory.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [type, date, reportId]);

  useEffect(() => {
    if (!ready.current) return;
    localStorage.setItem(storageKey(type, date), JSON.stringify({ draft, submittedBy }));
  }, [draft, submittedBy, type, date]);

  const categoryOptions = useMemo(() => {
    const preset = categoriesFor(type);
    const extra = items.map((item) => item.category).filter((name) => !preset.includes(name));
    return ["All", ...preset, ...Array.from(new Set(extra))];
  }, [items, type]);

  const visible = items.filter((item) => {
    const matchCat = category === "All" || item.category === category;
    const matchQ = item.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  function row(id: string) {
    return draft[id] || emptyRow();
  }

  function patch(id: string, next: Partial<Draft[string]>, item?: InventoryItem) {
    setDraft((prev) => {
      const current = prev[id] || emptyRow();
      const merged = { ...current, ...next };
      if (type === "ordering" && item && next.onHand !== undefined) {
        const suggested = Math.max(0, item.par - num(merged.onHand));
        if (current.orderQty === "" || current.orderQty === String(Math.max(0, item.par - num(current.onHand)))) {
          merged.orderQty = suggested ? String(suggested) : "0";
        }
      }
      return { ...prev, [id]: merged };
    });
  }

  function lines(): ReportLine[] {
    return items.map((item) => {
      const values = row(item.id);
      return {
        itemId: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        par: item.par,
        onHand: num(values.onHand),
        madeToday: type === "prep" ? num(values.madeToday) : undefined,
        orderQty: type === "ordering" ? num(values.orderQty) : undefined,
        overParReason: values.reason.trim() || undefined,
      };
    });
  }

  function overParItems() {
    return items.filter((item) => {
      const values = row(item.id);
      return (
        type === "prep" &&
        exceedsPar(item.par, num(values.onHand), num(values.madeToday)) &&
        !values.reason.trim()
      );
    });
  }

  async function save(showMessage = true) {
    setSaving(true);
    if (showMessage) setStatus("");
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        date,
        submittedBy: submittedBy || (type === "prep" ? "Prep" : "Manager"),
        lines: lines(),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error || "Could not save.");
      return false;
    }
    if (showMessage) {
      setStatus(`Inventory saved for ${date}. Come back anytime — it will be on this sheet and in Records.`);
    }
    return true;
  }

  async function send() {
    const missing = overParItems();
    if (missing.length) {
      setPendingReasons(missing);
      setReasonOpen(true);
      return;
    }
    await submit();
  }

  async function submit() {
    setSending(true);
    setStatus("");
    const res = await fetch("/api/reports/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        date,
        submittedBy: submittedBy || (type === "prep" ? "Prep" : "Manager"),
        lines: lines(),
      }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setStatus(data.error || "Could not send.");
      if (data.items) {
        setPendingReasons(items.filter((item) => data.items.includes(item.name)));
        setReasonOpen(true);
      }
      return;
    }
    localStorage.removeItem(storageKey(type, date));
    if (data.emailed) {
      setStatus(`Saved, stored, and emailed to the owner for ${date}. Open Records to see it anytime.`);
    } else {
      setStatus(
        `Saved and stored for ${date}. Email is not set up yet — add SMTP on Vercel so it goes to fairhopefood@ymail.com.`
      );
    }
    setReasonOpen(false);
  }

  async function addItem() {
    if (!addForm.name.trim()) return;
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        name: addForm.name,
        category: addForm.category || categoriesFor(type)[0],
        unit: addForm.unit || "each",
        par: addForm.par,
      }),
    });
    const data = await res.json();
    if (data.item) {
      setItems((prev) =>
        [...prev, data.item].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
      );
      setAddForm({ name: "", category: "", unit: "each", par: "" });
      setAddOpen(false);
    }
  }

  async function savePar(item: InventoryItem, par: string) {
    const value = Number(par);
    if (!Number.isFinite(value) || value < 0) return;
    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ par: value }),
    });
    const data = await res.json();
    if (data.item) {
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? data.item : entry)));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28">
      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Date</span>
          <input className="sheet-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Your name</span>
          <input
            className="sheet-input"
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            placeholder={type === "prep" ? "Prep cook" : "Manager"}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Search</span>
          <input
            className="sheet-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an item"
          />
        </label>
      </div>

      <div className="mb-4 max-w-sm">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Category</span>
          <select className="sheet-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categoryOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{subtitle}</p>
        <button className="btn btn-gold" type="button" onClick={() => setAddOpen(true)}>
          + Add inventory
        </button>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#eadcc6] md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-wine text-[#fffaf2]">
            <tr>
              <th className="px-3 py-3">Item</th>
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3">Par {admin ? "(admin)" : ""}</th>
              <th className="px-3 py-3">On hand</th>
              {type === "prep" ? <th className="px-3 py-3">Made today</th> : <th className="px-3 py-3">To order</th>}
              {type === "prep" ? <th className="px-3 py-3">On hand + made</th> : null}
              {type === "prep" ? <th className="px-3 py-3">Reason if over par</th> : null}
            </tr>
          </thead>
          <tbody className="bg-paper">
            {visible.map((item) => {
              const values = row(item.id);
              const over = type === "prep" && exceedsPar(item.par, num(values.onHand), num(values.madeToday));
              return (
                <tr key={item.id} className={`border-t border-[#eadcc6] ${over ? "bg-[#f8e4c8]" : ""}`}>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-muted">{item.category}</div>
                  </td>
                  <td className="px-3 py-2">{unitLabel(item.unit)}</td>
                  <td className="px-3 py-2">
                    {admin ? (
                      <input
                        className="sheet-input max-w-24"
                        type="number"
                        min="0"
                        defaultValue={item.par}
                        onBlur={(e) => savePar(item, e.target.value)}
                      />
                    ) : (
                      <span className="font-semibold">{item.par}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="sheet-input max-w-28"
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={values.onHand}
                      onChange={(e) => patch(item.id, { onHand: e.target.value }, item)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {type === "prep" ? (
                      <input
                        className="sheet-input max-w-28"
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={values.madeToday}
                        onChange={(e) => patch(item.id, { madeToday: e.target.value })}
                      />
                    ) : (
                      <input
                        className="sheet-input max-w-28"
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={values.orderQty}
                        onChange={(e) => patch(item.id, { orderQty: e.target.value })}
                      />
                    )}
                  </td>
                  {type === "prep" ? (
                    <td className="px-3 py-2 font-semibold">
                      {afterPrep(num(values.onHand), num(values.madeToday))}
                      {over ? <span className="ml-1 text-xs text-wine">over {item.par}</span> : null}
                    </td>
                  ) : null}
                  {type === "prep" ? (
                    <td className="px-3 py-2">
                      {over ? (
                        <input
                          className="sheet-input"
                          value={values.reason}
                          onChange={(e) => patch(item.id, { reason: e.target.value })}
                          placeholder="Why is on hand + made over par?"
                        />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {visible.map((item) => {
          const values = row(item.id);
          const over = type === "prep" && exceedsPar(item.par, num(values.onHand), num(values.madeToday));
          return (
            <article key={item.id} className={`card p-4 ${over ? "ring-2 ring-gold" : ""}`}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">{item.category}</p>
                  <h3 className="serif text-2xl leading-tight">{item.name}</h3>
                </div>
                <p className="rounded-full bg-cream-deep px-3 py-1 text-sm">
                  Par {item.par} {unitLabel(item.unit)}
                </p>
              </div>
              {admin ? (
                <label className="mb-2 block text-sm">
                  Edit par
                  <input
                    className="sheet-input mt-1"
                    type="number"
                    defaultValue={item.par}
                    onBlur={(e) => savePar(item, e.target.value)}
                  />
                </label>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">
                  On hand
                  <input
                    className="sheet-input mt-1"
                    type="number"
                    value={values.onHand}
                    onChange={(e) => patch(item.id, { onHand: e.target.value }, item)}
                  />
                </label>
                <label className="text-sm">
                  {type === "prep" ? "Made today" : "To order"}
                  <input
                    className="sheet-input mt-1"
                    type="number"
                    value={type === "prep" ? values.madeToday : values.orderQty}
                    onChange={(e) => {
                      if (type === "prep") patch(item.id, { madeToday: e.target.value });
                      else patch(item.id, { orderQty: e.target.value });
                    }}
                  />
                </label>
              </div>
              {type === "prep" ? (
                <p className="mt-2 text-sm">
                  On hand + made: <strong>{afterPrep(num(values.onHand), num(values.madeToday))}</strong>
                  {over ? ` — over par ${item.par}` : ""}
                </p>
              ) : null}
              {over ? (
                <label className="mt-2 block text-sm">
                  Why is on hand + made over par?
                  <input
                    className="sheet-input mt-1"
                    value={values.reason}
                    onChange={(e) => patch(item.id, { reason: e.target.value })}
                  />
                </label>
              ) : null}
            </article>
          );
        })}
      </div>

      {status ? <p className="mt-4 rounded-xl bg-gold-soft px-4 py-3 text-sm">{status}</p> : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-[#eadcc6] bg-[#fffaf2]/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-end gap-2">
          <button className="btn btn-ghost min-w-40" disabled={saving || sending} onClick={() => void save()} type="button">
            {saving ? "Saving…" : "Save inventory"}
          </button>
          <button className="btn btn-wine min-w-48" disabled={sending || saving} onClick={send} type="button">
            {sending ? "Sending…" : `Send ${title}`}
          </button>
        </div>
      </div>

      {addOpen ? (
        <Modal title="Add inventory item" onClose={() => setAddOpen(false)}>
          <div className="grid gap-3">
            <input
              className="sheet-input"
              placeholder="Item name"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            />
            <label className="text-sm">
              <span className="mb-1 block text-muted">Category</span>
              <select
                className="sheet-input"
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
              >
                <option value="">Choose a category</option>
                {categoriesFor(type).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">Unit</span>
              <select
                className="sheet-input"
                value={addForm.unit}
                onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
              >
                {UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </label>
            {admin ? (
              <input
                className="sheet-input"
                placeholder="Par"
                type="number"
                value={addForm.par}
                onChange={(e) => setAddForm({ ...addForm, par: e.target.value })}
              />
            ) : (
              <p className="text-sm text-muted">Par stays at 0 until an admin sets it.</p>
            )}
            <button className="btn btn-wine" type="button" onClick={addItem}>
              Save item
            </button>
          </div>
        </Modal>
      ) : null}

      {reasonOpen ? (
        <Modal title="Why did we make over par?" onClose={() => setReasonOpen(false)}>
          <p className="mb-3 text-sm text-muted">
            If on hand plus made today is over par, add a reason so the owner sees it on the dated email.
          </p>
          <div className="grid gap-3">
            {pendingReasons.map((item) => (
              <label key={item.id} className="text-sm">
                <span className="font-semibold">
                  {item.name} — on hand {row(item.id).onHand} + made {row(item.id).madeToday} ={" "}
                  {afterPrep(num(row(item.id).onHand), num(row(item.id).madeToday))}, par {item.par}
                </span>
                <input
                  className="sheet-input mt-1"
                  value={row(item.id).reason}
                  onChange={(e) => patch(item.id, { reason: e.target.value })}
                  placeholder="Banquet, 86'd backup, brunch rush…"
                />
              </label>
            ))}
            <button
              className="btn btn-wine"
              type="button"
              onClick={() => {
                if (overParItems().length) return;
                void submit();
              }}
            >
              Save reasons and send
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
