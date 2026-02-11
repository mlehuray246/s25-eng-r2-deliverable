"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/schema";
import EditSpeciesDialog from "./edit-species-dialog";
import SpeciesDetailDialog from "./species-details-dialog";

type SpeciesRow = Database["public"]["Tables"]["species"]["Row"];

export default function SpeciesCard({
  species,
  sessionId,
}: {
  species: SpeciesRow;
  sessionId: string;
}) {
  const canEdit = species.author === sessionId;

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

      <div className="mt-3 flex gap-2">
        <SpeciesDetailDialog species={species} trigger={<Button className="w-full">Learn More</Button>} />

        {canEdit ? (
          <EditSpeciesDialog
            species={species}
            trigger={
              <Button className="w-full" variant="secondary">
                Edit
              </Button>
            }
          />
        ) : null}
      </div>
    </div>
  );
}
