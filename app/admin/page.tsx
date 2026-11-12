"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { VendorBook } from "@/components/VendorBook";
import { orderVendor, RECIPE_CATEGORIES, unitLabel, VENDORS, vendorsFrom } from "@/lib/catalog";
import { sheetLabel, type InventoryItem, type Recipe, type Report } from "@/lib/types";

type Tab = "pars" | "vendors" | "records" | "recipes";

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("vendors");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [openReport, setOpenReport] = useState<Report | null>(null);
  const [recipeDraft, setRecipeDraft] = useState({
    name: "",
    category: "House",
    yield: "",
    prepTime: "",
    description: "",
    ingredients: "1 cup | Example ingredient",
    instructions: "Step one\nStep two",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.admin) router.replace("/admin/login");
        else setReady(true);
      });
    const wanted = new URLSearchParams(window.location.search).get("tab");
    if (wanted === "vendors" || wanted === "records" || wanted === "recipes" || wanted === "pars") {
      setTab(wanted);
    }
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    fetch("/api/items")
      .then((res) => res.json())
      .then((data) => setItems(data.items || []));
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => setReports(data.reports || []));
    fetch("/api/recipes")
      .then((res) => res.json())
      .then((data) => setRecipes(data.recipes || []));
  }, [ready]);

  async function saveVendor(item: InventoryItem, vendor: string) {
    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor }),
    });
    const data = await res.json();
    if (data.item) setItems((prev) => prev.map((entry) => (entry.id === item.id ? data.item : entry)));
  }

  async function savePar(item: InventoryItem, par: string) {
    const value = Number(par);
    if (!Number.isFinite(value)) return;
    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ par: value }),
    });
    const data = await res.json();
    if (data.item) setItems((prev) => prev.map((entry) => (entry.id === item.id ? data.item : entry)));
  }

  async function removeItem(id: string) {
    if (!confirm("Remove this item?")) return;
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function addRecipe() {
    const ingredients = recipeDraft.ingredients
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [amount, ...rest] = line.split("|");
        return { amount: amount.trim(), item: rest.join("|").trim() || amount.trim() };
      });
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...recipeDraft,
        ingredients,
        instructions: recipeDraft.instructions.split("\n").map((line) => line.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (data.recipe) {
      setRecipes((prev) => [data.recipe, ...prev]);
      setRecipeDraft({
        name: "",
        category: "House",
        yield: "",
        prepTime: "",
        description: "",
        ingredients: "1 cup | Example ingredient",
        instructions: "Step one\nStep two",
        notes: "",
      });
    }
  }

  async function removeRecipe(id: string) {
    if (!confirm("Delete this recipe?")) return;
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
  }

  if (!ready) return null;

  return (
    <>
      <Header title="Admin" subtitle="Vendor contacts, pars, records, and recipes." />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab !== "vendors" ? (
          <button
            type="button"
            className="card mb-5 w-full p-4 text-left"
            onClick={() => {
              setTab("vendors");
              const url = new URL(window.location.href);
              url.searchParams.set("tab", "vendors");
              window.history.replaceState({}, "", url);
            }}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Vendor contacts</p>
            <h2 className="serif text-3xl">Names, phones, and emails</h2>
            <p className="mt-1 text-sm text-muted">
              Open the vendor cards — City Produce, Buckhead Meat, Fresh Seafood, and the rest. City
              Produce texts go to the phone on that card.
            </p>
          </button>
        ) : null}
        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              ["vendors", "Vendor contacts"],
              ["pars", "Pars & items"],
              ["records", "Dated records"],
              ["recipes", "Recipes"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn ${tab === id ? "btn-wine" : id === "vendors" ? "btn-gold" : "btn-ghost"}`}
              onClick={() => {
                setTab(id);
                const url = new URL(window.location.href);
                url.searchParams.set("tab", id);
                window.history.replaceState({}, "", url);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "vendors" ? <VendorBook /> : null}

        {tab === "pars" ? (
          <div className="overflow-hidden rounded-2xl border border-[#eadcc6]">
            <table className="w-full text-left text-sm">
              <thead className="bg-wine text-[#fffaf2]">
                <tr>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Item</th>
                  <th className="px-3 py-3">Vendor</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-3 py-3">Par</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-paper">
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-[#eadcc6]">
                    <td className="px-3 py-2 capitalize">{item.type}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-xs text-muted">{item.category}</div>
                    </td>
                    <td className="px-3 py-2">
                      {item.type === "ordering" ? (
                        <select
                          className="sheet-input min-w-44"
                          value={item.vendor || ""}
                          onChange={(e) => void saveVendor(item, e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {Array.from(
                            new Set([...VENDORS, ...vendorsFrom(items.filter((entry) => entry.type === "ordering")), item.vendor || ""].filter(Boolean))
                          ).map(
                            (name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            )
                          )}
                        </select>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{unitLabel(item.unit)}</td>
                    <td className="px-3 py-2">
                      <input
                        className="sheet-input max-w-24"
                        type="number"
                        defaultValue={item.par}
                        key={`${item.id}-${item.par}`}
                        onBlur={(e) => savePar(item, e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button className="text-wine" type="button" onClick={() => removeItem(item.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "records" ? (
          <div className="grid gap-3">
            {reports.length === 0 ? <p className="text-muted">No sheets sent yet.</p> : null}
            {reports.map((report) => (
              <button
                key={report.id}
                type="button"
                className="card p-4 text-left"
                onClick={() => setOpenReport(report)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="serif text-2xl">
                      {sheetLabel(report.type, orderVendor(report))} · {report.date}
                      {report.type === "prep" && report.shift === "night"
                        ? " · Night shift"
                        : report.type === "prep"
                          ? " · Day shift"
                          : ""}
                    </p>
                    <p className="text-sm text-muted">
                      {new Date(report.submittedAt).toLocaleString()} · {report.submittedBy} ·{" "}
                      {report.emailed ? "Emailed" : "Saved only"}
                    </p>
                  </div>
                  <span className="text-sm">{report.lines.length} lines</span>
                </div>
              </button>
            ))}
            {openReport ? (
              <div className="card overflow-auto p-4">
                <div className="mb-3 flex justify-between">
                  <h2 className="serif text-2xl">
                    {openReport.date} {openReport.type}
                  </h2>
                  <button className="btn btn-ghost !min-h-9" type="button" onClick={() => setOpenReport(null)}>
                    Close
                  </button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="py-2">Item</th>
                      <th>Par</th>
                      <th>On hand</th>
                      <th>{openReport.type === "prep" ? "Made" : "Order"}</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openReport.lines.map((line) => (
                      <tr key={line.itemId} className="border-t border-[#eadcc6]">
                        <td className="py-2">{line.name}</td>
                        <td>{line.par}</td>
                        <td>{line.onHand}</td>
                        <td>{openReport.type === "prep" ? line.madeToday : line.orderQty}</td>
                        <td>{line.overParReason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "recipes" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="serif text-3xl">Add a recipe</h2>
              <div className="mt-4 grid gap-3">
                <input
                  className="sheet-input"
                  placeholder="Name"
                  value={recipeDraft.name}
                  onChange={(e) => setRecipeDraft({ ...recipeDraft, name: e.target.value })}
                />
                <select
                  className="sheet-input"
                  value={recipeDraft.category}
                  onChange={(e) => setRecipeDraft({ ...recipeDraft, category: e.target.value })}
                >
                  {RECIPE_CATEGORIES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <input
                  className="sheet-input"
                  placeholder="Yield"
                  value={recipeDraft.yield}
                  onChange={(e) => setRecipeDraft({ ...recipeDraft, yield: e.target.value })}
                />
                <input
                  className="sheet-input"
                  placeholder="Prep time"
                  value={recipeDraft.prepTime}
                  onChange={(e) => setRecipeDraft({ ...recipeDraft, prepTime: e.target.value })}
                />
                <textarea
                  className="sheet-input min-h-20"
                  placeholder="Description"
                  value={recipeDraft.description}
                  onChange={(e) => setRecipeDraft({ ...recipeDraft, description: e.target.value })}
                />
                <textarea
                  className="sheet-input min-h-32"
                  placeholder="Ingredients, one per line: 1 cup | Flour"
                  value={recipeDraft.ingredients}
                  onChange={(e) => setRecipeDraft({ ...recipeDraft, ingredients: e.target.value })}
                />
                <textarea
                  className="sheet-input min-h-32"
                  placeholder="Instructions, one step per line"
                  value={recipeDraft.instructions}
                  onChange={(e) => setRecipeDraft({ ...recipeDraft, instructions: e.target.value })}
                />
                <button className="btn btn-wine" type="button" onClick={addRecipe}>
                  Save recipe
                </button>
              </div>
            </div>
            <div className="grid gap-3">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="card flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{recipe.name}</p>
                    <p className="text-sm text-muted">{recipe.category}</p>
                  </div>
                  <button className="text-wine" type="button" onClick={() => removeRecipe(recipe.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
