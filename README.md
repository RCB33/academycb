# Academy Costa Brava

Web pública y aplicación de gestión para la academia: captación, CRM, equipos, campus, torneos, finanzas, tienda, videoteca y portal privado para familias.

## Puesta en marcha

Requisitos: Node.js 20 o superior y un proyecto Supabase.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Completa `.env.local` con los valores reales. `SUPABASE_SERVICE_ROLE_KEY` es exclusivamente de servidor: no debe copiarse a variables públicas, enviarse al navegador ni incluirse en commits.

## Base de datos

Aplica las migraciones de `supabase/migrations` en orden cronológico. Las dos migraciones que completan y endurecen el esquema son:

- `20260301000000_complete_domain_schema.sql`: tablas y columnas utilizadas por la aplicación.
- `20260713000000_production_security_hardening.sql`: permisos RLS, funciones seguras, compra atómica y buckets privados.

Después crea el primer usuario en Supabase Auth y asigna su perfil de forma explícita:

```sql
insert into public.profiles (id, full_name, role)
values ('UUID_DEL_USUARIO', 'Administrador', 'admin')
on conflict (id) do update set role = 'admin';
```

No habilites políticas `using (true)` para tablas privadas. Los documentos, firmas y galerías deben permanecer en los buckets privados creados por la migración.

## Antes de publicar

1. Ejecuta `npm run production:check` y `npm run verify`.
2. Aplica todas las migraciones en el proyecto de producción.
3. Configura en `/admin/ajustes` el nombre legal, NIF/CIF, email, teléfono, dirección, temporada y enlaces públicos. Revisa los textos legales con el responsable o su asesor.
4. Configura en Supabase Auth la URL del sitio y las Redirect URLs del dominio de producción.
5. Crea el administrador inicial; prueba un usuario de familia con datos no reales y elimínalo después.
6. Verifica formulario de contacto, invitación/restablecimiento de contraseña, subida privada de documentos, pedidos y permisos de cada rol.
7. Activa copias de seguridad y supervisión en Supabase y en el proveedor de despliegue.

## Despliegue

El proyecto es una aplicación Next.js estándar. En Vercel u otro proveedor compatible configura las cuatro variables de `.env.example`, usa `npm run build` como comando de construcción y sirve la aplicación con `npm run start` si el proveedor lo requiere.

No hay pago online integrado: la tienda registra solicitudes de pedido pendientes para su gestión manual. No debe anunciarse como compra pagada hasta integrar una pasarela y sus webhooks.

## Revisión de Karen (12 de octubre de 2026)

- Tutores: enviar/repetir activación desde la ficha existente, sin recrear vínculos. Las cuentas bloqueadas o con email discrepante requieren revisión, no se desbloquean automáticamente.
- Ficha del jugador > Pagos: crear cuotas por meses o conceptos únicos (matrícula, Plan Plus, equipación, campus, torneo, otros). Se guarda importe base, descuento y motivo. Una cuota totalmente bonificada no cuenta como dinero recibido.
- Registrar pago: aplicar un importe recibido a uno o varios recibos; parciales y reparto entre hermanos se conservan. Transferencia, efectivo, Bizum o tarjeta externa son registros manuales, no cargos Stripe.
- El resumen distingue meses sin cuota creada de deudas. No se infieren meses ni promociones de pagos históricos.
- Recordatorios: prepara texto con saldo actualizado y enlaces a WhatsApp/correo. No envía automáticamente ni acredita entrega. Rechaza recibos saldados/anulados.
- Comprobantes: PDF por recibo, incluyendo abonos y anulaciones. Compartir usa el selector del dispositivo cuando admite archivos; alternativamente descarga para adjuntarlo. No es factura fiscal ni envío automático por Resend.
- Justificantes: privados, solo admin/finanzas; PDF/JPG/PNG hasta 3 MB, accesibles desde Abonos / historial. No se reemplazan archivos previos.
- Entrenadores: jugadores/evaluaciones/observaciones de equipos asignados y avisos internos de coordinación. No acceden a finanzas. Avisos internos no copian mensajes históricos de familias ni envían email/WhatsApp.

### Validación y límites

`npm run test:karen` ejecuta pruebas sin red y sin correos reales. `node scripts/test-receipt-pdf.cjs` genera una muestra ficticia en `tmp/pdfs/` para inspección visual.

Los scripts `scripts/test-manual-allocations.sql`, `scripts/test-karen-charges.sql`, `scripts/test-karen-coach.sql` y `scripts/test-karen-proofs.sql` son exclusivamente para una base PostgreSQL local vacía y desechable. Crean fixtures dentro de una transacción y la revierten. Nunca ejecutarlos en producción.

Pendiente antes de anunciar pagos online: integrar la rama Stripe revisada módulo a módulo, probar Checkout + webhook + retorno con sesión + conciliación del mes, y comprobar altas/bajas y vencimiento de suscripciones. No activar claves/cobros reales por completar la gestión manual.

Pendiente de negocio: confirmar promoción vigente e identificar los meses cubiertos por los anticipos históricos. No recalcular esos pagos sin indicación expresa. La configuración de precios de nuevas cuotas no corrige por sí sola recibos antiguos.
