import "server-only";
import { createClient } from "@/lib/supabase/server";
import { adminReadAll } from "@/lib/admin-read-all";
export type FamilyContext = {
  userId: string;
  email: string;
  guardianName: string;
  phone: string;
  children: { id: string; full_name: string; birth_date: string | null }[];
};
export async function getFamilyContext(preview = false): Promise<FamilyContext | null> {
  const db = await createClient();
  const { data: { user: authenticatedUser } } = await db.auth.getUser();
  const user = preview ? (await (await import('@/lib/admin-view')).getPortalViewer()).user : authenticatedUser;
  if (!user?.email || !user.email_confirmed_at) return null;
  const { data: guardians, error } = await db
    .from("guardians")
    .select("id,full_name,phone")
    .eq("user_id", user.id);
  if (error) throw Error("No se pudo cargar tu ficha familiar.");
  if (!guardians?.length)
    return {
      userId: user.id,
      email: user.email,
      guardianName: "",
      phone: "",
      children: [],
    };
  const { data: links } = await adminReadAll((f, t) =>
    db
      .from("child_guardians")
      .select("child_id,child:children(id,full_name,birth_date,archived_at)")
      .in(
        "guardian_id",
        guardians.map((g) => g.id),
      )
      .order("child_id")
      .order("guardian_id")
      .range(f, t),
  );
  const children = links
    .flatMap((l) => (Array.isArray(l.child) ? l.child : [l.child]))
    .filter((c) => c && !c.archived_at)
    .map((c) => ({
      id: c.id,
      full_name: c.full_name,
      birth_date: c.birth_date,
    }));
  return {
    userId: user.id,
    email: user.email,
    guardianName: guardians[0].full_name,
    phone: guardians[0].phone || "",
    children: [...new Map(children.map((c) => [c.id, c])).values()],
  };
}
