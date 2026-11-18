import { renderCommunicationEmail } from '@/lib/communication-email'

export function registrationEmailContent(source: string, kind: string) {
  const event = source === 'event'
  const subject = kind === 'received' ? 'Hemos recibido tu solicitud' : 'Novedades en tu inscripción'
  const messages: Record<string, string> = {
    received: 'Tu solicitud se ha guardado correctamente. Academy revisará la disponibilidad y contactará contigo. Este correo no confirma una plaza ni acredita un pago.',
    awaiting_payment: 'Academy ha validado tu solicitud de torneos. Accede a tu cuenta para consultar el estado actual, los torneos aceptados, el importe y el plazo. Si el pago sigue pendiente de comprobación, allí encontrarás las instrucciones. Si ya lo has realizado, no repitas la transferencia.',
    confirmed: 'Academy ha confirmado tu inscripción de torneos. Puedes consultar todos los detalles en tu cuenta.',
    cancelled: 'El estado de tu inscripción de torneos ha cambiado a cancelada. Contacta con Academy si necesitas aclaraciones. Este aviso no acredita una devolución.',
    reviewed: 'Secretaría ha tramitado tu solicitud. Contacta con Academy para consultar la plaza y los siguientes pasos. Este aviso no acredita un pago.',
  }
  const message = `${messages[kind] || 'Hay novedades en tu solicitud. Contacta con Academy para consultar los detalles.'}\n\n${event ? 'Consulta tu inscripción: https://www.academycostabrava.com/torneos/inscripcion' : 'Academy Costa Brava: https://www.academycostabrava.com'}\n\nContacto: costabravaacademy@gmail.com`
  return { subject, text: message, html: renderCommunicationEmail(subject, message) }
}
