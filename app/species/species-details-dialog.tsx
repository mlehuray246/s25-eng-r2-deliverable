"use client";

import type { ReactNode } from "react";
import type { Database } from "@/lib/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SpeciesRow = Database["public"]["Tables"]["species"]["Row"];

export default function SpeciesDetailDialog({
  species,
  trigger,
}: {
  species: SpeciesRow;
  trigger: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>{species.scientific_name}</DialogTitle>
          <DialogDescription>Detailed information about this species.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 text-sm">
          <div>
            <div className="font-semibold">Scientific name</div>
            <div>{species.scientific_name}</div>
          </div>

          <div>
            <div className="font-semibold">Common name</div>
            <div>{species.common_name ?? "—"}</div>
          </div>

          <div>
            <div className="font-semibold">Total population</div>
            <div>{species.total_population ?? "—"}</div>
          </div>

          <div>
            <div className="font-semibold">Kingdom</div>
            <div>{species.kingdom ?? "—"}</div>
          </div>

          <div>
            <div className="font-semibold">Description</div>
            <div className="whitespace-pre-wrap">{species.description ?? "—"}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
