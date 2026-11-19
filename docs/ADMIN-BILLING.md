# Karen — cobros y suscripciones por enlace

Entrada: **Administración → Finanzas → Cobros y suscripciones por enlace** (`/admin/finanzas/solicitudes`). También disponible en el bloque de pagos de cada jugador.

1. Elegir jugador. Si todavía no existe el recibo, «Crear cuota / concepto» permite fijar concepto, meses, importe, descuento y vencimiento. No registra dinero recibido.
2. Elegir el tutor que autorizará. Debe tener una cuenta vinculada; otra familia no podrá abrir el enlace.
3. Elegir pago único o mensualidades automáticas. Seleccionar los recibos y escribir el título que verá la familia.
4. Preparar la solicitud y revisar el resumen. Compartir con «Enviar por correo», «Copiar enlace» o «Abrir WhatsApp». El correo requiere confirmación; WhatsApp solo abre el mensaje para que Karen lo envíe.
5. La familia inicia sesión, revisa los recibos y acepta las condiciones antes de ir a Stripe. El enlace vuelve a la solicitud después de iniciar sesión.
6. Revisar el estado y los importes confirmados. La autorización de tarjeta no es ingreso. Solo una confirmación válida del proveedor marca los recibos como cobrados.

## Mensualidades

- Recibos mensuales futuros y consecutivos, mismo importe y día de vencimiento del 1 al 28. Se conservan descuentos y fechas ya preparados por administración.
- La programación empieza en el primer vencimiento y termina tras la última mensualidad; sin renovación automática. No cobra todos los meses por adelantado.
- Matrícula, Plus anual, equipación u otros extras se solicitan como pago único separado. No se inventa una tarifa anual completa.
- Una solicitud ya aceptada no se edita: cancelar los cobros futuros, revisar el saldo y preparar las nuevas condiciones. La cancelación no devuelve dinero ni borra recibos.
- Una solicitud completada conserva el historial. Los reembolsos y la conciliación se gestionan aparte.

## Salvaguardas

- Roles admin y finance; no se ha creado ninguna cuenta nueva de trabajador.
- Una sola solicitud activa por recibo y entorno. Doble clic y reintentos no crean otro cobro.
- Si un intento Stripe está en curso, el recibo queda protegido contra modificaciones y abonos manuales incompatibles.
- No se aceptan recibos con historial de abonos manuales: se conservan en su gestión habitual.
- Correo «aceptado por proveedor» no significa entregado ni leído. La facturación fiscal es un flujo distinto del enlace y del comprobante informativo.

## Estado de entrega (19/11/2026)

Pago único habilitado según la configuración LIVE existente. Mensualidades implementadas pero su activación LIVE sigue deshabilitada hasta completar la prueba del ciclo del proveedor. Preview permite crear/expirar Checkout TEST de ambas modalidades sin tarjeta, y el correo al buzón oficial de pruebas de Resend fue aceptado. Test Clocks sigue devolviendo `StripePermissionError / more_permissions_required`, incluso tras comunicar el cambio de permisos. Revisar la clave TEST que efectivamente usa Vercel Preview, no la clave LIVE.

Pruebas: `npm run test:stripe`, `npm run test:payments`; SQL local `scripts/test-billing-requests.sql` (nunca ejecutar ese fixture en producción); prueba conectada opt-in `node scripts/test-admin-billing.cjs <host-preview>` y `--clock-only`. El diagnóstico de relojes devuelve 404 en Production. Las pruebas conectadas usan usuarios y recibos ficticios, limpian sus registros y comparan el histórico antes/después.
