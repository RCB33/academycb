# Pagos — auditoría y diseño de implementación

Estado: en desarrollo, no activar cobros reales. Rama feat/stripe-preview-validation.

## Hallazgos comprobados

- La clave de pruebas funciona en Preview para lectura de Checkout. No se ha verificado todavía una compra completa.
- `place_store_order` calcula precios en base de datos y bloquea productos, pero descuenta stock antes del pago. No hay liberación automática por abandono. Además, validar cada línea antes de descontar permite que varias líneas del mismo producto superen juntas el stock; agrupar cantidades por producto antes de validar, bloquear siempre por ID.
- El portal Pagos muestra pedidos como tarjeta aunque su método sea manual, llama “Total abonado” a importes pendientes y reduce cancelados/reembolsados/fallidos a “Pendiente”.
- Campus tiene comprobación de capacidad separada de la inserción: dos altas simultáneas pueden superar el límite.
- Los triggers financieros convierten campus confirmado y equipo de torneo confirmado en pagado. Confirmación deportiva y cobro deben separarse.
- Torneos tiene jugadores y equipos; el trigger financiero actual factura `tournament_teams`, no `tournament_players`. Hace falta definir unidad de precio.
- El portal muestra cuotas por hijo y pedidos por email; el nuevo pago debe comprobar relación real tutor-hijo o propietario del pedido en servidor, no confiar en IDs recibidos del cliente.
- No existe webhook operativo ni registro persistente de intentos de Checkout. El regreso a la web no debe marcar un pago como abonado.

## Experiencia prevista

| Área | Acción | Condición |
| --- | --- | --- |
| Tienda | Revisar pedido → Pagar con tarjeta | Precio calculado en servidor, stock reservado y caducidad |
| Academia | Pagar cuota / autorizar suscripción | Modalidad pendiente de confirmar con cliente |
| Campus | Solicitar plaza → aprobación → Pagar inscripción | Mantener el flujo de aprobación; no cobrar solicitudes sin plaza |
| Torneos | Convocatoria aprobada → Pagar participación | Unidad de precio pendiente: jugador/equipo/configurable |
| Familias / Pagos | Pagar, ver estado y justificante | Solo operaciones propias; indicar hijo, concepto, vencimiento |
| Administración | Estado, referencia Stripe, conciliación | Nunca confundir matrícula confirmada con dinero recibido |

## Núcleo de seguridad preparado

- SDK Stripe fijado a versión exacta; claves solo servidor.
- Conversión estricta de euros a céntimos, sin aceptar totales del navegador.
- Clave de pruebas fuera de producción; producción requiere clave real, webhook y activación explícita.
- Clave de idempotencia basada en un intento persistente, no en cada clic.
- Verificación de firma del cuerpo original del webhook, antigüedad y modo test/live.
- Comprobación del ID de sesión, intento, moneda, importe y estado paid antes de procesar.
- Estos helpers no están conectados a botones de cobro público hasta terminar el registro transaccional.

## Pendiente de implementación y pruebas

1. Registro de intentos/eventos con restricciones únicas, bloqueo del recibo y una sesión activa por obligación.
2. Separación de pagos de pruebas: nunca actualizar recibos reales ni contabilidad real con un evento test.
3. Reservas atómicas de stock/plazas y liberación idempotente al caducar; cancelación visual no equivale a sesión expirada.
4. Webhook firmado con confirmación transaccional; duplicados, concurrencia, eventos fuera de orden y fallo temporal de base de datos.
5. Separar estado deportivo/logístico de estado financiero y conservar historial al cancelar/reembolsar.
6. Botones, estados y conciliación en cada módulo, sin duplicar ingresos de pedidos y ledger.
7. Pruebas: éxito, tarjeta rechazada, abandono, doble clic, importe manipulado, tutor ajeno, sin stock, última plaza, firma falsa, evento duplicado, cambio de precio, pago tardío y reembolso.
8. Configurar STRIPE_WEBHOOK_SECRET en Preview tras disponer de endpoint estable y acceso para Stripe. No desactivar globalmente la protección de Preview.
9. Validación final por el negocio antes de configurar claves reales y habilitar producción.

## Decisiones necesarias

- Cuotas: pago de cada recibo o cargo recurrente autorizado.
- Torneos: precio por jugador, por equipo o configurable.
- Mantener aprobación previa de nuevas solicitudes. No se cambia a matrícula automática sin autorización explícita.
