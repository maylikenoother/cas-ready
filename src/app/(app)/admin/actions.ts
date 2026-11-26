"use server";

import { revalidatePath } from "next/cache";
import { loadProfile, requireUser } from "@/lib/auth";
import { factUpdateSchema, moneyOrNull } from "@/lib/validation";

export async function updateFact(formData: FormData) {
  const { supabase, user } = await requireUser();
  const profile = await loadProfile(user.id);
  if (profile.role !== "admin") throw new Error("Only an admin can edit reference figures.");
  const parsed = factUpdateSchema.safeParse({
    id: formData.get("id"),
    valueNumeric: formData.get("valueNumeric"),
    valueText: formData.get("valueText"),
    sourceUrl: formData.get("sourceUrl"),
    lastVerifiedOn: formData.get("lastVerifiedOn"),
    needsVerification: formData.get("needsVerification") === "yes",
    active: formData.get("active") === "yes",
    notes: formData.get("notes"),
  });
  if (!parsed.success) throw new Error("That figure could not be read.");
  const { error } = await supabase.from("reference_facts").update({
    value_numeric: moneyOrNull(parsed.data.valueNumeric),
    value_text: parsed.data.valueText || null,
    source_url: parsed.data.sourceUrl || null,
    last_verified_on: parsed.data.lastVerifiedOn || null,
    needs_verification: parsed.data.needsVerification,
    active: parsed.data.active,
    notes: parsed.data.notes || null,
  }).eq("id", parsed.data.id);
  if (error) throw new Error("The figure could not be saved.");
  revalidatePath("/admin");
  revalidatePath("/prep");
}
