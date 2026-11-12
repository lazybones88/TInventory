"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { fakeCityProduceSms } from "@/lib/fake-produce-text";
import { copyOrderText, openSms, shareOrderText } from "@/lib/sms-link";

export default function TextTestPage() {
  const { phone, body } = fakeCityProduceSms();
  const [status, setStatus] = useState("");

  async function share() {
    const result = await shareOrderText(phone, body);
    if (result === "shared") setStatus("Pick Messages, WhatsApp, or any chat app, then send. No email goes out.");
    if (result === "copied") setStatus("Copied. Open your chat app, paste, and send to that number.");
  }

  async function copy() {
    await copyOrderText(phone, body);
    setStatus("Copied. Open your chat app, paste, and send to that number.");
  }

  return (
    <>
      <Header
        title="Fake produce text"
        subtitle="This is a test order only. It does not email anyone or save a real inventory."
      />
      <main className="mx-auto max-w-xl px-4 py-6">
        <div className="card p-4">
          <p className="text-sm text-muted">To {phone}</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-cream-deep p-4 text-sm">{body}</pre>
          <div className="mt-4 grid gap-2">
            <button className="btn btn-wine w-full" type="button" onClick={() => void share()}>
              Share this order
            </button>
            <button className="btn btn-gold w-full" type="button" onClick={() => void copy()}>
              Copy order
            </button>
            <button className="btn btn-ghost w-full" type="button" onClick={() => openSms(phone, body)}>
              Open Messages if this pad can text
            </button>
          </div>
          <p className="mt-3 text-sm text-muted">
            On an Android pad with no cell service, tap Share and pick WhatsApp, Messenger, or any chat. Or Copy and
            paste. Nothing is emailed.
          </p>
          {status ? <p className="mt-3 rounded-xl bg-gold-soft px-4 py-3 text-sm">{status}</p> : null}
        </div>
      </main>
    </>
  );
}
