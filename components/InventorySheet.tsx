"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [submittedBy, setSubmittedBy] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [pendingReasons, setPendingReasons] = useState<InventoryItem[]>([]);
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", category: "", unit: "ea", par: "" });

  useEffect(() => {
    fetch(`/api/items?type=${type}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items || []);
        setAdmin(Boolean(data.admin));
      })
      .catch(() => setStatus("Could not load inventory."));
  }, [type]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((item) => item.category)))],
    [items]
  );

  const visible = items.filter((item) => {
    const matchCat = category === "All" || item.category === category;
    const matchQ = item.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  function row(id: string) {
    return draft[id] || { onHand: "", madeToday: "", orderQty: "", reason: "" };
  }

  function patch(id: string, next: Partial<Draft[string]>, item?: InventoryItem) {
    setDraft((prev) => {
      const current = prev[id] || { onHand: "", madeToday: "", orderQty: "", reason: "" };
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

  function overParItems() {
    return items.filter((item) => {
      const made = num(row(item.id).madeToday);
      return type === "prep" && item.par > 0 && made > item.par && !row(item.id).reason.trim();
    });
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
    const lines: ReportLine[] = items.map((item) => {
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
    const res = await fetch("/api/reports/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        date,
        submittedBy: submittedBy || (type === "prep" ? "Prep" : "Manager"),
        lines,
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
    if (data.emailed) {
      setStatus(`Saved and emailed to the owner for ${date}.`);
    } else {
      setStatus(
        `Saved dated record for ${date}. Email is not set up yet — ask admin to add SMTP in .env.local so it goes to fairhopefood@ymail.com.`
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
        category: addForm.category || (type === "prep" ? "House Prep" : "House Order"),
        unit: addForm.unit,
        par: addForm.par,
      }),
    });
    const data = await res.json();
    if (data.item) {
      setItems((prev) => [...prev, data.item].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
      setAddForm({ name: "", category: "", unit: "ea", par: "" });
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

      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setCategory(name)}
            className={`btn !min-h-10 !px-3 text-sm ${category === name ? "btn-wine" : "btn-ghost"}`}
          >
            {name}
          </button>
        ))}
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
              {type === "prep" ? <th className="px-3 py-3">Reason if over par</th> : null}
            </tr>
          </thead>
          <tbody className="bg-paper">
            {visible.map((item) => {
              const values = row(item.id);
              const over = type === "prep" && item.par > 0 && num(values.madeToday) > item.par;
              return (
                <tr key={item.id} className={`border-t border-[#eadcc6] ${over ? "bg-[#f8e4c8]" : ""}`}>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-muted">{item.category}</div>
                  </td>
                  <td className="px-3 py-2">{item.unit}</td>
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
                    <td className="px-3 py-2">
                      {over ? (
                        <input
                          className="sheet-input"
                          value={values.reason}
                          onChange={(e) => patch(item.id, { reason: e.target.value })}
                          placeholder="Why over par?"
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
          const over = type === "prep" && item.par > 0 && num(values.madeToday) > item.par;
          return (
            <article key={item.id} className={`card p-4 ${over ? "ring-2 ring-gold" : ""}`}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">{item.category}</p>
                  <h3 className="serif text-2xl leading-tight">{item.name}</h3>
                </div>
                <p className="rounded-full bg-cream-deep px-3 py-1 text-sm">
                  Par {item.par} {item.unit}
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
              {over ? (
                <label className="mt-2 block text-sm">
                  Why over par?
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
        <div className="mx-auto flex max-w-6xl justify-end">
          <button className="btn btn-wine min-w-48" disabled={sending} onClick={send} type="button">
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
            <input
              className="sheet-input"
              placeholder="Category"
              value={addForm.category}
              onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
            />
            <input
              className="sheet-input"
              placeholder="Unit (ea, lb, qt, gal)"
              value={addForm.unit}
              onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
            />
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
            Anything made above par needs a reason so the owner can see it on the dated email.
          </p>
          <div className="grid gap-3">
            {pendingReasons.map((item) => (
              <label key={item.id} className="text-sm">
                <span className="font-semibold">
                  {item.name} — made {row(item.id).madeToday}, par {item.par}
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
