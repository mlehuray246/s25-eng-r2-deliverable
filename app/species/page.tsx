import { Separator } from "@/components/ui/separator";
import { TypographyH2 } from "@/components/ui/typography";
import { createServerSupabaseClient } from "@/lib/server-utils";
import type { Database } from "@/lib/schema";
import { redirect } from "next/navigation";
import AddSpeciesDialog from "./add-species-dialog";
import SpeciesCard from "./species-card";

type SpeciesRow = Database["public"]["Tables"]["species"]["Row"];

export default async function SpeciesListPage() {
  const supabase = createServerSupabaseClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) redirect("/");

  const sessionId = session.user.id;

  const { data: species, error } = await supabase
    .from("species")
    .select("*")
    .order("id", { ascending: false })
    .returns<SpeciesRow[]>();

  if (error) throw new Error(error.message);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <TypographyH2>Species List</TypographyH2>
        <AddSpeciesDialog userId={sessionId} />
      </div>

      <Separator className="my-4" />

      <div className="flex flex-wrap justify-center">
        {(species ?? []).map((s) => (
          <SpeciesCard key={s.id} species={s} sessionId={sessionId} />
        ))}
      </div>
    </>
  );
}
