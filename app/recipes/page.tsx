"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { RECIPE_CATEGORIES } from "@/lib/catalog";
import type { Recipe } from "@/lib/types";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    fetch("/api/recipes")
      .then((res) => res.json())
      .then((data) => setRecipes(data.recipes || []));
  }, []);

  const categories = useMemo(() => {
    const extra = recipes.map((recipe) => recipe.category).filter((name) => !RECIPE_CATEGORIES.includes(name as (typeof RECIPE_CATEGORIES)[number]));
    return ["All", ...RECIPE_CATEGORIES, ...Array.from(new Set(extra))];
  }, [recipes]);
  const visible = recipes.filter((recipe) => {
    const matchCat = category === "All" || recipe.category === category;
    const matchQ = recipe.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <>
      <Header title="Recipe book" subtitle="House recipes for soups, sauces, crab cakes, and desserts." />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap gap-3">
          <input
            className="sheet-input max-w-sm"
            placeholder="Search recipes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="sheet-input max-w-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="card p-5 transition hover:-translate-y-0.5">
              <p className="text-xs uppercase tracking-[0.16em] text-wine">{recipe.category}</p>
              <h2 className="serif mt-1 text-3xl leading-tight">{recipe.name}</h2>
              <p className="mt-2 text-sm text-muted">{recipe.description}</p>
              <p className="mt-3 text-sm">
                Yield {recipe.yield} · {recipe.prepTime}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
