import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { getRecipe } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RecipeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  return (
    <>
      <Header title={recipe.name} subtitle={`${recipe.category} · Yield ${recipe.yield} · ${recipe.prepTime}`} />
      <article className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/recipes" className="text-sm text-wine">
          ← Back to recipes
        </Link>
        <p className="mt-4 text-lg text-muted">{recipe.description}</p>
        <section className="card mt-6 p-5">
          <h2 className="serif text-3xl">Ingredients</h2>
          <ul className="mt-3 space-y-2">
            {recipe.ingredients.map((ingredient) => (
              <li key={`${ingredient.amount}-${ingredient.item}`} className="flex gap-3 border-b border-[#eadcc6] py-2">
                <span className="w-28 shrink-0 font-semibold">{ingredient.amount}</span>
                <span>{ingredient.item}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card mt-6 p-5">
          <h2 className="serif text-3xl">Method</h2>
          <ol className="mt-3 list-decimal space-y-3 pl-5">
            {recipe.instructions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        {recipe.notes ? (
          <p className="mt-6 rounded-xl bg-gold-soft px-4 py-3 text-sm">{recipe.notes}</p>
        ) : null}
      </article>
    </>
  );
}
