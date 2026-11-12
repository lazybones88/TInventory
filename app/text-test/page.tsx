"use client";

import { Header } from "@/components/Header";
import { fakeCityProduceSms } from "@/lib/fake-produce-text";
import { openSms } from "@/lib/sms-link";

export default function TextTestPage() {
  const { phone, body } = fakeCityProduceSms();

  function sendText() {
    openSms(phone, body);
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
          <button className="btn btn-wine mt-4 w-full" type="button" onClick={sendText}>
            Text this fake order
          </button>
          <p className="mt-3 text-sm text-muted">
            Open this page on your phone, tap the button, then hit send in Messages. No email goes out.
          </p>
        </div>
      </main>
    </>
  );
}
