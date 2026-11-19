import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCampusOffer } from "@/lib/offering-server";
import { offerCampusPrice } from "@/lib/offering";
import { z } from "zod";
import { getFamilyContext } from "@/lib/family-context";
import { deliverRegistrationEmails } from "@/lib/registration-email";
import {
  campusRegistrationSchemaFor,
  CAMPUS_VERSION,
} from "@/lib/campus-registration";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Origen no permitido." },
      { status: 403 },
    );
  if (Number(request.headers.get("content-length") || 0) > 32000)
    return NextResponse.json(
      { error: "Formulario demasiado grande." },
      { status: 413 },
    );
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }
  const selection = z
    .object({ campus_id: z.string().uuid(), offer_version: z.string() })
    .safeParse(payload);
  if (!selection.success)
    return NextResponse.json(
      { error: "Recarga el formulario para elegir una edición." },
      { status: 400 },
    );
  const campus = await getCampusOffer(selection.data.campus_id);
  if (!campus || campus.end_date < new Date().toISOString().slice(0, 10))
    return NextResponse.json(
      { error: "Esta edición no admite solicitudes." },
      { status: 400 },
    );
  if (campus.updated_at !== selection.data.offer_version)
    return NextResponse.json(
      {
        error:
          "El programa o las tarifas han cambiado. Recarga para revisar tu elección.",
      },
      { status: 409 },
    );
  const link = z
    .object({
      linked_child_id: z.union([z.string().uuid(), z.literal("")]).optional(),
    })
    .safeParse(payload);
  if (!link.success)
    return NextResponse.json({ error: "Jugador no válido." }, { status: 400 });
  const family = await getFamilyContext();
  const linkedId = link.data.linked_child_id || null;
  if (linkedId) {
    const child = family?.children.find((c) => c.id === linkedId);
    if (!child)
      return NextResponse.json(
        { error: "El jugador no pertenece a tu cuenta verificada." },
        { status: 403 },
      );
    payload = {
      ...(payload as Record<string, unknown>),
      child_name: child.full_name,
      ...(child.birth_date ? { birth_date: child.birth_date } : {}),
      email: family!.email,
    };
  }
  const program = campus.public_program,
    campusWeeks = program.weeks;
  const parsed = campusRegistrationSchemaFor(
    program.birth_from,
    program.birth_to,
  ).safeParse(payload);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  const d = parsed.data;
  const details = [
    `Formulario: ${CAMPUS_VERSION} · ${new Date().toISOString()}`,
    `Equipo: ${d.team}`,
    `Modalidad: ${d.role}`,
    `Semanas: ${campusWeeks
      .filter((w) => d.weeks.includes(w.id as "1" | "2" | "3"))
      .map((w) => w.label)
      .join("; ")}`,
    `Tarifa base: ${offerCampusPrice(d.weeks, program)} €`,
    `Segundo hermano: ${d.sibling ? d.sibling_name + ` (${program.sibling_discount} % pendiente de verificar)` : "No"}`,
    `Preferencias: ${d.preferences || "Ninguna"}`,
    `Talla sudadera: ${d.size || "No corresponde"}`,
    `Alergias: ${d.allergies}`,
    `Tarjeta sanitaria: ${d.health_card}`,
    `Autoriza asistencia médica: ${d.medical_consent}`,
    `Autoriza imágenes: ${d.image_consent}`,
    `Motivo: ${d.reason}`,
    `Expectativas: ${d.expectations}`,
    "Acepta condiciones de pago, privacidad, tratamiento de datos de salud y participación: Sí",
    "Pago: pendiente de comprobación. Plaza: pendiente de confirmación.",
  ].join("\n");
  const supabase = createAdminClient();
  if (linkedId && family) {
    const { data: existing, error: lookupError } = await supabase
      .from("enrollment_requests")
      .select("id")
      .eq("submitted_by", family.userId)
      .eq("linked_child_id", linkedId)
      .eq("activity_id", campus.id)
      .in("status", ["new", "contacted", "interested", "enrolled"])
      .limit(1);
    if (lookupError)
      return NextResponse.json(
        { error: "No se pudo comprobar tu solicitud anterior." },
        { status: 503 },
      );
    if (existing?.length)
      return NextResponse.json(
        {
          error:
            "Ya hay una solicitud para este jugador y campus. Consúltala en Mis actividades o contacta con Academy para modificarla.",
        },
        { status: 409 },
      );
  }
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from("enrollment_requests")
    .insert({
      id,
      linked_child_id: linkedId,
      submitted_by: family?.userId || null,
      service: "campus",
      activity_id: campus.id,
      activity_name: campus.name,
      child_name: d.child_name,
      birth_date: d.birth_date,
      guardian_name: d.guardian_name,
      email: d.email.toLowerCase(),
      phone: d.phone,
      notes: details,
      campus_details: {
        ...d,
        quoted_amount: offerCampusPrice(d.weeks, program),
        offer_version: campus.updated_at,
        program_snapshot: program,
        schedule: campus.schedule,
        location: campus.location,
      },
      status: "new",
    });
  if (error)
    return NextResponse.json(
      {
        error:
          "No se ha podido guardar la inscripción. Inténtalo de nuevo o llama al 691 17 96 00.",
      },
      { status: 500 },
    );
  await deliverRegistrationEmails("enrollment", id);
  return NextResponse.json({ success: true }, { status: 201 });
}
