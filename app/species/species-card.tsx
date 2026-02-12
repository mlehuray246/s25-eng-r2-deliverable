"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/schema";
import EditSpeciesDialog from "./edit-species-dialog";
import SpeciesDetailDialog from "./species-details-dialog";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type SpeciesRow = Database["public"]["Tables"]["species"]["Row"];

export default function SpeciesCard({
  species,
  sessionId,
}: {
  species: SpeciesRow;
  sessionId: string;
}) {
  const router = useRouter();
  const canEdit = species.author === sessionId;

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!canEdit || deleting) return;

    const ok = window.confirm(
      `Delete "${species.scientific_name}"?\n\nThis will permanently remove it and cannot be undone.`
    );
    if (!ok) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("species")
        .delete()
        .eq("id", species.id)
        .eq("author", sessionId);

      if (error) {
        setDeleteError(error.message);
        return;
      }

      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="m-4 w-72 min-w-72 flex-none rounded border-2 p-3 shadow">
      {species.image ? (
        <div className="relative h-40 w-full overflow-hidden rounded">
          <Image
            src={species.image}
            alt={species.scientific_name ?? "Species image"}
            fill
            style={{ objectFit: "cover" }}
            sizes="288px"
          />
        </div>
      ) : null}

      <h3 className="mt-3 text-2xl font-semibold">{species.scientific_name}</h3>
      <h4 className="text-lg font-light italic">{species.common_name ?? ""}</h4>

      {species.description ? (
        <p className="mt-2">{species.description.slice(0, 150).trim()}…</p>
      ) : null}

      {deleteError ? (
        <div className="mt-2 text-xs text-red-600">{deleteError}</div>
      ) : null}

      {/* Actions: Learn More full width, then Edit/Delete side by side */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <SpeciesDetailDialog
            species={species}
            trigger={<Button className="w-full">Learn More</Button>}
          />
        </div>

        {canEdit ? (
          <>
            <EditSpeciesDialog
              species={species}
              trigger={
                <Button className="w-full" variant="secondary">
                  Edit
                </Button>
              }
            />

            <Button
              className="w-full"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
              title="Delete species"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
