"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { categoriesFor, CITY_PRODUCE, compareOrderingItems, groupByCategory, groupByVendor, itemVendor, PULL_CATEGORIES, UNITS, unitLabel, VENDORS, vendorsFrom } from "@/lib/catalog";
import { afterPrep, exceedsPar } from "@/lib/par";
import { qtyAmount } from "@/lib/qty";
import { defaultShift, shiftLabel } from "@/lib/shift";
import type { InventoryItem, ItemType, PriceSignal, ReportLine, Shift } from "@/lib/types";
import { Modal } from "./Modal";
import { PriceFlag } from "./PriceFlag";

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

function blank(value?: string | number | null) {
  return value === undefined || value === null ? "" : String(value);
}

function emptyRow() {
  return { onHand: "", madeToday: "", orderQty: "", reason: "" };
}

function storageKey(type: ItemType, date: string, shift?: string) {
  return `tamaras-draft-${type}-${date}${type === "prep" && shift ? `-${shift}` : ""}`;
}

function qtyLabel(type: ItemType) {
  if (type === "prep") return "Made today";
  if (type === "pull") return "Pull";
  return "To order";
}

function who(type: ItemType, submittedBy: string) {
  if (submittedBy) return submittedBy;
  if (type === "prep") return "Prep";
  if (type === "pull") return "Kitchen";
  return "Manager";
}

function Notice({
  title,
  text,
  kind,
  onClose,
}: {
  title: string;
  text: string;
  kind: "ok" | "bad";
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed left-1/2 top-4 z-[80] w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl px-5 py-4 text-center shadow-lg ${
        kind === "ok" ? "bg-gold text-[#2a1b14]" : "bg-wine text-[#fffaf2]"
      }`}
    >
      <p className="serif text-3xl leading-none">{title}</p>
      <p className="mt-2 text-sm">{text}</p>
      <button className="btn mt-3 !min-h-10 bg-[#fffaf2] text-ink" type="button" onClick={onClose}>
        OK
      </button>
    </div>
  );
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
  const [vendor, setVendor] = useState("All");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(today);
  const [shift, setShift] = useState<Shift>(defaultShift);
  const [reportId, setReportId] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [pendingReasons, setPendingReasons] = useState<InventoryItem[]>([]);
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState<{ title: string; text: string; kind: "ok" | "bad" } | null>(null);
  const [sentLocked, setSentLocked] = useState(false);
  const [sentId, setSentId] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", category: "", unit: "each", par: "", vendor: "", newVendor: "" });
  const [priceSignals, setPriceSignals] = useState<Record<string, PriceSignal>>({});
  const ready = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qDate = params.get("date");
    const qReport = params.get("report");
    const qShift = params.get("shift");
    if (qDate) setDate(qDate);
    if (qReport) setReportId(qReport);
    if (qShift === "day" || qShift === "night") setShift(qShift);
  }, []);

  useEffect(() => {
    let cancelled = false;
    ready.current = false;
    async function load() {
      try {
        const [itemsRes, draftRes, reportRes, priceRes, sentRes] = await Promise.all([
          fetch(`/api/items?type=${type}`),
          fetch(`/api/drafts?type=${type}&date=${date}${type === "prep" ? `&shift=${shift}` : ""}`),
          reportId ? fetch(`/api/reports?id=${reportId}`) : Promise.resolve(null),
          type === "ordering" ? fetch("/api/prices") : Promise.resolve(null),
          fetch(`/api/reports?sent=1&type=${type}&date=${date}${type === "prep" ? `&shift=${shift}` : ""}`),
        ]);
        const itemsData = await itemsRes.json();
        const draftData = await draftRes.json();
        const reportData = reportRes ? await reportRes.json() : null;
        const sentData = await sentRes.json();
        if (cancelled) return;
        const loaded: InventoryItem[] = itemsData.items || [];
        setItems(loaded);
        setAdmin(Boolean(itemsData.admin));
        if (priceRes) {
          const priceData = await priceRes.json();
          setPriceSignals(priceData.signals || {});
        }

        const next: Draft = {};
        const opened = reportData?.report as { submittedBy?: string; date?: string; lines?: ReportLine[]; shift?: Shift; reopened?: boolean; id?: string } | undefined;
        const serverDraft = draftData.draft as { submittedBy?: string; lines?: ReportLine[] } | null;
        const latestSent = sentData?.sent as { id?: string; submittedBy?: string; lines?: ReportLine[] } | undefined;
        setSentId(opened?.id || latestSent?.id || "");
        setSentLocked(Boolean(sentData?.locked) || Boolean(opened?.id && !opened.reopened));
        if (opened?.lines?.length) {
          setSubmittedBy(opened.submittedBy || "");
          if (opened.date) setDate(opened.date);
          if ((opened.shift === "day" || opened.shift === "night") && opened.shift !== shift) {
            setShift(opened.shift);
          }
          for (const line of opened.lines) {
            next[line.itemId] = {
              onHand: blank(line.onHand),
              madeToday: blank(line.madeToday),
              orderQty: blank(line.orderQty),
              reason: line.overParReason || "",
            };
          }
          setStatus(`Opened sent ${type} report for ${opened.date || date}${type === "prep" ? ` · ${shiftLabel(shift)}` : ""}. You can review, save a new draft, or send again.`);
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
          setStatus(`Loaded saved ${type} sheet for ${date}${type === "prep" ? ` · ${shiftLabel(shift)}` : ""}. You can keep editing, then save or send.`);
        } else if (latestSent?.lines?.length) {
          setSubmittedBy(latestSent.submittedBy || "");
          for (const line of latestSent.lines) {
            next[line.itemId] = {
              onHand: blank(line.onHand),
              madeToday: blank(line.madeToday),
              orderQty: blank(line.orderQty),
              reason: line.overParReason || "",
            };
          }
          setStatus(
            sentData?.locked
              ? `This ${type} sheet was already sent. An admin can reopen it if something needs to change.`
              : `Loaded the last sent ${type} sheet. It was reopened, so you can edit and send again.`
          );
        } else {
          const localRaw = localStorage.getItem(storageKey(type, date, shift));
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
              orderQty: type === "pull" || type === "ordering" ? blank(item.lastOrderQty) : "",
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
  }, [type, date, reportId, shift]);

  useEffect(() => {
    if (!ready.current) return;
    localStorage.setItem(storageKey(type, date, shift), JSON.stringify({ draft, submittedBy }));
  }, [draft, submittedBy, type, date, shift]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const categoryOptions = useMemo(() => {
    const preset = categoriesFor(type);
    const extra = items.map((item) => item.category).filter((name) => !preset.includes(name));
    return ["All", ...preset, ...Array.from(new Set(extra))];
  }, [items, type]);

  const vendorOptions = useMemo(() => (type === "ordering" ? vendorsFrom(items) : []), [items, type]);

  const visible = items.filter((item) => {
    const matchVendor = type !== "ordering" || vendor === "All" || itemVendor(item) === vendor;
    const matchCat = category === "All" || item.category === category;
    const matchQ = item.name.toLowerCase().includes(query.toLowerCase());
    return matchVendor && matchCat && matchQ;
  });

  const visibleGroups =
    type === "ordering"
      ? groupByVendor(visible)
      : type === "pull"
        ? groupByCategory(visible, PULL_CATEGORIES)
        : [{ vendor: "", rows: visible }];

  function row(id: string) {
    return draft[id] || emptyRow();
  }

  function patch(id: string, next: Partial<Draft[string]>, item?: InventoryItem) {
    setDraft((prev) => {
      const current = prev[id] || emptyRow();
      const merged = { ...current, ...next };
      if (type === "ordering" && item && next.onHand !== undefined) {
        const typed = merged.onHand.trim();
        const amount = qtyAmount(typed);
        const plain = typed === "" || typed === String(amount);
        if (plain) {
          const suggested = Math.max(0, item.par - amount);
          if (current.orderQty === "" || current.orderQty === String(Math.max(0, item.par - qtyAmount(current.onHand)))) {
            merged.orderQty = suggested ? String(suggested) : "0";
          }
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
        vendor: item.vendor,
        onHand: values.onHand.trim(),
        madeToday: type === "prep" ? values.madeToday.trim() : undefined,
        orderQty: type === "ordering" || type === "pull" ? values.orderQty.trim() : undefined,
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
        submittedBy: who(type, submittedBy),
        lines: lines(),
        ...(type === "prep" ? { shift } : {}),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      const text = data.error || "Could not save.";
      setStatus(text);
      if (showMessage) setNotice({ title: "Not saved", text, kind: "bad" });
      return false;
    }
    if (showMessage) {
      const text = `Inventory saved for ${date}${type === "prep" ? ` · ${shiftLabel(shift)}` : ""}. Come back anytime — it will be on this sheet and in Records.`;
      setStatus(text);
      setNotice({ title: "Saved", text, kind: "ok" });
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
        submittedBy: who(type, submittedBy),
        lines: lines(),
        ...(type === "prep" ? { shift } : {}),
      }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      const text = data.error || "Could not send.";
      setStatus(text);
      setNotice({ title: data.alreadySent ? "Already sent" : "Not sent", text, kind: "bad" });
      if (data.alreadySent) {
        setSentLocked(true);
        if (data.reportId) setSentId(data.reportId);
      }
      if (data.items) {
        setPendingReasons(items.filter((item) => data.items.includes(item.name)));
        setReasonOpen(true);
      }
      return;
    }
    localStorage.removeItem(storageKey(type, date, shift));
    const when = `${date}${type === "prep" ? ` · ${shiftLabel(shift)}` : ""}`;
    const vendorSent = (data.vendorEmails || [])
      .filter((entry: { sent?: boolean; vendor?: string }) => entry.sent && entry.vendor)
      .map((entry: { vendor: string }) => entry.vendor);
    let text = "";
    if (data.emailed) {
      const vendorFail = data.emailError ? ` ${data.emailError}` : "";
      text = vendorSent.length
        ? `Saved and emailed the owner, plus ${vendorSent.join(", ")}, for ${when}. Each vendor only got their own order.${vendorFail}`
        : `Saved, stored, and emailed to the owner for ${when}. Open Records to see it anytime.${vendorFail}`;
    } else {
      text = `Saved and stored for ${when}. Email is not set up yet — add SMTP on Vercel so it goes to fairhopefood@ymail.com.`;
    }
    setStatus(text);
    setNotice({ title: "Sent", text, kind: "ok" });
    setSentLocked(true);
    if (data.report?.id) setSentId(data.report.id);
    setReasonOpen(false);
  }

  async function reopenSent() {
    if (!sentId) return;
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sentId, reopen: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setNotice({ title: "Could not reopen", text: data.error || "Sign in as admin first.", kind: "bad" });
      return;
    }
    setSentLocked(false);
    setNotice({
      title: "Reopened",
      text: "This sheet is unlocked. Fix what you need, then send again.",
      kind: "ok",
    });
    setStatus("Reopened. You can edit and send again.");
  }

  function chosenVendor() {
    if (type !== "ordering") return undefined;
    if (addForm.vendor === "__new__") return addForm.newVendor.trim();
    return addForm.vendor.trim();
  }

  function openAdd() {
    setAddForm({
      name: "",
      category: "",
      unit: "each",
      par: "",
      vendor: vendor !== "All" ? vendor : "",
      newVendor: "",
    });
    setAddOpen(true);
  }

  async function addItem() {
    if (!addForm.name.trim()) return;
    const vendorName = chosenVendor();
    if (type === "ordering" && !vendorName) {
      setStatus("Pick a vendor, or type a new vendor name.");
      return;
    }
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        name: addForm.name,
        category: addForm.category || categoriesFor(type, vendorName)[0],
        unit: addForm.unit || "each",
        par: addForm.par,
        vendor: vendorName,
      }),
    });
    const data = await res.json();
    if (data.item) {
      setItems((prev) =>
        [...prev, data.item].sort((a, b) =>
          type === "ordering" ? compareOrderingItems(a, b) : a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        )
      );
      if (vendorName) setVendor(vendorName);
      setAddForm({ name: "", category: "", unit: "each", par: "", vendor: vendorName || "", newVendor: "" });
      setAddOpen(false);
      setStatus(`Added ${data.item.name}${vendorName ? ` to ${vendorName}` : ""}.`);
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

  async function removeItem(item: InventoryItem) {
    if (!confirm(`Delete ${item.name}? This removes it from ${type === "prep" ? "prep" : type === "pull" ? "pull" : "ordering"}.`)) return;
    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setStatus("Could not delete. Sign in as admin first.");
      return;
    }
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    setStatus(`Deleted ${item.name}.`);
  }

  function pickShift(next: Shift) {
    if (next === shift) return;
    setReportId("");
    setShift(next);
    const url = new URL(window.location.href);
    url.searchParams.set("shift", next);
    url.searchParams.delete("report");
    window.history.replaceState({}, "", url);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28">
      {notice ? (
        <Notice title={notice.title} text={notice.text} kind={notice.kind} onClose={() => setNotice(null)} />
      ) : null}
      {type === "prep" ? (
        <div className="card mb-5 p-4">
          <p className="mb-2 text-sm text-muted">Shift</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`btn !min-h-14 text-base ${shift === "day" ? "btn-gold" : "btn-ghost"}`}
              onClick={() => pickShift("day")}
            >
              Day shift
            </button>
            <button
              type="button"
              className={`btn !min-h-14 text-base ${shift === "night" ? "btn-wine" : "btn-ghost"}`}
              onClick={() => pickShift("night")}
            >
              Night shift
            </button>
          </div>
          <p className="mt-2 text-sm text-muted">
            Counting for <strong>{shiftLabel(shift)}</strong>. Day and night keep separate sheets so they do not overwrite each other.
          </p>
        </div>
      ) : null}
      {sentLocked ? (
        <div className="card mb-5 border-[#7a1f2b] bg-[#f8e4c8] p-4">
          <p className="serif text-2xl">Already sent</p>
          <p className="mt-1 text-sm">
            This sheet went out once and cannot be sent twice. Save still works. An admin can reopen it if a correction is needed.
          </p>
          {admin ? (
            <button className="btn btn-wine mt-3" type="button" onClick={() => void reopenSent()}>
              Reopen this sheet
            </button>
          ) : null}
        </div>
      ) : null}
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
            placeholder={type === "prep" ? "Prep cook" : type === "pull" ? "Kitchen" : "Manager"}
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

      {type === "ordering" ? (
        <div className="mb-4">
          <p className="mb-2 text-sm text-muted">Vendor</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn !min-h-10 !px-3 text-sm ${vendor === "All" ? "btn-wine" : "btn-ghost"}`}
              onClick={() => setVendor("All")}
            >
              All vendors
            </button>
            {vendorOptions.map((name) => (
              <button
                key={name}
                type="button"
                className={`btn !min-h-10 !px-3 text-sm ${vendor === name ? "btn-wine" : "btn-ghost"}`}
                onClick={() => setVendor(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
        <button className="btn btn-gold" type="button" onClick={openAdd}>
          {type === "ordering" && vendor !== "All" ? `+ Add to ${vendor}` : type === "pull" ? "+ Add protein" : "+ Add inventory"}
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
              <th className="px-3 py-3">{qtyLabel(type)}</th>
              {type === "prep" ? <th className="px-3 py-3">On hand + made</th> : null}
              {type === "prep" ? <th className="px-3 py-3">Reason if over par</th> : null}
              {admin ? <th className="px-3 py-3"></th> : null}
            </tr>
          </thead>
          <tbody className="bg-paper">
            {visibleGroups.map((group) =>
              group.rows.map((item, index) => {
                const values = row(item.id);
                const over = type === "prep" && exceedsPar(item.par, num(values.onHand), num(values.madeToday));
                return (
                  <Fragment key={item.id}>
                    {(type === "ordering" && index === 0 && vendor === "All") || (type === "pull" && index === 0) ? (
                      <tr className="border-t border-[#eadcc6] bg-cream-deep">
                        <td className="px-3 py-2 font-semibold" colSpan={admin ? 6 : 5}>
                          {group.vendor}
                        </td>
                      </tr>
                    ) : null}
                    {type === "ordering" &&
                    group.vendor === CITY_PRODUCE &&
                    (index === 0 || group.rows[index - 1]?.category !== item.category) ? (
                      <tr className="border-t border-[#eadcc6] bg-[#f8e4c8]">
                        <td className="px-3 py-2 font-semibold" colSpan={admin ? 6 : 5}>
                          {item.category}
                        </td>
                      </tr>
                    ) : null}
                    <tr className={`border-t border-[#eadcc6] ${over ? "bg-[#f8e4c8]" : ""}`}>
                      <td className="px-3 py-2">
                        <div className="font-semibold">
                          {item.name}
                          {type === "ordering" ? <PriceFlag signal={priceSignals[item.id]} /> : null}
                        </div>
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
                          className="sheet-input max-w-32"
                          value={values.onHand}
                          onChange={(e) => patch(item.id, { onHand: e.target.value }, item)}
                          placeholder="2 or 1 pan"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {type === "prep" ? (
                          <input
                            className="sheet-input max-w-32"
                            value={values.madeToday}
                            onChange={(e) => patch(item.id, { madeToday: e.target.value })}
                            placeholder="1 pan"
                          />
                        ) : (
                          <input
                            className="sheet-input max-w-32"
                            value={values.orderQty}
                            onChange={(e) => patch(item.id, { orderQty: e.target.value })}
                            placeholder="2 or 1/3 pan"
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
                      {admin ? (
                        <td className="px-3 py-2">
                          <button className="text-sm text-wine" type="button" onClick={() => void removeItem(item)}>
                            Delete
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {visibleGroups.map((group) => (
          <Fragment key={group.vendor || "items"}>
            {(type === "ordering" && vendor === "All") || type === "pull" ? (
              <h3 className="serif mt-2 text-2xl text-wine">{group.vendor}</h3>
            ) : null}
            {group.rows.map((item, index) => {
          const values = row(item.id);
          const over = type === "prep" && exceedsPar(item.par, num(values.onHand), num(values.madeToday));
          const sectionStart =
            type === "ordering" &&
            group.vendor === CITY_PRODUCE &&
            (index === 0 || group.rows[index - 1]?.category !== item.category);
          return (
            <Fragment key={item.id}>
            {sectionStart ? <h4 className="serif mt-3 text-xl text-wine">{item.category}</h4> : null}
            <article className={`card p-4 ${over ? "ring-2 ring-gold" : ""}`}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">{item.category}</p>
                  <h3 className="serif text-2xl leading-tight">
                    {item.name}
                    {type === "ordering" ? <PriceFlag signal={priceSignals[item.id]} /> : null}
                  </h3>
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
                    value={values.onHand}
                    onChange={(e) => patch(item.id, { onHand: e.target.value }, item)}
                    placeholder="2 or 1 pan"
                  />
                </label>
                <label className="text-sm">
                  {qtyLabel(type)}
                  <input
                    className="sheet-input mt-1"
                    value={type === "prep" ? values.madeToday : values.orderQty}
                    onChange={(e) => {
                      if (type === "prep") patch(item.id, { madeToday: e.target.value });
                      else patch(item.id, { orderQty: e.target.value });
                    }}
                    placeholder="1/3 pan"
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
              {admin ? (
                <button className="mt-3 text-sm text-wine" type="button" onClick={() => void removeItem(item)}>
                  Delete
                </button>
              ) : null}
            </article>
            </Fragment>
          );
        })}
          </Fragment>
        ))}
      </div>

      {status ? <p className="mt-4 rounded-xl bg-gold-soft px-4 py-3 text-sm">{status}</p> : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-[#eadcc6] bg-[#fffaf2]/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2">
          {type === "prep" ? (
            <span className={`mr-auto rounded-full px-3 py-2 text-sm font-semibold ${shift === "night" ? "bg-wine text-[#fffaf2]" : "bg-gold text-[#2a1b14]"}`}>
              {shiftLabel(shift)}
            </span>
          ) : null}
          <button className="btn btn-ghost min-w-40" disabled={saving || sending} onClick={() => void save()} type="button">
            {saving ? "Saving…" : "Save inventory"}
          </button>
          <button
            className="btn btn-wine min-w-48"
            disabled={sending || saving || sentLocked}
            onClick={send}
            type="button"
          >
            {sending ? "Sending…" : sentLocked ? "Already sent" : `Send ${title}`}
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
            {type === "ordering" ? (
              <>
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Vendor</span>
                  <select
                    className="sheet-input"
                    value={addForm.vendor}
                    onChange={(e) => setAddForm({ ...addForm, vendor: e.target.value, category: "" })}
                  >
                    <option value="">Choose a vendor</option>
                    {Array.from(new Set([...VENDORS, ...vendorOptions])).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value="__new__">New vendor…</option>
                  </select>
                </label>
                {addForm.vendor === "__new__" ? (
                  <input
                    className="sheet-input"
                    placeholder="New vendor name"
                    value={addForm.newVendor}
                    onChange={(e) => setAddForm({ ...addForm, newVendor: e.target.value })}
                  />
                ) : null}
              </>
            ) : null}
            <label className="text-sm">
              <span className="mb-1 block text-muted">Category</span>
              <select
                className="sheet-input"
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
              >
                <option value="">Choose a category</option>
                {categoriesFor(
                  type,
                  addForm.vendor === "__new__" ? addForm.newVendor.trim() : addForm.vendor || (vendor !== "All" ? vendor : "")
                ).map((name) => (
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
