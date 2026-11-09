"use client";

export function AdminDelete({
  label,
  confirmText,
  href,
  onDeleted,
}: {
  label: string;
  confirmText: string;
  href: string;
  onDeleted?: () => void;
}) {
  async function remove() {
    if (!confirm(confirmText)) return;
    const res = await fetch(href, { method: "DELETE" });
    if (!res.ok) {
      alert("Could not delete. Sign in as admin first.");
      return;
    }
    onDeleted?.();
  }

  return (
    <button className="btn btn-ghost !min-h-9 text-wine" type="button" onClick={() => void remove()}>
      {label}
    </button>
  );
}
