import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createRecipe, ensurePrepForRecipe, listRecipes } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const recipes = await listRecipes();
  return NextResponse.json({ recipes, admin: await isAdmin() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const stamp = new Date().toISOString();
  const category = String(body.category || "House").trim() || "House";
  const recipe = {
    id: crypto.randomUUID(),
    name,
    category,
    yield: String(body.yield || ""),
    prepTime: String(body.prepTime || ""),
    description: String(body.description || ""),
    ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
    instructions: Array.isArray(body.instructions) ? body.instructions : [],
    notes: body.notes ? String(body.notes) : undefined,
    createdAt: stamp,
    updatedAt: stamp,
  };
  await createRecipe(recipe);
  const prep = await ensurePrepForRecipe(name, category);
  return NextResponse.json({ recipe, prepItem: prep.item, prepCreated: prep.created });
}
