import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createRecipe, listRecipes } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const recipes = await listRecipes();
  return NextResponse.json({ recipes, admin: await isAdmin() });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const stamp = new Date().toISOString();
  const recipe = {
    id: crypto.randomUUID(),
    name,
    category: String(body.category || "House").trim() || "House",
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
  return NextResponse.json({ recipe });
}
