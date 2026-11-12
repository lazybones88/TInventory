"use client";

import { useEffect, useMemo, useState } from "react";
import { VENDORS } from "@/lib/catalog";
import { fakeCityProduceSms } from "@/lib/fake-produce-text";
import { openSms } from "@/lib/sms-link";
import type { VendorSetting } from "@/lib/types";

type Draft = {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  textOrders: boolean;
};

function blank(): Draft {
  return { name: "", contactName: "", phone: "", email: "", textOrders: false };
}

function fromSetting(setting: VendorSetting): Draft {
  return {
    name: setting.name,
    contactName: setting.contactName || "",
    phone: setting.phone || "",
    email: setting.email || "",
    textOrders: Boolean(setting.textOrders),
  };
}

function isHouse(name: string) {
  return (VENDORS as readonly string[]).includes(name);
}

export function VendorBook() {
  const [settings, setSettings] = useState<VendorSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [addForm, setAddForm] = useState<Draft>(blank);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState("");
  const [testing, setTesting] = useState("");

  async function load() {
    const res = await fetch("/api/vendors");
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Could not load vendors.");
      return;
    }
    const loaded: VendorSetting[] = data.settings || [];
    setSettings(loaded);
    setDrafts(Object.fromEntries(loaded.map((setting) => [setting.name, fromSetting(setting)])));
  }

  useEffect(() => {
    void load();
  }, []);

  const ordered = useMemo(() => {
    const house = VENDORS.map((name) => settings.find((entry) => entry.name === name)).filter(
      (entry): entry is VendorSetting => Boolean(entry)
    );
    const extra = settings
      .filter((entry) => !isHouse(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...house, ...extra];
  }, [settings]);

  function patchDraft(name: string, field: keyof Draft, value: string | boolean) {
    setDrafts((prev) => ({
      ...prev,
      [name]: { ...(prev[name] || { name, contactName: "", phone: "", email: "", textOrders: false }), [field]: value },
    }));
  }

  async function save(name: string, source?: Draft) {
    const draft = source || drafts[name];
    if (!draft?.name.trim()) return;
    setBusy(name);
    setStatus("");
    const res = await fetch("/api/vendors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        contactName: draft.contactName,
        phone: draft.phone,
        email: draft.email,
        textOrders: draft.textOrders,
      }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok || !data.setting) {
      setStatus(data.error || "Could not save.");
      return;
    }
    setSettings((prev) => {
      const exists = prev.some((entry) => entry.name === data.setting.name);
      return exists
        ? prev.map((entry) => (entry.name === data.setting.name ? data.setting : entry))
        : [...prev, data.setting];
    });
    setDrafts((prev) => ({ ...prev, [data.setting.name]: fromSetting(data.setting) }));
    setStatus(`Saved ${data.setting.name}.`);
  }

  async function testText(name: string) {
    const draft = drafts[name];
    setTesting(name);
    setStatus("");
    if (draft) {
      const saved = await fetch("/api/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          contactName: draft.contactName,
          phone: draft.phone,
          email: draft.email,
          textOrders: true,
        }),
      });
      const savedData = await saved.json();
      if (!saved.ok || !savedData.setting) {
        setTesting("");
        setStatus(savedData.error || "Could not save the number first.");
        return;
      }
      setSettings((prev) => prev.map((entry) => (entry.name === savedData.setting.name ? savedData.setting : entry)));
      setDrafts((prev) => ({ ...prev, [savedData.setting.name]: fromSetting(savedData.setting) }));
    }
    const phone = draft?.phone.trim() || "";
    setTesting("");
    if (!phone) {
      setStatus("Save a phone number first.");
      return;
    }
    const fake = fakeCityProduceSms(phone);
    openSms(fake.phone, fake.body);
    setStatus(`Messages should open with a fake ${name} order. Send it from this phone. No email was sent.`);
  }

  async function addVendor() {
    const name = addForm.name.trim();
    if (!name) {
      setStatus("Type a vendor name first.");
      return;
    }
    await save(name, addForm);
    setAddForm(blank());
  }

  async function remove(name: string) {
    if (!confirm(`Remove ${name} from the vendor book?`)) return;
    setBusy(name);
    const res = await fetch(`/api/vendors?name=${encodeURIComponent(name)}`, { method: "DELETE" });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setStatus(data.error || "Could not delete.");
      return;
    }
    setSettings((prev) => prev.filter((entry) => entry.name !== name));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setStatus(`Removed ${name}.`);
  }

  return (
    <div>
      <p className="mb-4 max-w-3xl text-sm text-muted">
        Contact book for each house. Send one vendor at a time. The owner gets that house&apos;s
        inventory. If they have an email they get their order. Turn on texting and add a phone — when
        you send City Produce, this phone can open a ready-to-send text with the order. No Twilio
        account needed.
      </p>

      <div className="card mb-5 p-4">
        <h2 className="serif text-2xl">Add a vendor</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Vendor</span>
            <input
              className="sheet-input"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="Vendor name"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Contact name</span>
            <input
              className="sheet-input"
              value={addForm.contactName}
              onChange={(e) => setAddForm({ ...addForm, contactName: e.target.value })}
              placeholder="Rep or office contact"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Phone</span>
            <input
              className="sheet-input"
              type="tel"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              placeholder="251-555-0100"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Email</span>
            <input
              className="sheet-input"
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              placeholder="orders@vendor.com"
            />
          </label>
          <label className="flex items-start gap-2 text-sm md:col-span-2">
            <input
              className="mt-1"
              type="checkbox"
              checked={addForm.textOrders}
              onChange={(e) => setAddForm({ ...addForm, textOrders: e.target.checked })}
            />
            <span>Text this number when we send their order</span>
          </label>
        </div>
        <button className="btn btn-wine mt-4" type="button" disabled={Boolean(busy)} onClick={() => void addVendor()}>
          {busy && busy === addForm.name.trim() ? "Saving…" : "Add vendor"}
        </button>
      </div>

      {status ? <p className="mb-4 rounded-xl bg-gold-soft px-4 py-3 text-sm">{status}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {ordered.map((setting) => {
          const draft = drafts[setting.name] || fromSetting(setting);
          return (
            <article key={setting.name} className="card p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <h2 className="serif text-2xl">{setting.name}</h2>
                {!isHouse(setting.name) ? (
                  <button
                    className="text-sm text-wine"
                    type="button"
                    disabled={busy === setting.name}
                    onClick={() => void remove(setting.name)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="grid gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Contact name</span>
                  <input
                    className="sheet-input"
                    value={draft.contactName}
                    onChange={(e) => patchDraft(setting.name, "contactName", e.target.value)}
                    placeholder="Who to call"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Phone</span>
                  <input
                    className="sheet-input"
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => patchDraft(setting.name, "phone", e.target.value)}
                    placeholder="Phone number"
                  />
                  {draft.phone.trim() ? (
                    <a className="mt-1 inline-block text-sm text-wine" href={`tel:${draft.phone.replace(/[^\d+]/g, "")}`}>
                      Call {draft.phone}
                    </a>
                  ) : null}
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Email</span>
                  <input
                    className="sheet-input"
                    type="email"
                    value={draft.email}
                    onChange={(e) => patchDraft(setting.name, "email", e.target.value)}
                    placeholder="orders@vendor.com"
                  />
                  {draft.email.trim() ? (
                    <a className="mt-1 inline-block text-sm text-wine" href={`mailto:${draft.email.trim()}`}>
                      Email {draft.email}
                    </a>
                  ) : null}
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={draft.textOrders}
                    onChange={(e) => patchDraft(setting.name, "textOrders", e.target.checked)}
                  />
                  <span>
                    Text this number when we send their order
                    {setting.name === "City Produce" ? " — for Coastal Produce" : ""}
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-gold"
                    type="button"
                    disabled={busy === setting.name || testing === setting.name}
                    onClick={() => void save(setting.name)}
                  >
                    {busy === setting.name ? "Saving…" : "Save contact"}
                  </button>
                  {draft.textOrders ? (
                    <>
                      <button
                        className="btn btn-wine"
                        type="button"
                        disabled={busy === setting.name || testing === setting.name || !draft.phone.trim()}
                        onClick={() => void testText(setting.name)}
                      >
                        {testing === setting.name ? "Texting…" : "Text a fake order"}
                      </button>
                      {setting.name === "City Produce" ? (
                        <a className="btn btn-ghost" href="/text-test">
                          Open fake order page
                        </a>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
