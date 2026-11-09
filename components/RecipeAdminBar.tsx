"use client";

import { useRouter } from "next/navigation";
import { AdminDelete } from "./AdminDelete";

export function RecipeAdminBar({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <div className="mt-4">
      <AdminDelete
        label="Delete recipe"
        confirmText={`Delete ${name}? This cannot be undone.`}
        href={`/api/recipes/${id}`}
        onDeleted={() => router.push("/recipes")}
      />
    </div>
  );
}
