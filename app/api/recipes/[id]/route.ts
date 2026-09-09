import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = readDb().recipes.find((entry) => entry.id === id);
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  return NextResponse.json({ recipe, admin: await isAdmin() });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  updateDb((db) => {
    const recipe = db.recipes.find((entry) => entry.id === id);
    if (!recipe) return;
    if (typeof body.name === "string") recipe.name = body.name.trim();
    if (typeof body.category === "string") recipe.category = body.category.trim();
    if (typeof body.yield === "string") recipe.yield = body.yield;
    if (typeof body.prepTime === "string") recipe.prepTime = body.prepTime;
    if (typeof body.description === "string") recipe.description = body.description;
    if (Array.isArray(body.ingredients)) recipe.ingredients = body.ingredients;
    if (Array.isArray(body.instructions)) recipe.instructions = body.instructions;
    if (body.notes !== undefined) recipe.notes = String(body.notes);
    recipe.updatedAt = new Date().toISOString();
  });
  const recipe = readDb().recipes.find((entry) => entry.id === id);
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  return NextResponse.json({ recipe });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const { id } = await params;
  updateDb((db) => {
    db.recipes = db.recipes.filter((recipe) => recipe.id !== id);
  });
  return NextResponse.json({ ok: true });
}
