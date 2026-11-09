"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { currentMonth } from "@/lib/prices";

export default function VendorUploadPage() {
  const params = useParams<{ token: string }>();
  const [month, setMonth] = useState(currentMonth);

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("month");
    if (wanted) setMonth(wanted);
  }, []);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setStatus("");
    const form = new FormData();
    form.set("token", params.token);
    form.set("month", month);
    form.set("uploadedBy", "Vendor");
    form.set("file", file);
    const res = await fetch("/api/prices", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.error || "Could not read that spreadsheet.");
      return;
    }
    if (data.record) {
      setStatus(`Thank you. We saved ${data.list.lines.length} prices and recorded ${data.changes.length} changes from last month.`);
    } else {
      setStatus(`Thank you. We saved ${data.list.lines.length} prices. Nothing changed from last month.`);
    }
  }

  return (
    <>
      <Header title="Upload prices" subtitle={`Monthly price spreadsheet · ${month}`} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <div className="card p-6">
          <p className="text-muted">
            Send Tamara&apos;s Downtown this month&apos;s item prices. Excel or CSV is fine — include the item name and the unit price.
          </p>
          <label className="btn btn-wine mt-5 cursor-pointer">
            {busy ? "Uploading…" : "Choose spreadsheet"}
            <input
              className="hidden"
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
          </label>
          {status ? <p className="mt-4 rounded-xl bg-gold-soft px-4 py-3 text-sm">{status}</p> : null}
        </div>
      </main>
    </>
  );
}
