"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import type { Database } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { BaseSyntheticEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type SpeciesRow = Database["public"]["Tables"]["species"]["Row"];

const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

const formSchema = z.object({
  scientific_name: z.string().trim().min(1).transform((v) => v.trim()),
  common_name: z.string().nullable().transform((v) => (!v || v.trim() === "" ? null : v.trim())),
  kingdom: kingdoms,
  total_population: z.number().int().positive().nullable(),
  image: z.string().url().nullable().transform((v) => (!v || v.trim() === "" ? null : v.trim())),
  description: z.string().nullable().transform((v) => (!v || v.trim() === "" ? null : v.trim())),
});

type FormData = z.infer<typeof formSchema>;

export default function EditSpeciesDialog({
  species,
  trigger,
}: {
  species: SpeciesRow;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const defaultValues: Partial<FormData> = useMemo(
    () => ({
      scientific_name: species.scientific_name ?? "",
      common_name: species.common_name ?? null,
      kingdom: (species.kingdom as FormData["kingdom"]) ?? "Animalia",
      total_population: species.total_population ?? null,
      image: species.image ?? null,
      description: species.description ?? null,
    }),
    [species]
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const onSubmit = async (values: FormData) => {
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("species")
      .update({
        scientific_name: values.scientific_name,
        common_name: values.common_name,
        kingdom: values.kingdom,
        total_population: values.total_population,
        image: values.image,
        description: values.description,
      })
      .eq("id", species.id);

    if (error) {
      console.error(error);
      return;
    }

    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit species</DialogTitle>
          <DialogDescription>Update this species. Click “Save Changes” when you’re done.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)}>
            <div className="grid w-full items-center gap-4">
              <FormField
                control={form.control}
                name="scientific_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scientific name</FormLabel>
                    <FormControl>
                      <Input placeholder="Cavia porcellus" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="common_name"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Common name</FormLabel>
                      <FormControl>
                        <Input value={value ?? ""} placeholder="Guinea pig" {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="kingdom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kingdom</FormLabel>
                    <Select onValueChange={(v) => field.onChange(kingdoms.parse(v))} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a kingdom" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {kingdoms.options.map((k) => (
                            <SelectItem key={k} value={k}>
                              {k}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_population"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Total population</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={value ?? ""}
                          placeholder="300000"
                          {...rest}
                          onChange={(event) =>
                            field.onChange(event.target.value === "" ? null : Number(event.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input value={value ?? ""} placeholder="https://..." {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea value={value ?? ""} placeholder="Describe the species..." {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <div className="flex">
                <Button type="submit" className="ml-1 mr-1 flex-auto">
                  Save Changes
                </Button>
                <DialogClose asChild>
                  <Button type="button" className="ml-1 mr-1 flex-auto" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
