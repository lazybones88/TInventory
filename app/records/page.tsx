"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { CITY_PRODUCE, groupByVendor, orderVendor } from "@/lib/catalog";
import { shiftLabel } from "@/lib/shift";
import { sheetLabel, type DraftSheet, type ItemType, type Report, type ReportLine, type Shift } from "@/lib/types";

type Sheet = (DraftSheet | (Report & { status: "sent" })) & { status: "draft" | "sent" };

export default function RecordsPage() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [kind, setKind] = useState<"all" | ItemType>("all");
  const [status, setStatus] = useState<"all" | "draft" | "sent">("all");
  const [shiftFilter, setShiftFilter] = useState<"all" | Shift>("all");
  const [open, setOpen] = useState<Sheet | null>(null);
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setAdmin(Boolean(data.admin)));
    const wanted = new URLSearchParams(window.location.search).get("id");
    fetch("/api/reports?all=1")
      .then((res) => res.json())
      .then((data) => {
        const loaded: Sheet[] = data.sheets || [];
        setSheets(loaded);
        if (wanted) {
          const match = loaded.find((sheet) => sheet.id === wanted);
          if (match) {
            setKind(match.type);
            setStatus(match.status);
            setOpen(match);
          }
        }
      });
  }, []);

  async function reopenSheet(id: string) {
    setBusy(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reopen: true }),
    });
    setBusy(false);
    if (!res.ok) {
      alert("Could not reopen. Sign in as admin first.");
      return;
    }
    setSheets((prev) =>
      prev.map((sheet) => (sheet.id === id && sheet.status === "sent" ? { ...sheet, reopened: true } : sheet))
    );
    if (open?.id === id && open.status === "sent") setOpen({ ...open, reopened: true });
  }

  async function removeSheet(id: string) {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/reports?id=${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      alert("Could not delete. Sign in as admin first.");
      return;
    }
    setSheets((prev) => prev.filter((sheet) => sheet.id !== id));
    if (open?.id === id) setOpen(null);
  }

  async function removeTests() {
    if (!confirm("Delete all test records and TEST inventory items?")) return;
    setBusy(true);
    const res = await fetch("/api/reports?tests=1", { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      alert("Could not delete tests. Sign in as admin first.");
      return;
    }
    const remaining = await fetch("/api/reports?all=1").then((r) => r.json());
    setSheets(remaining.sheets || []);
    setOpen(null);
    alert(`Deleted ${data.removed || 0} test sheets${data.itemsRemoved ? ` and ${data.itemsRemoved} test items` : ""}.`);
  }

  const visible = useMemo(
    () =>
      sheets.filter((sheet) => {
        const matchKind = kind === "all" || sheet.type === kind;
        const matchStatus = status === "all" || sheet.status === status;
        const matchShift =
          shiftFilter === "all" ||
          sheet.type !== "prep" ||
          (sheet.shift || "day") === shiftFilter;
        return matchKind && matchStatus && matchShift;
      }),
    [sheets, kind, status, shiftFilter]
  );

  return (
    <>
      <Header title="Records" subtitle="Every saved draft and every sent prep, pull, or order sheet, dated." />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              ["all", "All sheets"],
              ["prep", "Prep"],
              ["pull", "Pull"],
              ["ordering", "Orders"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn ${kind === id ? "btn-wine" : "btn-ghost"}`}
              onClick={() => setKind(id)}
            >
              {label}
            </button>
          ))}
          {(
            [
              ["all", "Saved + sent"],
              ["draft", "Saved only"],
              ["sent", "Sent"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn ${status === id ? "btn-gold" : "btn-ghost"}`}
              onClick={() => setStatus(id)}
            >
              {label}
            </button>
          ))}
          {kind === "all" || kind === "prep"
            ? (
                [
                  ["all", "Day + night"],
                  ["day", "Day"],
                  ["night", "Night"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`btn ${shiftFilter === id ? "btn-wine" : "btn-ghost"}`}
                  onClick={() => setShiftFilter(id)}
                >
                  {label}
                </button>
              ))
            : null}
          {admin ? (
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void removeTests()}>
              Delete all test records
            </button>
          ) : null}
        </div>

        {visible.length === 0 ? (
          <p className="text-muted">No sheets yet. Save or send a prep, pull, or order report and it will show here.</p>
        ) : null}

        <div className="grid gap-3">
          {visible.map((sheet) => {
            const when = sheet.status === "sent" ? sheet.submittedAt : sheet.updatedAt;
            return (
              <article key={`${sheet.status}-${sheet.id}`} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button type="button" className="text-left" onClick={() => setOpen(sheet)}>
                    <p className="serif text-2xl">
                      {sheetLabel(sheet.type, orderVendor(sheet))} · {sheet.date}
                      {sheet.type === "prep" && sheet.shift ? ` · ${shiftLabel(sheet.shift)}` : ""}
                    </p>
                    <p className="text-sm text-muted">
                      {new Date(when).toLocaleString()} · {sheet.submittedBy} · {sheet.lines.length} items
                      {sheet.status === "sent" && "emailed" in sheet
                        ? sheet.emailed
                          ? " · Emailed"
                          : " · Saved, email pending"
                        : ""}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <span className={`btn !min-h-9 !px-3 text-sm ${sheet.status === "sent" ? "btn-wine" : "btn-gold"}`}>
                      {sheet.status === "sent" ? (sheet.reopened ? "Reopened" : "Sent") : "Saved"}
                    </span>
                    <Link className="btn btn-ghost !min-h-9 !px-3 text-sm" href={openHref(sheet)}>
                      {sheet.status === "draft" ? "Resume" : "Open"}
                    </Link>
                    {admin && sheet.status === "sent" && !sheet.reopened ? (
                      <button
                        className="btn btn-gold !min-h-9 !px-3 text-sm"
                        type="button"
                        disabled={busy}
                        onClick={() => void reopenSheet(sheet.id)}
                      >
                        Reopen
                      </button>
                    ) : null}
                    {admin ? (
                      <button
                        className="btn btn-ghost !min-h-9 !px-3 text-sm text-wine"
                        type="button"
                        disabled={busy}
                        onClick={() => void removeSheet(sheet.id)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {open ? (
          <SheetDetail
            sheet={open}
            admin={admin}
            busy={busy}
            onClose={() => setOpen(null)}
            onDelete={() => void removeSheet(open.id)}
            onReopen={() => void reopenSheet(open.id)}
          />
        ) : null}
      </main>
    </>
  );
}

function openHref(sheet: Sheet) {
  const path = sheet.type === "prep" ? "/prep" : sheet.type === "pull" ? "/pull" : "/ordering";
  const shift =
    sheet.type === "prep" && (sheet.shift === "day" || sheet.shift === "night") ? `&shift=${sheet.shift}` : "";
  const vendorName = orderVendor(sheet);
  const vendor = sheet.type === "ordering" && vendorName ? `&vendor=${encodeURIComponent(vendorName)}` : "";
  if (sheet.status === "sent") return `${path}?date=${sheet.date}&report=${sheet.id}${shift}${vendor}`;
  return `${path}?date=${sheet.date}${shift}${vendor}`;
}

function SheetDetail({
  sheet,
  admin,
  busy,
  onClose,
  onDelete,
  onReopen,
}: {
  sheet: Sheet;
  admin?: boolean;
  busy?: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onReopen?: () => void;
}) {
  return (
    <div className="card mt-6 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="serif text-2xl">
          {sheet.date} · {sheetLabel(sheet.type, orderVendor(sheet))}
          {sheet.type === "prep" && sheet.shift ? ` · ${shiftLabel(sheet.shift)}` : ""} ·{" "}
          {sheet.status === "sent" ? "Sent" : "Saved"}
        </h2>
        <div className="flex gap-2">
          <Link className="btn btn-gold !min-h-9" href={openHref(sheet)}>
            {sheet.status === "draft" ? "Resume" : "Open"}
          </Link>
          {admin && sheet.status === "sent" && !sheet.reopened ? (
            <button className="btn btn-wine !min-h-9" type="button" disabled={busy} onClick={onReopen}>
              Reopen
            </button>
          ) : null}
          {admin ? (
            <button className="btn btn-ghost !min-h-9 text-wine" type="button" disabled={busy} onClick={onDelete}>
              Delete
            </button>
          ) : null}
          <button className="btn btn-ghost !min-h-9" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className="py-2">Item</th>
            <th>Par</th>
            <th>On hand</th>
            <th>{sheet.type === "prep" ? "Made" : sheet.type === "pull" ? "Pull" : "Order"}</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {(sheet.type === "ordering" ? groupByVendor(sheet.lines) : [{ vendor: "", rows: sheet.lines }]).map((group) =>
            group.rows.map((line: ReportLine, index) => (
              <Fragment key={line.itemId}>
                {group.vendor && index === 0 ? (
                  <tr className="border-t border-[#eadcc6] bg-cream-deep">
                    <td className="py-2 font-semibold" colSpan={5}>
                      {group.vendor}
                    </td>
                  </tr>
                ) : null}
                {sheet.type === "ordering" &&
                group.vendor === CITY_PRODUCE &&
                (index === 0 || group.rows[index - 1]?.category !== line.category) ? (
                  <tr className="border-t border-[#eadcc6] bg-[#f8e4c8]">
                    <td className="py-2 font-semibold" colSpan={5}>
                      {line.category}
                    </td>
                  </tr>
                ) : null}
                <tr className="border-t border-[#eadcc6]">
                  <td className="py-2">{line.name}</td>
                  <td>{line.par}</td>
                  <td>{line.onHand}</td>
                  <td>{sheet.type === "prep" ? line.madeToday : line.orderQty}</td>
                  <td>{line.overParReason || "—"}</td>
                </tr>
              </Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
