/** Shared wording for the admin preview and the family's acceptance email. */
export function academyCashInstructions(amount: number, startDate: string) {
  const date = new Date(`${startDate}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
  const total = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
  return `Has elegido pago en efectivo. Trae ${total} el primer día de entrenamiento, a partir de la incorporación prevista para el ${date}. Este importe incluye la primera cuota y, si corresponden, la matrícula y el Plus del desglose.\nSi necesitas acordar la entrega, escríbenos por WhatsApp: https://wa.me/34691179600. El pago figurará como recibido cuando el equipo confirme la entrega.`
}
