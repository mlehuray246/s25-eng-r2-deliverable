"use client";

import type { Database } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Species = Database["public"]["Tables"]["species"]["Row"];

export default function SpeciesDetailsDialog({ species }: { species: Species }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex-1">Learn More</Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{species.scientific_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium">Common name</div>
            <div className="text-sm text-muted-foreground">{species.common_name ?? "—"}</div>
          </div>

          <div>
            <div className="text-sm font-medium">Kingdom</div>
            <div className="text-sm text-muted-foreground">{species.kingdom ?? "—"}</div>
          </div>

          <div>
            <div className="text-sm font-medium">Total population</div>
            <div className="text-sm text-muted-foreground">
              {typeof species.total_population === "number" ? species.total_population.toLocaleString() : "—"}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">Description</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {species.description ?? "—"}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
