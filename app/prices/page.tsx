"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { VENDORS } from "@/lib/catalog";
import { currentMonth, formatMoney } from "@/lib/prices";
import type { PriceRecord, VendorPriceList, VendorSetting } from "@/lib/types";

export default function PricesPage() {
  const [settings, setSettings] = useState<VendorSetting[]>([]);
  const [lists, setLists] = useState<VendorPriceList[]>([]);
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [admin, setAdmin] = useState(false);
  const [vendor, setVendor] = useState<string>(VENDORS[0]);
  const [month, setMonth] = useState(currentMonth);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [openRecord, setOpenRecord] = useState<PriceRecord | null>(null);

  async function load() {
    const data = await fetch("/api/prices").then((res) => res.json());
    setSettings(data.settings || []);
    setLists(data.lists || []);
    setRecords(data.records || []);
    setAdmin(Boolean(data.admin));
    if (data.month) setMonth(data.month);
  }

  useEffect(() => {
    void load();
  }, []);

  const setting = settings.find((entry) => entry.name === vendor);
  const latest = useMemo(
    () => lists.filter((list) => list.vendor === vendor).sort((a, b) => b.month.localeCompare(a.month))[0],
    [lists, vendor]
  );
  const vendorRecords = records.filter((record) => record.vendor === vendor);

  async function saveEmail(email: string) {
    const res = await fetch("/api/vendors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: vendor, email }),
    });
    const data = await res.json();
    if (data.setting) {
      setSettings((prev) => prev.map((entry) => (entry.name === vendor ? data.setting : entry)));
      setStatus(`Saved email for ${vendor}.`);
    } else {
      setStatus(data.error || "Could not save email. Sign in as admin.");
    }
  }

  async function requestSheet() {
    setBusy(true);
    const res = await fetch("/api/prices/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor, month }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.error || "Could not send the request.");
      return;
    }
    const sent = data.results?.filter((row: { sent: boolean }) => row.sent).length || 0;
    setStatus(sent ? `Asked ${vendor} to upload the ${month} spreadsheet.` : data.results?.[0]?.error || "Email did not send.");
  }

  async function upload(file: File) {
    setBusy(true);
    setStatus("");
    const form = new FormData();
    form.set("vendor", vendor);
    form.set("month", month);
    form.set("uploadedBy", "Manager");
    form.set("file", file);
    const res = await fetch("/api/prices", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.error || "Could not read that spreadsheet.");
      return;
    }
    await load();
    if (data.record) {
      setOpenRecord(data.record);
      setStatus(
        `${vendor} ${month}: ${data.changes.length} price change${data.changes.length === 1 ? "" : "s"}. Saved as a Price Record.`
      );
    } else {
      setStatus(`${vendor} ${month}: ${data.list.lines.length} prices saved. No changes from the last sheet.`);
    }
  }

  async function removeRecord(id: string) {
    if (!confirm("Delete this price record?")) return;
    const res = await fetch(`/api/prices?record=${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Sign in as admin to delete.");
      return;
    }
    setRecords((prev) => prev.filter((record) => record.id !== id));
    if (openRecord?.id === id) setOpenRecord(null);
  }

  return (
    <>
      <Header title="Vendor prices" subtitle="Ask each house for this month's spreadsheet, compare it, and keep a Price Record when anything moves." />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="card mb-5 grid gap-3 p-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Vendor</span>
            <select className="sheet-input" value={vendor} onChange={(e) => setVendor(e.target.value)}>
              {VENDORS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Month</span>
            <input className="sheet-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Vendor email</span>
            <input
              className="sheet-input"
              type="email"
              defaultValue={setting?.email || ""}
              key={`${vendor}-${setting?.email || ""}`}
              placeholder="rep@vendor.com"
              onBlur={(e) => void saveEmail(e.target.value)}
            />
            {admin ? (
              <a className="mt-1 inline-block text-sm text-wine" href="/admin?tab=vendors">
                Name and phone are on Admin → Vendors
              </a>
            ) : null}
          </label>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <button className="btn btn-wine" type="button" disabled={busy} onClick={() => void requestSheet()}>
            Email this vendor for {month}
          </button>
          <label className="btn btn-gold cursor-pointer">
            Upload their spreadsheet
            <input
              className="hidden"
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {setting?.uploadToken ? (
          <p className="mb-5 text-sm text-muted">
            Vendor upload link:{" "}
            <span className="break-all text-ink">
              /vendor-upload/{setting.uploadToken}
            </span>
          </p>
        ) : null}

        {status ? <p className="mb-5 rounded-xl bg-gold-soft px-4 py-3 text-sm">{status}</p> : null}

        {latest ? (
          <section className="card mb-6 overflow-auto p-4">
            <h2 className="serif text-3xl">
              Latest {latest.vendor} sheet · {latest.month}
            </h2>
            <p className="mb-3 text-sm text-muted">
              {latest.fileName} · {new Date(latest.uploadedAt).toLocaleString()} · {latest.lines.length} items
            </p>
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="py-2">Item</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {latest.lines.map((line) => (
                  <tr key={`${line.name}-${line.price}`} className="border-t border-[#eadcc6]">
                    <td className="py-2">{line.name}</td>
                    <td>{formatMoney(line.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <p className="mb-6 text-muted">No spreadsheet for this vendor yet. Email them or upload the file they send.</p>
        )}

        <section>
          <h2 className="serif mb-3 text-3xl">Price Records</h2>
          {vendorRecords.length === 0 ? <p className="text-muted">No price changes saved yet for {vendor}.</p> : null}
          <div className="grid gap-3">
            {vendorRecords.map((record) => (
              <article key={record.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button type="button" className="text-left" onClick={() => setOpenRecord(record)}>
                    <p className="serif text-2xl">
                      {record.vendor} · {record.month}
                    </p>
                    <p className="text-sm text-muted">
                      {new Date(record.createdAt).toLocaleString()} · {record.changes.length} change
                      {record.changes.length === 1 ? "" : "s"}
                    </p>
                  </button>
                  {admin ? (
                    <button className="btn btn-ghost !min-h-9 text-wine" type="button" onClick={() => void removeRecord(record.id)}>
                      Delete
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        {openRecord ? (
          <section className="card mt-6 overflow-auto p-4">
            <div className="mb-3 flex justify-between gap-2">
              <h3 className="serif text-2xl">
                Snapshot · {openRecord.vendor} · {openRecord.month}
              </h3>
              <button className="btn btn-ghost !min-h-9" type="button" onClick={() => setOpenRecord(null)}>
                Close
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="py-2">Item</th>
                  <th>Was</th>
                  <th>Now</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {openRecord.changes.map((change) => (
                  <tr key={`${change.name}-${change.direction}`} className="border-t border-[#eadcc6]">
                    <td className="py-2">{change.name}</td>
                    <td>{formatMoney(change.previousPrice)}</td>
                    <td>{formatMoney(change.currentPrice)}</td>
                    <td className={change.direction === "up" ? "text-wine" : change.direction === "down" ? "text-olive" : ""}>
                      {change.direction === "up"
                        ? "Up"
                        : change.direction === "down"
                          ? "Down"
                          : change.direction === "new"
                            ? "New"
                            : "Removed"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </main>
    </>
  );
}
