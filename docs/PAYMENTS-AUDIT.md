# Pagos — auditoría y diseño de implementación

Estado: en desarrollo, no activar cobros reales. Rama feat/stripe-preview-validation.

## Correcciones verificadas (14 de septiembre)

- Migración `20260914163603_separate_booking_from_payment.sql` aplicada: confirmar campus/equipo o enviar un pedido ya no implica cobro. Se mantiene la acción explícita de marcar un pedido pagado y la gestión financiera manual.
- El trigger no recalcula importes ni métodos de recibos existentes al editar una inscripción. Conserva pagos, fallos y reembolsos; borrar el origen conserva el recibo sin referencia. No se reescribe el histórico.
- Prueba aislada PostgreSQL 17: `scripts/test-booking-payment-separation.sql`, siempre contra una base local vacía; rollback final. Verifica confirmación, cambio de tarifa, cancelación, devolución, envío y permisos del trigger.
- Acceso «Conexión Stripe» en menús de administración de escritorio y móvil. Tras volver de Checkout, la página espera el webhook y actualiza el estado sin crear otra sesión. La evidencia de confirmación proviene del ledger, no de la URL.
- `npm run test:payments` agrupa las cuatro suites de reglas, tarifas, retorno y firma del webhook. ESLint vuelve a ejecutar los scripts CommonJS sin errores de configuración.
- Siguen pendientes los adaptadores comerciales y sus pruebas completas indicados abajo. Esta entrega no habilita ventas ni demuestra todavía una suscripción mensual completa.

## Confirmación automática de pruebas (13 de septiembre)

- `/api/stripe/webhook` implementado, solo test; devuelve 503 sin secreto o para live. No es todavía un adaptador para pedidos/recibos reales.
- Verifica firma sobre cuerpo original, límite de 1 MB, modo, propósito y vínculo exacto sesión/intento/importe/moneda. No guarda datos de tarjeta ni payloads completos.
- Ledger aislado `stripe_test_attempts` + `stripe_test_events`. Escrituras y RPC exclusivas de service_role; el administrador solo puede leer sus intentos con su sesión normal.
- Una sesión activa por administrador y clave de idempotencia persistente por intento. Los avisos duplicados no repiten la confirmación y un aviso de expiración tardío no revierte un pago.
- La pantalla `/admin/stripe` diferencia consulta directa a Stripe de confirmación automática guardada. La URL de retorno no marca nada como pagado.
- Pruebas: `node scripts/test-stripe-webhook.cjs` (firma, límites, reintentos y entorno) y `scripts/test-stripe-ledger.sql` (transacción revertida, duplicados y permisos). Ambas pasan. Asesor de seguridad sin nuevos avisos para estos objetos.
- Destino snapshot TEST `Academy TEST — Checkout` creado (`we_1UFJ0wGk8vSBcmVd6SsPNwY3`), API 2024-11-20.acacia, cuenta propia. Eventos: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired. `STRIPE_WEBHOOK_SECRET` guardado como Secret exclusivamente en Preview.
- Entrega real del evento TEST Stripe → webhook → ledger comprobada el 13/09 a las 20:10:28 UTC: intento `ba7e9983-41ee-4553-a033-3f57c3d96ca5`, estado `paid`, 100 céntimos EUR, evento `checkout.session.completed`. No es un cobro real ni una validación de mensualidades. No activar ventas. Documentación: https://docs.stripe.com/webhooks
- Preview desplegada con la firma: https://academycb-e4kedwtvo-roques-projects-bd4f7acb.vercel.app . Build correcto; POST con `vercel curl` autorizado devuelve `Missing signature`, confirmando que el handler carga la configuración y rechaza peticiones sin firma. Esto NO acredita aún una entrega firmada desde Stripe.
- Alias de la rama actualizado: https://academycb-git-feat-stripe-previ-bc1b74-roques-projects-bd4f7acb.vercel.app . El destino Stripe usa este alias y `/api/stripe/webhook`, con credencial Automation Bypass independiente autorizada por el usuario. La protección global y la credencial anterior permanecen sin cambios. No documentar el valor ni la URL con su query secreta. Mantener este alias actualizado al desplegar por CLI. Revocar el bypass al finalizar las pruebas. Referencia: https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
- La primera prueba mostró un fallo de retorno: se usaba VERCEL_URL (host inmutable) en lugar del alias donde estaba la sesión. Corregido usando Origin validado contra el alias exacto del proyecto y su despliegue actual, sin ampliar cookies entre dominios ni permitir otros hosts Vercel. Sesiones pendientes de otro dominio no se reutilizan; el pago ya confirmado no se altera. Prueba `node scripts/test-stripe-return-origin.cjs` correcta. Pendiente repetición visual del retorno con una sesión nueva.

## Hallazgos comprobados

- La clave de pruebas funciona en Preview para lectura de Checkout. No se ha verificado todavía una compra completa.
- `place_store_order` calcula precios en base de datos y bloquea productos, pero descuenta stock antes del pago. No hay liberación automática por abandono. Además, validar cada línea antes de descontar permite que varias líneas del mismo producto superen juntas el stock; agrupar cantidades por producto antes de validar, bloquear siempre por ID.
- El portal Pagos muestra pedidos como tarjeta aunque su método sea manual, llama “Total abonado” a importes pendientes y reduce cancelados/reembolsados/fallidos a “Pendiente”.
- Campus tiene comprobación de capacidad separada de la inserción: dos altas simultáneas pueden superar el límite.
- Corregido el 14/09: los triggers ya no convierten campus/equipo confirmado en pagado; no se reclasificó retrospectivamente el histórico.
- Torneos tiene jugadores y equipos; el trigger financiero actual factura `tournament_teams`, no `tournament_players`. Hace falta definir unidad de precio.
- El portal muestra cuotas por hijo y pedidos por email; el nuevo pago debe comprobar relación real tutor-hijo o propietario del pedido en servidor, no confiar en IDs recibidos del cliente.
- El webhook y ledger técnico TEST ya existen; todavía falta conectarlos a las obligaciones de pago de cada módulo. El regreso a la web no debe marcar un pago como abonado.

## Experiencia prevista

| Área | Acción | Condición |
| --- | --- | --- |
| Tienda | Revisar pedido → Pagar con tarjeta | Precio calculado en servidor, stock reservado y caducidad |
| Academia | Pago completo o mensualidades autorizadas | Precio completo, cuota y duración configurables; sin renovación automática |
| Campus | Solicitar plaza → aprobación → Pagar inscripción | Mantener el flujo de aprobación; no cobrar solicitudes sin plaza |
| Torneos | Convocatoria aprobada → Pagar participación | Precio por jugador |
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
5. Verificado el 14/09: separación de confirmación deportiva/envío y cobro, y conservación de historial. Pendiente extender el modelo a obligaciones Stripe por jugador.
6. Botones, estados y conciliación en cada módulo, sin duplicar ingresos de pedidos y ledger.
7. Pruebas: éxito, tarjeta rechazada, abandono, doble clic, importe manipulado, tutor ajeno, sin stock, última plaza, firma falsa, evento duplicado, cambio de precio, pago tardío y reembolso.
8. Entrega firmada Stripe → Preview → ledger técnico verificada el 13/09. Falta repetir el retorno visual y probar los futuros adaptadores comerciales. No desactivar globalmente la protección de Preview.
9. Validación final por el negocio antes de configurar claves reales y habilitar producción.

## Decisiones confirmadas por el propietario

- Academia: pago completo y/o mensualidad recurrente, con opciones, importes y duración de 1 a 60 meses configurables por el dueño. Sin renovación automática.
- El pago completo puede tener descuento frente a la suma de cuotas. Matrícula una sola vez, añadida al primer pago.
- Guardar precio, duración, modalidad y matrícula como snapshot del contrato. Editar el plan no modifica contratos ya aceptados.
- Torneos: precio por jugador.
- Mantener aprobación previa de nuevas solicitudes. No se cambia a matrícula automática sin autorización explícita.

## Avance de configuración de planes

- Nuevas opciones en Ajustes → Planes, sin sustituir la configuración manual anterior.
- Opciones online desactivadas por defecto: no inferir precios ni activar planes existentes.
- Validación de importes y duración en servidor y restricciones adicionales en base de datos.
- `academyPriceSnapshot` prepara un snapshot inmutable y calcula matrícula inicial y total; pendiente persistirlo en contratos y conectarlo a Stripe.
- `node scripts/test-academy-pricing.cjs` prueba límites, importes, matrícula única y cambio de precio sin modificar un snapshot anterior.
- Referencia para limitar la suscripción: https://docs.stripe.com/billing/subscriptions/subscription-schedules (`end_behavior=cancel`). Esta programación aún no está conectada.
- Migración aplicada y reconciliada con historial remoto: `20260913172823_configurable_academy_checkout_prices.sql`. Prueba SQL en transacción revertida: guardado válido y rechazo de decimales, precio ausente y duración excesiva.
- Asesor de seguridad: no se añaden tablas ni permisos. Persisten avisos anteriores sobre funciones SECURITY DEFINER públicas, OTP superior a una hora y protección de contraseñas filtradas desactivada; revisar antes de entrega. Referencias: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable y https://supabase.com/docs/guides/platform/going-into-prod#security . No se cambian invitaciones ni permisos ajenos a estos planes.
