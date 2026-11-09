"use client";

import { useState } from "react";
import { RECIPE_CATEGORIES } from "@/lib/catalog";
import type { Recipe } from "@/lib/types";
import { Modal } from "./Modal";

const emptyDraft = {
  name: "",
  category: "House",
  yield: "",
  prepTime: "",
  description: "",
  ingredients: "1 cup | Example ingredient",
  instructions: "Step one\nStep two",
  notes: "",
};

export function RecipeForm({
  onSaved,
  onClose,
}: {
  onSaved: (recipe: Recipe, prepCreated?: boolean) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!draft.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    const ingredients = draft.ingredients
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
        ...draft,
        ingredients,
        instructions: draft.instructions.split("\n").map((line) => line.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save recipe.");
      return;
    }
    onSaved(data.recipe, data.prepCreated);
  }

  return (
    <Modal title="Add a recipe" onClose={onClose} wide>
      <div className="grid gap-3">
        <input
          className="sheet-input"
          placeholder="Recipe name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <select
          className="sheet-input"
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
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
          value={draft.yield}
          onChange={(e) => setDraft({ ...draft, yield: e.target.value })}
        />
        <input
          className="sheet-input"
          placeholder="Prep time"
          value={draft.prepTime}
          onChange={(e) => setDraft({ ...draft, prepTime: e.target.value })}
        />
        <textarea
          className="sheet-input min-h-20"
          placeholder="Short description"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <textarea
          className="sheet-input min-h-32"
          placeholder="Ingredients, one per line: 1 cup | Flour"
          value={draft.ingredients}
          onChange={(e) => setDraft({ ...draft, ingredients: e.target.value })}
        />
        <textarea
          className="sheet-input min-h-32"
          placeholder="Instructions, one step per line"
          value={draft.instructions}
          onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
        />
        <textarea
          className="sheet-input min-h-16"
          placeholder="Notes (optional)"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
        {error ? <p className="text-sm text-wine">{error}</p> : null}
        <p className="text-sm text-muted">If this item is not already on Prep, it will be added.</p>
        <button className="btn btn-wine" type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save recipe"}
        </button>
      </div>
    </Modal>
  );
}
