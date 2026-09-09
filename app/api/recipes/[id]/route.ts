import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteRecipe, getRecipe, updateRecipe } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  return NextResponse.json({ recipe, admin: await isAdmin() });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.category === "string") patch.category = body.category.trim();
  if (typeof body.yield === "string") patch.yield = body.yield;
  if (typeof body.prepTime === "string") patch.prepTime = body.prepTime;
  if (typeof body.description === "string") patch.description = body.description;
  if (Array.isArray(body.ingredients)) patch.ingredients = body.ingredients;
  if (Array.isArray(body.instructions)) patch.instructions = body.instructions;
  if (body.notes !== undefined) patch.notes = String(body.notes);
  const recipe = await updateRecipe(id, patch);
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  return NextResponse.json({ recipe });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const { id } = await params;
  await deleteRecipe(id);
  return NextResponse.json({ ok: true });
}
