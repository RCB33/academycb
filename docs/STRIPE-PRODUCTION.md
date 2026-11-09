# Activación de Stripe — 9 de noviembre de 2026

La integración comercial de septiembre se ha incorporado a la versión actual de Academy. Incluye pagos de recibos de academia, campus, torneos y tienda desde el portal, y pago de inscripciones de Navidad una vez aprobadas por Academy.

## Activación pendiente

Los cobros reales todavía están desactivados. Las credenciales de Preview son exclusivamente TEST. No reutilizarlas en Production.

En Vercel, proyecto `academycb`, guardar exclusivamente en Production y como Secret:

- `STRIPE_SECRET_KEY`: clave de servidor LIVE de la cuenta de Academy, nunca una clave pública `pk_`.
- `STRIPE_WEBHOOK_SECRET`: firma del destino LIVE `https://www.academycostabrava.com/api/stripe/webhook`.

El destino utiliza eventos snapshot de la propia cuenta. Escucha:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Comprobar que la cuenta de Stripe es la del negocio y permite cobrar. Después de guardar las credenciales se necesita un nuevo despliegue. El diagnóstico privado está en `/admin/stripe`.

Antes de habilitar ventas: verificar Checkout comercial y entrega firmada en TEST. En Production, `STRIPE_LIVE_PAYMENTS_ENABLED=true` y Ajustes → Cobros → Tarjeta activo habilitan nuevos pagos. Desactivar nuevos pagos no interrumpe la recepción de confirmaciones de cobros anteriores.

No hay que crear productos ni identificadores de precio manualmente en Stripe para los pagos por recibo: la web envía el importe aprobado y guardado en Academy.

## Compatibilidad con la gestión actual

- Los planes individuales con `plan_snapshot` mantienen sus recibos, descuentos y fechas. No se convierten a un contrato basado en un precio posterior del catálogo.
- Los recibos con historial de abonos manuales permanecen en gestión manual; no se ofrece cobrar su importe completo con tarjeta.
- Las inscripciones de Navidad solo se cobran tras aprobación, por el importe aprobado y dentro de plazo. Un pago TEST no confirma una plaza real. Una transferencia en revisión no ofrece pago simultáneo con tarjeta.
- La tienda conserva su flujo de pedido y pago desde la cuenta del comprador. No es un checkout anónimo inmediato. Los pedidos abandonados requieren cancelación administrativa para liberar el stock reservado.
- Las mensualidades automáticas necesitan `STRIPE_RECURRING_PAYMENTS_ENABLED=true`, además de lo anterior. Mantenerlas desactivadas hasta verificar primera factura, siguiente cuota, fallo y finalización con Test Clock. Las cuotas individuales sí se pueden pagar por recibo.
- Los reembolsos y disputas requieren conciliación administrativa; no se incluye una nueva automatización de devoluciones.

## Validaciones realizadas

- Pruebas de reglas, firmas reales HMAC, aislamiento TEST/LIVE, matrícula y duración finita con Stripe simulado.
- Regresión de cobros manuales, abonos parciales, conceptos, planes familiares y presupuestos de Navidad.
- PostgreSQL 17 local aislado: permisos y RLS, propiedad, importe, doble clic/evento, stock, plazas, confirmación de inscripción y bloqueo de pago manual/reasignación durante Checkout. Fixtures con rollback, nunca ejecutados en producción.
- TypeScript, ESLint y build de Next.js. ESLint conserva advertencias preexistentes.
- Las pruebas locales no acreditan un cobro real ni un ciclo mensual real en Stripe.
