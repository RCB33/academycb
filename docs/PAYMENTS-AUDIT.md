## Formas de pago independientes por actividad — 20 noviembre 2026

Esta instrucción posterior del propietario sustituye la excepción de pago compartido para Academia + Campus descrita más abajo.

- Academia: tarjeta con Stripe o efectivo. Campus: transferencia o efectivo. Torneos: solo transferencia. El servidor valida cada elección aunque se soliciten dos o tres actividades; una transferencia de Campus nunca se aplica a Academia.
- La inscripción de Academia permite añadir interés en Campus y Torneos con selectores independientes. Se conserva la selección validada de plan/grupos de Academia y el mapa `requested_payments` en su snapshot existente. Las plazas adicionales se concretan por separado con Secretaría; aceptar Academia no las confirma ni crea cargos adicionales.
- Campus guarda su método en `campus_details.payment_choice`; el formulario propio admite efectivo. Torneos conserva transferencia como única opción. Los formularios antiguos de Campus/Torneos sin ese campo conservan su comportamiento anterior de transferencia.
- Se muestra el detalle en solicitudes, CRM, solicitudes del portal y en la ficha vinculada/aceptada. La consulta de la ficha está restringida a administración, relaciona cada inscripción de Campus mediante `campus_request_links` y solo lee las preferencias de pago del JSON. Los valores históricos desconocidos no se convierten en acuerdos nuevos.
- Confirmaciones de Campus en efectivo indican cómo coordinar la entrega, sin instrucciones bancarias. Las confirmaciones combinadas detallan los tres métodos y distinguen las plazas pendientes. Las formas solicitadas/acordadas no acreditan ingresos.
- Pruebas de código: matriz de métodos por actividad, combinaciones de una/dos/tres, persistencia separada, validación de propiedad, atomicidad, restricciones de esquemas, ficha/links/autorización y textos de correo con inserciones/correos simulados; oferta/prorrateos, torneos y gestión. TypeScript, build y lint sin errores (advertencias preexistentes).
- No hay migraciones ni modificaciones de registros financieros existentes, pruebas de escritura en producción, envíos reales de correo ni cambios en flags de Stripe. No se afirma una nueva comprobación de digest, aceptación del proveedor ni entrega de email de extremo a extremo.

## Revisión mensual y recordatorios de Karen — 20 noviembre 2026

Publicación funcional `16fb539`, Vercel `dpl_5uxQRBgoyRqumo2SmRQZtiXT6PnG`, READY (build remoto correcto). Navegador real: acceso autorizado, carga de datos, filtros de mes y pendientes, rechazo de recordatorios para cuotas futuras; captura `auditoria-2026-11-20/revision-cuotas-karen.jpg`. Sin cuotas vencidas elegibles en noviembre: no se afirma un envío real ni una validación manual real de efectivo desde UI; esos caminos se probaron con fixtures y proveedor simulado. Cuenta QA eliminada y sesiones revocadas. Digest final de 19 pagos conservado y cero recordatorios enviados. Flags de producción consultados: LIVE true preexistente, mensualidades generales false. Texto de gestión alineado en `d16885f`.

- Efectivo se valida registrando el cobro realmente recibido, con importe y fecha, mediante el ledger existente. El método acordado nunca convierte una cuota en pagada. Pantalla `/admin/finanzas/revision` con filtros de mes/método, saldos, incidencias Stripe, validación de efectivo y recordatorio.
- Avisos internos deduplicados: día 3 revisión de efectivo, día 7 repaso de pendientes, desde día 8 seguimiento. Comprobación diaria a las 07:15 UTC con fecha de Madrid. Si no hay cuotas vencidas pendientes, no se genera aviso. No envía correos automáticamente ni cambia pagos. Migraciones remotas `20261120092524_academy_payment_followup` y `20261120092751_academy_payment_review_schedule`; cron activo comprobado.
- Los fallos LIVE de Stripe generan aviso administrativo; se detecta también suscripción activa con última factura abierta e intento fallido. No se alteran calendarios, contratos ni flags: las mensualidades generales siguen desactivadas; esta tarea no modifica el piloto privado.
- Botón de recordatorio con selección del tutor y revisión explícita de efectivo/Stripe. El servidor vuelve a comprobar vínculo, email, vencimiento y saldo. Un aviso por tutor/recibo/día, registro con RLS, reserva transaccional y clave de idempotencia del proveedor. Correo suave con branding y aclaración de no pagar dos veces. Aceptación del proveedor no equivale a entrega en el buzón.
- Pruebas: suites Karen/pagos, Stripe y correos simulados; SQL local con fixtures revertidas (días 2/3/4/7/8, deduplicación, fallos TEST/LIVE, permisos y saldos obsoletos); TypeScript aislado sin errores. Comprobación remota de función en transacción revertida y permisos RPC. Asesor de seguridad sin nuevos avisos: persisten los ya documentados de funciones SECURITY DEFINER, tablas sin políticas y contraseñas filtradas.
- Baseline de esta tarea: 19 pagos anteriores, digest `d6eb9a036aa29d8fe1a96c3328f85151`, excluyendo únicamente el piloto privado preexistente. Los 8 registros adicionales respecto de la auditoría anterior ya existían al empezar esta tarea. Digest conservado tras migraciones y comprobación revertida; ningún correo real enviado ni cobro iniciado.

## Inscripción: efectivo/Stripe y solicitudes conjuntas — 20 noviembre 2026

- Academia sola muestra efectivo y tarjeta con Stripe. El servidor rechaza transferencias (incluidos formularios antiguos) con «Para Academia solo se acepta efectivo o tarjeta con Stripe.», sin exponer el error técnico del enum.
- La casilla explícita de interés en Campus permite una solicitud conjunta con efectivo, tarjeta o transferencia. Se guarda como nueva, identificada «Academia + Campus · pendiente de contacto», con el método solicitado en notas y sin `academy_details` facturables: requiere revisión manual. También se admiten lotes Academia/Campus, incluido un mismo jugador en actividades diferentes; sigue bloqueado duplicar la misma actividad.
- Se conserva la validación de actividad publicada, pertenencia de la ficha y consentimientos. No se modifican RPC, tablas, permisos ni flags de Stripe; no se activan mensualidades ni se cobran solicitudes.
- Verificación: `node scripts/test-enrollment-payment-options.cjs` cubre opciones de UI, error de transferencia, tres métodos conjuntos, revisión manual, duplicados y propiedad con inserciones/correos simulados. Pasan oferta/prorrateo, correo simulado, i18n, TypeScript y build. Lint afectado: sin errores, dos advertencias preexistentes de navegación. No se han realizado pruebas de base de datos ni envíos reales; no se afirma una nueva comprobación del digest ni entrega real de email.

## Formas de pago acordadas y estado mensual — 20 noviembre 2026

Publicación funcional `0103d21`, READY. Navegador real: ficha y listado de jugadores, selector Efectivo/Stripe y cambio de mes (diciembre del piloto muestra Pendiente) verificados. Correo renderizado con CTA y efectivo por WhatsApp; no se envió un correo real. QA sin cambios de acuerdos/pagos: sesiones revocadas y cuenta temporal eliminada. Capturas `auditoria-2026-11-20/ficha-formas-pago.jpg` y `correo-efectivo-stripe.jpg`. Digest histórico final conservado.

Regla actual del propietario: Academia admite efectivo o mensualidades por Stripe; Campus y Torneos, transferencia. Esta sección sustituye las alternativas de transferencia de Academia descritas en entradas anteriores.

- Correos de mensualidades con logo y CTA «Activar pago mensual con tarjeta», alternativa de efectivo por WhatsApp 691 17 96 00, sin IBAN. Correos de aceptación de Academia también corregidos; botón cuando existe solicitud de suscripción lista. Campus y Torneos conservan su IBAN y comprobación del justificante. No se envía un botón de una suscripción aún no preparada.
- Elección en inscripción y alta manual. Campo nullable `agreed_payment_method` separado del método histórico del recibo; sin backfill de datos antiguos. Guardado administrativo validado y atómico. Cash bloqueado mientras haya enlace/contrato LIVE abierto o suscripción pendiente de cerrar. La preferencia no activa Stripe ni acredita dinero.
- Ficha: tarjetas por actividad, selector Efectivo/Stripe para Academia, transferencia en Campus/Torneos y estado del mes seleccionable. Listado y dashboard: método acordado, mes y punto con texto. Verde solo para cuota íntegramente cobrada; parcial, pendiente, bonificado y sin cuota diferenciados. Sin vencidos no se presenta como prueba de mes pagado.
- Migración remota `20261120090827_academy_payment_preferences`, sin actualizar filas históricas. Nuevos recibos de Academia nacen pendientes y sin atribuir un método de cobro efectivo. Plan manual v3 conserva prorrateo, idempotencia y cola de avisos.
- Verificado: SQL local con fixtures revertidas (aceptación, límites prorrateo, alta manual, cambio de método, permisos, rechazo transferencia y suscripción abierta, recibos inalterados); transacción remota revertida con RLS real, alta ficticia, cambios efectivo/Stripe y digest de pagos conservado. 11 pagos históricos: `e9b3ce77d682aabd79e1097a68a22b23`.
- Tests de estados mensuales, correos/preview-envío simulado, notificaciones, gestión, prorrateo, pagos y Stripe; TypeScript, lint sin errores y build. No se han enviado correos reales ni iniciado cobros. No se modifican flags de Stripe; mensualidades LIVE generales siguen desactivadas, piloto privado preexistente intacto.

## Enlace de pago desde ficha y correo de marca — 20 noviembre 2026

Publicado `797ff9e` + `a2ba63c`; versión funcional Vercel `dpl_Dqp3xmMVuuoUPsCDs6rfF3honSqy`, READY. Base comprobada con fetch explícito `b1882d3`. Sin migración ni cambios de flags/pagos.

- Acceso visible «Enviar enlace de pago» junto a «Asignar plan» en la ficha del jugador. Abre el panel con ese jugador seleccionado, enlace de vuelta, selección de tutor, cuotas existentes y preparación del correo. No crea recibos nuevos; requiere plan/cuotas y cuenta del tutor vinculada. Los conceptos que no son mensualidades de Academia siguen por transferencia.
- Correo HTML con logo, azul/dorado, jugador/tutor, cuota mensual, número de cuotas, total, primer/último cobro, alternativa de transferencia y justificante por WhatsApp. CTA unificada: **Activar pago mensual con tarjeta**. El enlace estándar mantiene la revisión/autorización desde la cuenta del tutor y luego Stripe; no se anuncia falsamente un acceso directo sin login. El resultado posterior de Stripe continúa público.
- Vista previa del mismo HTML que enviará el servidor; destinatario y asunto visibles, confirmación integrada y prevención de envío repetido. Cancelación con diálogo de aplicación, sin confirmación nativa bloqueante. Plantilla privada del piloto también actualizada para futuros usos, sin reenviar ni intentar modificar el correo ya recibido.
- El servidor valida vínculo tutor/jugador, correo actual, jugador no archivado y cuotas pendientes sin historial manual, con importes/fechas coincidentes. Cuotas pagadas o modificadas requieren revisión. Escape de contenido en HTML; origen del enlace validado; vista previa limitada a administración/finanzas.
- **Mensualidades LIVE generales siguen desactivadas**: permite preparar/previsualizar, pero no enviar/cobrar. El endpoint también bloquea el envío; no es una mera desactivación visual.
- Verificación: nueva suite `test-payment-request-email.cjs` con proveedor simulado, igualdad preview/envío, doble clic, permisos/origen, flag desactivado, contenido e importes y tutor/cuotas obsoletos. Suites existentes de notificaciones y Stripe, TypeScript, lint afectado y build correctos. Ningún correo real enviado en esta tarea.
- Navegador real: cuenta administradora QA desechable, ficha del jugador ficticio existente, clic en nuevo acceso y jugador preseleccionado verificados. Correo renderizado localmente en móvil 390 px con datos de muestra, sin enviarlo. Vista previa HTTP anónima denegada 403. La cuenta QA y sus sesiones se retiraron, sin cambiar la cuenta del propietario.
- Captura: workspace `auditoria-2026-11-20/enviar-enlace-ficha.jpg`. Se conservan los 11 pagos históricos con digest `e9b3ce77d682aabd79e1097a68a22b23`. No se creó ninguna solicitud de cobro de prueba en producción.

## Retorno de Stripe sin inicio de sesión — 20 noviembre 2026, 09:26 CET

El propietario completó Checkout. La operación fue **autorización de tarjeta**, no un pago confirmado: contrato activo y schedule `sub_sched_1Udn2HGk8vSBcmVddapqXjSu`, suscripción `sub_1Udn2HGk8vSBcmVdBP1LPICl`, recibo de 1 € todavía pendiente. Consulta real de Stripe desde la nueva página: tarjeta autorizada, comienzo 20/11/2026, fin 20/12/2026, `end_behavior=cancel`. Falta acreditar `invoice.paid` y su reflejo en Academy; no se forzó ningún cobro, factura ni conciliación.

Corrección publicada `cdaffed`, Vercel `dpl_A9ga5AUYstVhfzhVcVvFM1wVDuYW`, READY:

- Nuevos Checkout de contratos Academy y solicitudes de mensualidades regresan a `/pago/resultado?session_id={CHECKOUT_SESSION_ID}`, fuera del portal protegido. Los enlaces ya creados conservan su retorno anterior; para este piloto ya completado se entregó al propietario el enlace de resultado de su sesión existente, sin repetir Checkout.
- Resultado consultado en servidor, vinculando sesión persistida, entorno, metadatos, cliente, contrato/schedule e importe. Autorización de tarjeta nunca equivale a cobro. Estados separados de pago confirmado, autorizado, procesando, atención, incompleto, caducado y finalizado. La consulta no escribe datos ni crea/intenta cargos.
- Acceso mediante identificador Stripe de alta entropía; no se acepta un UUID de contrato para consultar sin sesión. Respuesta mínima sin nombres, correos, tarjeta ni documentos financieros. Sin caché, sin indexación y sin referrer. Un identificador desconocido no dispara consultas a Stripe.
- Vista móvil azul/dorada con logo, importe, fin de suscripción, botón de actualizar, advertencia contra duplicar pagos y acceso opcional al portal. Ocho actualizaciones automáticas durante un minuto; después permite volver a consultar sin mantener un sondeo indefinido.
- Verificación: tests Stripe existentes, nueva suite de estados/vinculación/importe/privacidad sin escrituras, TypeScript, lint afectado y build correctos. HTTP anónimo 200 sin redirección, cabeceras privadas/no-referrer/noindex verificadas. Cancelación y sesión desconocida no presentan éxito. Navegador real a 390×844: resultado autorizado y botón de actualizar comprobados; captura guardada en el workspace `auditoria-2026-11-20/resultado-stripe-movil.jpg`.
- Los 11 pagos antiguos conservan `e9b3ce77d682aabd79e1097a68a22b23`. No se activaron mensualidades generales ni se modificó ningún registro financiero.

## Piloto LIVE autorizado por el propietario — 20 noviembre 2026

Nueva autorización expresa: una única suscripción LIVE de **1 € total, un mes, sin matrícula/extras ni renovación**, para `rokecordoba@gmail.com`. No habilita las mensualidades para el resto de familias. `STRIPE_RECURRING_PAYMENTS_ENABLED=false` se conserva.

- Fuente: fetch explícito de main, base `a78c693`; producción comparada `dpl_DZxWXaW25TQ6hChxq9bTfcdRcosJ`. Launcher limitado publicado en `b996471`, Vercel `dpl_9csDZz7eDnRqTULAqT595PgDraXf`, READY.
- Solicitud privada `9afa5f6f-1caf-4b78-89fc-40303eafc607`, creada por backend y aceptada mediante la RPC administrativa real `accept_academy_request`, con la sesión autorizada del propietario. **No es una prueba del formulario público ni de sus precios normales.** Plan inactivo, no publicado, y grupo privado de demostración. Jugador y teléfono son ficticios; la ficha de diciembre no representa entrenamientos reales.
- Jugador `0d5440c7-0b5b-454c-a515-4fe47fdb773e`, matrícula `4b868430-13ba-45e8-8495-07535a6d56bd`, tutor nuevo vinculado a la cuenta existente del propietario. No se cambió su rol ni contraseña. Sesiones administrativas de la comprobación cerradas con alcance local.
- Un recibo nuevo pendiente de 1 €: `ef24d010-287b-4f7d-98e0-cb73ee31872e`. Contrato privado `78b7e771-3b5c-4525-8baa-7dea137bd3e9`, LIVE, mensual, 100 céntimos, cero extras, un mes. Launcher exige administrador y la cuenta concreta del propietario, contrato fijo, origen exacto e importe/duración exactos; no acepta precios o destinatarios del cliente. Anónimo devuelve 403. No activa el catálogo público.
- Stripe aceptó Checkout LIVE `cs_live_cgybqR7iQwNTeIkI3I4hrTYIXTylrdnLonTJiihMuY0jKynfzdVrDUpf5q`, modo **setup**, todavía sin tarjeta ni cargo al preparar el enlace. El webhook existente crea, tras autorización, un schedule de una fase mensual con `end_behavior=cancel`. No se cobra ni se añade tarjeta guardada por parte del agente. La primera factura puede no cobrarse inmediatamente después de guardar la tarjeta.
- Correos realmente recibidos en Gmail INBOX: solicitud `1a1f804dc07e83d1` (Resend `01a1f804-da27-79e1-be9e-d4645eba0830`) y bienvenida `1a1f80702b21e3eb` (Resend `01a1f806-fea1-787c-b1f8-a4ee885892b3`). Bienvenida identificada como prueba, logo azul/dorado, botón directo a Stripe, total y fin explícitos, transferencia e instrucciones WhatsApp. Plantilla reproducible en `scripts/templates/owner-pilot-welcome.cjs`; envío asociado a la fila real de outbox `7bfc5070-139b-44ee-9508-9c58770c2fe7`. No sustituye todavía todas las bienvenidas del producto.
- Verificación: tests Stripe simulados, guardas del piloto, tests de correo, TypeScript, lint de archivos nuevos y build correctos. Logo público HTTP 200. No se certifica una revisión visual de todos los clientes de correo.
- Los **11 pagos anteriores** conservan el digest `e9b3ce77d682aabd79e1097a68a22b23`, excluyendo solo el nuevo jugador autorizado. No se modificaron importes, estados ni vínculos antiguos.

**Pendiente del propietario:** introducir tarjeta y autorizar en Checkout. Después comprobar schedule LIVE finito, factura de 1 € pagada, webhook y recibo en Academy, así como fin automático. Este piloto no acredita renovaciones, impagos, recuperación ni fin de temporada en mayo. No eliminar una factura/cobro real para limpiar la prueba. Retirar el launcher tras completar la validación; conservar la trazabilidad financiera. El plan privado sigue inactivo.

# Pagos — auditoría y diseño de implementación

## Cierre de pruebas de Karen — 19 noviembre 2026, última revisión

**Resultado:** el alta y la edición de nuevas fichas pueden utilizarse. No se declara que absolutamente todos los botones ni todos los proveedores estén certificados. Quedan configuración de negocio, revisión histórica y las limitaciones de comprobación visual indicadas abajo. Esta sección sustituye los pendientes técnicos anteriores que ya constan resueltos aquí.

### Correcciones publicadas

- `1aef473` y `9bfe966`; última versión funcional comprobada en el dominio público: Vercel `dpl_4AnstLYHuzbbr7PirHTbhQ6aw2rV`, READY.
- Alta de jugador, tutor principal y vínculo en una transacción. Reintento con la misma operación devuelve la misma ficha. El hermano reutiliza el tutor sin sobrescribirlo. Bloqueo de duplicados, incluidos archivados, correos ambiguos y fechas futuras. Un fallo no deja tutor/jugador huérfano.
- Edición de jugador y tutor también transaccional; comprueba que el tutor pertenece a la ficha. No cambia por esta vía el correo de un tutor con acceso Auth, para evitar que la ficha y su acceso diverjan. Los errores conservan los datos anteriores.
- Categoría vacía muestra «Por asignar». El botón de edición deja de ocultarse en móvil. Archivo con confirmación integrada y explicación de recuperación; no es una eliminación de historial.
- Grupos y destinatarios por grupo usan una consulta común que incluye el domingo, deduplica y excluye archivados y vinculaciones caducadas/canceladas. No se enviaron mensajes colectivos.
- Las plazas aceptadas de la campaña de Torneos aparecen en ficha, listado y filtros aunque la transferencia esté pendiente. Una solicitud sin aceptar no cuenta como plaza. La campaña deja de contar como vigente después del 3 de enero de 2027; el historial se conserva.
- Cambios explícitos de día/hora del grupo estructurado actualizan sus sesiones futuras automáticas dentro de la vigencia de las matrículas. Se conservan sesiones pasadas. Se bloquea la reprogramación si hay asistencia, modificaciones manuales o agenda antigua sin matrículas vinculadas. No se ha reconstruido ninguna agenda histórica durante esta entrega. El calendario se actualiza; el cambio de horario no envía por sí solo un aviso a las familias.
- Migraciones aplicadas sin backfill: `20261119214731`, `20261119214732`, `20261119215652`, `20261119215654`.

### Evidencia de pruebas

- 41 suites locales iniciales correctas, más la nueva `test-manual-player.sql`: **42 suites** de reglas, pagos, correo, oferta, roles, prorrateo, asistencia, recibos y altas. Suites afectadas repetidas tras los cambios. PostgreSQL aislado UTF8 y rollback; Stripe simulado. TypeScript, lint y build pasan; lint mantiene advertencias del repositorio, no se presenta como libre de advertencias.
- Diez verificaciones conectadas en rollback: alta manual atómica; Campus; reutilización del hijo; cola de correo; Torneos/justificante/ingreso idempotente; oferta pública con ocho límites de prorrateo; alta manual con ocho límites y dos grupos; privacidad de recibos; aforos/Plus; edición y reprogramación de agenda. El digest de pagos fue el original después de cada comprobación. `scripts/test-final-karen-rollback.sql` conserva el último escenario reproducible.
- API real con dos cuentas desechables: alta, reintento, segundo hermano con el mismo tutor, edición, rechazo de dorsal inválido y cambio de correo de acceso, archivo/restauración. La familia solo ve sus dos hijos de prueba, no ve pagos ajenos ni el registro interno de operaciones y tiene denegadas las RPC administrativas.
- Versión publicada: 15 rutas administrativas responden sin error; nueve accesos administrativos quedan denegados al tutor; dos rutas de actividades/inscripción familiar responden correctamente. Son pruebas HTTP de acceso/renderizado, no clics completos de todas sus pantallas.
- Navegador real en producción: login de administrador, alta completa con tutor, edición de categoría y talla y verificación de la ficha persistida. El diálogo nativo antiguo de archivo bloqueó el navegador de automatización. Se reemplazó por el diálogo integrado, pero **queda pendiente repetir visualmente archivo/restauración, sesión familiar y móvil**. Esos estados y permisos se comprobaron por API/SQL. La compilación aislada se retiró al terminar. No se oculta este límite ni se atribuye al usuario un fallo de la aplicación.
- Gmail: se releyeron las cuatro entregas anteriores, todas en INBOX con SPF/DKIM/DMARC correctos: solicitud `1a1f51b4ee76cc03`, confirmación de demostración `1a1f549306caf528`, invitación `1a1f5492ed33aa3d`, recuperación `1a1f54a4113405d5`. No son cuatro nuevos envíos en esta revisión. La confirmación sigue siendo una demostración renderizada sin matrícula financiera persistida; no acredita una aceptación con cobro real de extremo a extremo.
- Asesor de seguridad: no añade avisos para las nuevas funciones SECURITY INVOKER. Siguen las advertencias anteriores sobre funciones SECURITY DEFINER y contraseñas filtradas. No se ampliaron permisos para silenciarlas.

### Limpieza y conservación

Las dos cuentas y los dos jugadores de prueba, su tutor y sus operaciones se eliminaron. Cero usuarios `qa-final-*`/`qa-readiness-*` y cero filas en `manual_player_requests` al cerrar. Los usuarios de comprobación HTTP también se eliminaron. Se retiraron las credenciales temporales y se detuvieron los servidores locales.

| Datos originales | Filas finales | Digest final, igual al inicial |
| --- | ---: | --- |
| Pagos | 11 | `e9b3ce77d682aabd79e1097a68a22b23` |
| Jugadores | 16 | `c360e872784dfe3a6551eb46cf5f0812` |
| Tutores | 21 | `f58812a50087db64a251255b28d0c105` |
| Calendario | 7 | `5353fe35735ab612253526a3872d3d78` |

### Qué falta para cerrar la puesta en marcha

1. **Configuración confirmada por el negocio:** los 12 grupos publicados siguen sin entrenador, aforo ni intervalo de años configurados. No se han inventado. El funcionamiento del entrenador requiere asignarlo al grupo; la validación automática de edad/aforo requiere esos valores.
2. **Histórico, con el propietario:** 16 jugadores sin categoría, cero matrículas operativas de Academia, cinco grupos de correos duplicados y diez tutores sin usuario. Los ocho pagos antiguos de Academia sin concepto/mes requieren revisión. «Sin vencidos» no significa que se hayan generado todas las cuotas. Ningún dato antiguo se ha reasignado ni conciliado por inferencia.
3. **Stripe mensual:** continúa desactivado por instrucción del propietario. No se ejecutaron operaciones Stripe ni cambios de flags en esta revisión. El último ensayo de ciclo TEST sigue bloqueado por `more_permissions_required`; falta verificar alta, renovación, fallo, recuperación y final de mayo antes de habilitarlo. El flag general LIVE preexistente se conserva y no debe confundirse con mensualidades activas.
4. **Validación visual pendiente:** repetir los clics citados al resolver el bloqueo del navegador. No se certifican todos los flujos de documentos, métricas, gamificación, gastos o trabajadores con esta pasada. Las suites prueban sus reglas/permisos donde corresponde; no equivalen a todas las interacciones visuales.
5. **Mejoras restantes:** revisión de la pantalla antigua de solicitudes, persistencia de borradores al cambiar de actividad, limitación de abuso de formularios públicos, revisión individual de avisos de seguridad, catalán de los componentes nuevos y bienvenida animada. Recordatorios y reintentos de correo siguen siendo acciones de administración; no se ha añadido un servicio automático de seguimiento.

Para empezar: Jugadores → Nuevo jugador → ficha y tutor → asignación de actividad y revisión de tarifa. Aceptar una plaza no acredita haber recibido dinero. Las fichas antiguas con advertencias se revisan antes de asignarles cuotas nuevas.

## Corrección solicitada por Karen — 19 noviembre 2026, noche

Esta sección actualiza los pendientes de alta manual, domingo y correo de la auditoría de la tarde. No depura datos anteriores ni activa suscripciones.

- Alta manual: incorporación con fecha completa; 1–7 = 100 %, 8–15 = 75 %, 16–22 = 50 %, 23–fin = 25 %. Misma regla pública; próximas mensualidades el día 1 hasta mayo. Revisión con primera cuota, matrícula/Plus separados, calendario y total antes de confirmar. El plan de dos sesiones exige grupo entre semana y domingo. Bloqueos de edad/aforo, plan obsoleto, solapamiento, matrícula duplicada y pagos históricos ambiguos; reintento idempotente. RPC anterior conservada por compatibilidad, interfaz nueva usa `assign_family_plan_v2`.
- Domingo: ambos grupos forman parte del acceso del entrenador y el calendario familiar. Pase de lista usa una única lista autorizada por sesión; rechaza jugador ajeno y fecha equivocada. Nuevas asignaciones generan solo las sesiones que faltan durante su vigencia; no reconstruyen la agenda de jugadores antiguos ni alteran eventos existentes. Cambios posteriores de horarios siguen requiriendo revisar las sesiones ya generadas; no se migran agendas automáticamente en esta entrega.
- Alta manual: confirmación en la cola al crear la plaza; acceso familiar antes del envío; fallo de correo no aparenta que la asignación falló. La bandeja «Estado de correos» identifica «Alta manual de Academia» y permite reintentos. Sin tutor principal único, se avisa a Karen para revisión; no se infiere destinatario entre duplicados.
- Academia/Campus: el mensaje diferencia invitación enviada, cuenta existente y acceso pendiente de revisión. Instrucciones de transferencia y datos de la plaza dentro del propio correo, con logo azul/dorado; sin depender de abrir una bienvenida externa. La autorización de plaza nunca acredita el pago.
- Pruebas locales: límites de prorrateo, céntimos, extras, segundo grupo obligatorio, grupos invertidos, versión obsoleta, aforo, idempotencia, cola, RLS entrenador/familia, bajas y asistencia. PostgreSQL local UTF8, BEGIN/ROLLBACK. Suites Karen, notificaciones, oferta y eventos correctas. Lint: cero errores, 268 advertencias preexistentes; TypeScript y build correctos.
- Prueba conectada `scripts/test-karen-production-rollback.sql`: ocho límites de prorrateo manual contra esquema/RLS reales, dos grupos, sesiones de domingo, cola única, solapamiento y cuotas hasta mayo. Todo revertido, sin enviar mensajes desde esa transacción.
- Entrega real a Gmail INBOX: confirmación de demostración `1a1f549306caf528` (Resend `01a1f549-2cd6-7cec-95f4-6d7585bf520b`) e invitación `1a1f5492ed33aa3d`, ambas con SPF/DKIM/DMARC correctos. La confirmación usa el renderizador real con datos aislados, claramente marcada PRUEBA, sin inscripción/recibos persistidos. No se presenta como una aceptación financiera real de extremo a extremo.
- Recuperación real recibida: `1a1f54a4113405d5`. Invitación y recuperación consumidas solo para una cuenta QA nueva en alias del buzón autorizado; verificados destino correcto de establecer contraseña, creación/cambio, inicio de sesión por contraseña y revocación global. Cuenta habitual del dueño intacta.
- Stripe: no se han ejecutado operaciones ni modificado configuración. `STRIPE_RECURRING_PAYMENTS_ENABLED=false`; el flag general LIVE ya estaba `true` en el baseline de producción y se conserva, no se activa en esta tarea. No confundir la bandera general preexistente con habilitar las mensualidades.
- Migraciones publicadas: `20261119193027`, `20261119193029`, `20261119193030`. Sin backfill. Revisión del asesor: única nueva función pública SECURITY DEFINER `get_session_players`, intencionalmente limitada a nombre/id, con auth + acceso explícito a la sesión y revocación anónima. Las advertencias anteriores no se ocultan; referencia: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable .
- Baseline preservado: pagos 11 / `e9b3ce77d682aabd79e1097a68a22b23`; jugadores 16 / `c360e872784dfe3a6551eb46cf5f0812`; tutores 21 / `f58812a50087db64a251255b28d0c105`; membresías 0; calendario 7 / `5353fe35735ab612253526a3872d3d78`. Verificados de nuevo tras la limpieza visual final: mismos recuentos y digests; cero cuentas QA de esta tarea.

### Cierre y publicación

- Publicado `6c2f74d` en `dpl_7YwXvwvvuXsbqBkGqWLC4CaXS7GY`, READY, comprobado también desde `www.academycostabrava.com`.
- Prueba conectada adicional en rollback con entrenador y familia QA: acceso al jugador del domingo, lista por sesión, inserción de asistencia, rechazo de fecha incorrecta, calendario/nombre del grupo para su familia, denegación de lista completa a la familia y ausencia de pagos visibles al entrenador. Todo revertido; no se alteró ningún trabajador existente.
- Revisión visual de producción: plan de 140 €, martes + domingo, fecha 23/11/2026 → 35 € (25 %) + 30 € de matrícula = 65 € iniciales; siguientes seis cuotas de 140 €, final mayo, total 905 €. Botón de revisión bloqueado sin domingo. No se pulsó confirmación: la persistencia se verificó en rollback.
- Captura: `auditoria-2026-11-19/alta-manual-prorrateo.jpg` en el workspace del propietario. Ficha y dos cuentas QA eliminadas después de revocar sesiones; PostgreSQL temporal detenido. Configuración temporal y enlaces de autenticación retirados del disco.

## Auditoría funcional integral — 19 noviembre 2026, tarde

Esta revisión complementa la anterior: una ruta HTTP correcta no equivale a haber pulsado todos sus botones. No se certifica todavía el ciclo completo de suscripción ni todas las entregas de correo.

### Evidencia y alcance

- Base comparada mediante fetch explícito de `origin/main`: `820445ac3e7787358cfe7d27abd59ef3573bb191`, producción `dpl_8QRm4nC5o3ZsFCRiS77t5dPFTEKC`. Se trabaja en la copia activa, sin desplegar snapshots históricos.
- Suites Node correctas: `test:karen`, `test:events`, `test:notifications`, `test:offering`, `test:management`, `test:stripe`. Stripe simulado no acredita aceptación del proveedor.
- Quince scripts SQL en PostgreSQL local aislado, con rollback: acceso, asistencia, solicitudes de cobro, separación reserva/pago, checkout y fuentes comerciales, oferta conectada, eventos, planes familiares, duplicados de tutor, cargos, entrenadores, justificantes, repartos manuales y correcciones. No operan sobre pagos reales.
- Siete comprobaciones conectadas en transacciones revertidas: oferta/prorrateo, Campus, reutilización de inscripción, cola de correos, eventos, RLS de recibos y disponibilidad/aforo. Digest verificado tras cada prueba.
- 42 rutas autenticadas sin error de servidor: 28 de administración y 14 de familias. Esto verifica acceso/renderizado HTTP; no es cobertura de todas las interacciones.
- Recorrido visual real: validación del formulario público de Academia; dos grupos y resumen de primera cuota; Campus, pack completo, hermano y talla; acceso/cierre de sesión familiar; hijo existente en Campus/Torneos; limpieza de datos y consentimientos al cambiar de hijo; tarifas y solapamientos de torneos; pagos familiares sin cuotas inventadas.
- Recorrido administrativo real: alta de jugador ficticio, reutilización de tutor existente por email, ficha y accesos de asignación/pagos, cuadro de cobro sin recibos (confirmación bloqueada), búsqueda y revisión de solicitud, inscripción administrativa de Campus con tutor precargado, finanzas/gastos y validación obligatoria. No se confirmó un cobro desde la interfaz ni se creó un trabajador real.
- Edición real de las descripciones de los planes de 75/140 € desde Gestión de Academia: se sustituye el texto antiguo «mes parcial sujeto a revisión/sin prorrateo» por los cuatro tramos confirmados. Comprobado en la landing pública. Importes y condiciones económicas existentes intactos.

### Solicitud, correo y cobro de demostración

- POST real `/api/enrollment`, solicitud `ce069ff5-22d0-4f5c-9e07-b97aa5dc5df0`, identificada expresamente como PRUEBA AUDITORÍA. Correo autorizado a `rokecordoba@gmail.com`.
- Entrega real comprobada en Gmail INBOX: mensaje `1a1f51b4ee76cc03`, 19/11/2026 18:39:29 UTC, proveedor `01a1f51b-4b0b-7ba9-b9e7-b050ad0d3d4e`. SPF, DKIM y DMARC correctos. HTML con logo, azul/dorado y selección de Academia; informa de solicitud recibida y de que todavía no hay plaza ni cobro confirmado. No exige entrar al portal para leer esos datos.
- La misma solicitud se aceptó dentro de BEGIN/ROLLBACK: vínculo jugador–tutor, membresía, primera cuota del 25 % de 75 € = 18,75 €, registro de transferencia ficticia e idempotencia al repetir aceptación/cobro. Todo revertido; la prueba no ingresó dinero. La matrícula de 30 € es un concepto separado: el presupuesto inicial de la solicitud era 48,75 €.
- Esta entrega verifica el correo de solicitud recibida. Las plantillas/colas de aceptación y acceso se probaron en código y rollback; no se afirma recepción real de esos otros mensajes ni establecimiento real de contraseña en esta auditoría.
- Stripe TEST real: diagnóstico `98c595d0-705b-43d9-b379-f50dac4172d5`, operación `create_test_clock`, rechazado por `StripePermissionError / more_permissions_required`. No se creó reloj, cliente ni suscripción. Falta habilitar permisos TEST y repetir alta, renovación, fallo, recuperación y fin en mayo. No se activó LIVE.

### Correcciones pequeñas incluidas

- Dashboard: «Jugadores registrados» muestra las fichas existentes y distingue en el subtítulo cuántos tienen plaza vigente/próxima; cero vinculaciones ya no aparenta cero jugadores registrados.
- Inscripción: transferencia seleccionada inicialmente; mensualidades con tarjeta identificadas como petición pendiente de activación mientras la configuración no permita cobros recurrentes. No se promete un cargo automático habilitado.
- Ficha/pagos: «asignar plan para crear cuotas pendientes» sustituye la afirmación equívoca de generar una suscripción.
- Buscador global: se corrige el filtrado adicional de resultados remotos que ocultaba jugadores existentes; resultados con identidad explícita, control de respuestas obsoletas, exclusión de archivados y título accesible del diálogo. Accesos de solicitudes/gestión actualizados al menú nuevo. La búsqueda de la tabla por tutor también se verificó.

### Pendientes priorizados: no son solo Stripe

1. **P1 — Domingo en asistencia/calendario.** La aceptación guarda ambos grupos en `academy_group_assignments`, pero el pase de lista (`coach/session/[id]`) filtra por `children.team_id`. Hay que integrar el grupo secundario en permisos, convocatorias, calendario y asistencia y probarlo con un entrenador de cada grupo.
2. **P1 — Alta manual coherente.** El asignador manual mantiene meses completos y pide crear el primer mes parcial aparte. Unificarlo con el prorrateo de solicitudes y con la elección explícita de ambos grupos; actualmente Karen puede obtener resultados distintos según la entrada utilizada.
3. **P1 — Depuración histórica supervisada.** Antes de los fixtures de esta auditoría: 16 fichas (incluye demo antiguo) sin vinculación operativa, categorías por asignar, 5 grupos de correos de tutor duplicados y 10 tutores sin usuario Auth asociado. No asignar actividad, fusionar tutores ni crear cuentas por inferencia. Revisar con el negocio jugador por jugador.
4. **P1 — Suscripciones y correos completos.** Resolver el bloqueo de permisos TEST y verificar el ciclo real; completar recepción de aceptación, acceso familiar y recuperación, además del correo de solicitud ya entregado. No basta con que el proveedor acepte el envío.
5. **P2 — Simplificación pendiente.** Revisar una solicitud de Academia sigue abriendo la pantalla antigua de leads y consultas, con ruido comercial. Cambiar de Academia a Campus/Torneos desde el formulario general abandona el borrador. Separar las entradas con claridad o preservar los datos.
6. **P2 — Configuración de negocio.** Aforos y años de grupos no definidos en todas las fichas; discrepancia de viernes entre PDF y web registrada en la sección previa; distinguir el teléfono general 654139429 del de justificantes 691179600. Confirmar propósito, no sustituir números sin criterio.
7. **P2 — Idiomas y bienvenida.** Los nuevos componentes de selección/actividades contienen texto español fijo; completar catalán. El correo transaccional auditado es estático con marca, no la animación GIF/sobre planteada anteriormente.
8. **P2 — Seguridad preventiva.** Asesor de salud sin incidencias. Persisten avisos SECURITY DEFINER anónimos (perfil público por token y pedido de tienda) y funciones autenticadas que requieren revisión individual de permisos; no todos implican exposición. Protección de contraseñas filtradas desactivada. Añadir limitación de abuso a formularios públicos; honeypot y límites de la cola no equivalen a rate limiting de solicitudes. No se han ampliado permisos para resolver avisos.

### Integridad y validación final

- Baseline financiero: 11 pagos, digest `e9b3ce77d682aabd79e1097a68a22b23`. Conservado en todas las comprobaciones conectadas y después de editar textos de oferta.
- TypeScript, build, suites de oferta/gestión y catálogo conectado correctos tras los cambios; lint completo sin errores (273 advertencias acumuladas, seis en payments-list).
- Publicación verificada: `23d3df2` en `dpl_EUrdbBjy7AhXzMFC8p5BxKZprUS6`, seguida del buscador `ba6f100` en `dpl_EnaEndckogu9t9o6fk5G6maVyyRz`, ambas READY con el dominio público. Contador y disponibilidad de pagos observados en producción.
- Ajuste final del buscador publicado en `7e9f2bf` / `dpl_CcBrNcMjHp4PipmiZkuZNkqdYqyU`, READY y dominio asignado. Verificado visualmente: encuentra los dos jugadores QA, abre la ficha y ya no muestra «sin resultados» junto a los resultados.
- Limpieza completada: sesiones QA revocadas globalmente; eliminados los dos usuarios temporales, dos jugadores ficticios, tutor de prueba y solicitud/outbox etiquetados. Consulta final: cero fixtures de esos IDs y los 11 pagos con el digest original. Se conserva el demo histórico y el correo efectivamente recibido en Gmail. PostgreSQL local de esta auditoría detenido.
- Captura del dashboard durante la prueba: `auditoria-2026-11-19/dashboard.jpg` en el workspace del propietario; muestra 18 fichas porque incluye los dos jugadores QA ya eliminados. Captura adicional `buscador.jpg`.


## Dashboard visual y portal de actividades — 19 noviembre 2026

- Inicio administrativo con marca azul marino/dorado, tarjetas de plazas únicas, solicitudes, vencimientos y cobrado; buscador de jugador/tutor, filtros por actividad y categoría, próximos pasos y resumen de gastos. El selector mensual cambia el resumen económico; no reconstruye un balance histórico de deuda (usa saldos actuales con corte de vencimiento).
- Navegación principal reducida a Inicio, Jugadores, Solicitudes, Gestión de Academia, Cobros y finanzas y Trabajadores. Las herramientas anteriores siguen disponibles en «Más herramientas»; archivo/restauración conservados en Jugadores → Archivo y herramientas.
- Bandeja única de solicitudes con accesos a la revisión existente de cada rama. Aceptar no marca pagos como cobrados. Justificantes y «esperando pago» de esta bandeja corresponden a Torneos; los recibos aceptados de Academia/Campus se gestionan en Finanzas.
- La ficha del jugador abre en información general y acerca la asignación de plan, Campus, equipos de Torneos y pagos. Alta manual pide nombre/correo/teléfono del tutor y reutiliza su ficha por correo, sin sobrescribirla. Después dirige a elegir actividad. **El asignador manual de planes sigue siendo el anterior de meses completos**; se explicita el primer mes parcial por separado. El prorrateo automático acordado pertenece al flujo de solicitud/aceptación de Academia, no se ha reescrito la contabilidad manual.
- Portal «Mis actividades»: ofrece Academia, Campus y Torneos; muestra inscripciones y solicitudes enviadas con una cuenta verificada. Campus reutiliza hijo, tutor y contacto, y pide nuevas autorizaciones. Cambiar de hijo limpia campos y consentimientos. El servidor valida propiedad del hijo, normaliza identidad/email y rechaza una solicitud existente; las solicitudes públicas antiguas no se atribuyen retroactivamente por coincidencia de correo.
- Comprobación visual interactiva de componentes reales con datos ficticios: escritorio/móvil, búsqueda por tutor, filtro Campus y justificantes. Lectura real del loader: 16 jugadores, 12 solicitudes, relaciones correctas y proyección sin datos médicos. Pruebas simuladas de saldos parciales, abonos anulados, céntimos, cuotas futuras, fechas ausentes, propiedad del hijo, duplicados, versión obsoleta y origen ajeno. No envían correos ni crean pagos.
- Sin cambios de esquema, registros de pago, acceso de trabajadores ni activación Stripe LIVE. Siguen pendientes los ensayos completos del proveedor, entrega efectiva de correos a buzón y las revisiones históricas indicadas abajo. Publicado código `7ad9350` en `dpl_FMWv3dpVBjh28ydk4wRZ3bWAHMBh` (READY), con dominio `www.academycostabrava.com`. Quince rutas administrativas HTTP 200 con administrador; nueve accesos administrativos rechazados a familia; portal de actividades y formulario Campus HTTP 200 con familia autenticada. Cuatro rutas públicas verificadas. Cuenta temporal revocada/eliminada, cero cuentas QA restantes. Los 11 pagos conservan el digest `e9b3ce77d682aabd79e1097a68a22b23`. TypeScript, build, lint sin errores y suites `test:karen`, `test:events`, `test:notifications`, `test:offering` y `test:management` correctas.

## Gestión conectada — 19 noviembre 2026

### Oferta publicada y solicitud

- Gestión de Academia (`/admin/gestion`) reúne Academia, Campus y Torneos. Cada rama separa **oferta/horarios**, **solicitudes** y **participantes**; Finanzas conserva el registro de cobros.
- Academia: 12 grupos recuperados de web y dossier, incluidos porteros y domingos; los dos planes vigentes (75/140 €), matrícula de 30 € para nuevos jugadores y Plus anual opcional de 50 €. Los viernes conservan 17:30–19:00, horario web previamente confirmado; el PDF original dice 17:00–18:30. El PDF es un documento estático y no se regenera al editar el gestor. No se inventan aforos ni años exactos de cada categoría: se dejan pendientes en las fichas de grupos y secretaría comprueba edad/nivel.
- Fuente de Academia: `teams` y `membership_plans`, también utilizados por la operativa. Campus: programa estructurado en la misma edición de `campuses`. Torneos de Navidad: programa y precios en `event_campaign_settings`. Las páginas públicas y los formularios leen estas fuentes; el formulario rechaza una versión que haya cambiado antes de enviarse.
- Campus Navidad 2026–2027 publicado con las fechas, semanas, horarios, porteros, nacidos 2013–2022 y tarifas facilitados. Nuevas ediciones con programa se crean desde Gestión; las ediciones antiguas se conservan. El descuento de hermano sigue requiriendo comprobación administrativa.
- Academia guarda la selección de plan, grupo, domingo adicional, fecha de incorporación, Plus y forma de pago en un snapshot calculado en servidor. Campus guarda programa/precio solicitado; Torneos conserva su catálogo solicitado para revisar precios sin sustituirlos por tarifas futuras. Los textos editoriales generales, fotografías y PDF no forman parte de este editor de oferta.

### Familia, aceptación y pagos

1. La familia consulta la oferta, elige y envía. Academia y Campus no exigen cuenta previa. Torneos conserva la verificación de correo existente para vincular con seguridad jugador/documentación; por tanto, el acceso inicial todavía no es idéntico en las tres ramas.
2. Correo de **solicitud recibida**, sin afirmar plaza ni cobro. Administración ve la selección concreta.
3. Aceptar Academia crea/reutiliza jugador y tutor, asigna grupo principal, conserva ambos grupos si hay domingo, crea membresía y recibos pendientes en una transacción. Reintentar no duplica recibos. Duplicados de tutor/jugador, solapamientos o cuotas históricas ambiguas bloquean la aceptación.
4. Primera cuota confirmada por el propietario: días **1–7 = 100 %; 8–15 = 75 %; 16–22 = 50 %; 23–fin = 25 %**. Se redondea a céntimos. Las cuotas siguientes vencen el día 1 y terminan en mayo; el día 5 es el límite operativo de seguimiento, no un segundo cobro. Matrícula y Plus separados, sin repetirlos cuando ya constan.
5. La aceptación solicita el acceso familiar: reutiliza una cuenta cuyo email ya está verificado o envía invitación para crear contraseña. Nunca envía contraseña ni restablece la de una cuenta existente. Errores se comunican al administrador y requieren revisión/reintento del acceso; no se deshace una plaza ya aceptada.
6. Correo de **plaza aceptada** con jugador, elección y siguientes pasos. Campus/Torneos: transferencia, importe revisado y WhatsApp 691 17 96 00. Academia: primer pago/matrícula/Plus por transferencia; si se solicitan mensualidades, se prepara la autorización finita sobre recibos futuros cuando el proveedor esté habilitado. Aprobar, invitar y autorizar tarjeta no registran ingresos.
7. Stripe queda reservado a suscripciones de mensualidades de Academia. Nuevos cobros únicos por tarjeta, Campus, Torneos y adaptador antiguo quedan cerrados; se mantienen webhooks y cancelaciones para reconciliar intentos anteriores. No se modifica el histórico ni se cancelan contratos reales automáticamente.

### Comprobaciones y pendientes reales

- Publicado código `b8f23c0` en `dpl_BmqLmvqBd2u1pQfo5f3nm1hBFrG9`, estado READY y dominio `www.academycostabrava.com`. Doce rutas administrativas, incluidos los cuatro accesos de Gestión, responden correctamente con administrador; siete accesos administrativos rechazados a familia. Cuenta QA revocada/eliminada. Comprobaciones HTTP/servidor, sin revisión visual interactiva en esta entrega (navegador no disponible).
- Migración `20261119165354_connected_business_offering`: aditiva salvo admitir aforo pendiente (`NULL`) en grupos. RLS administrativa para asignaciones de grupos; función de vinculación Auth solo servidor. Snapshots de precio protegidos frente a escrituras públicas.
- Refuerzo `20261119170735_protect_campus_quote_and_status_updates`: protege también `campus_details` frente a escritura directa pública, sin impedir cambios autorizados que conservan las condiciones. Probado localmente y con ROLLBACK conectado; 11 pagos y digest `e9b3ce77d682aabd79e1097a68a22b23` intactos después de la verificación final. No se enviaron correos ni se hicieron cargos de prueba.
- Tests de cálculo (ocho límites de tramo, céntimos, mayo sin junio, versiones, precios de Campus/Torneos), PostgreSQL local y prueba conectada con ROLLBACK: membresía, dos grupos, recibos, idempotencia, rechazo de precio falsificado y conservación íntegra de pagos existentes. Lectura real del catálogo: 12 grupos, 2 planes, 1 campus y 3 torneos.
- Pruebas de correos personalizados: abonos parciales/vencidos, exclusión de mensualidades futuras del primer pago, activación de tarjeta pendiente y solicitudes cuyo estado ya cambió; solo simuladas, sin red. Formularios y landing de Academia/Campus/Torneos comprobados por HTTP, con horario/tarifa publicados.
- TypeScript, lint sin errores, compilación y suites anteriores de pagos, familias, actividades, correo y Stripe simulado correctas. Estas pruebas no acreditan entrega de correo al buzón ni cobro de tarjeta.
- **Mensualidades LIVE todavía desactivadas**: sigue pendiente el ciclo completo TEST (primera cuota, siguiente, fallo y finalización); el último diagnóstico del proveedor rechazó la creación de Test Clock por permisos de clave. La solicitud puede guardar la preferencia de tarjeta, pero el correo explica que no hay cobro automático aún. No afirmar que solo queda cambiar un interruptor.
- **Histórico por revisar**: 16 jugadores sin vinculaciones operativas antes de esta entrega; 21 tutores con cinco grupos de correos duplicados, diez sin cuenta y dos contactos incompletos. Ocho recibos antiguos de cuatro jugadores carecen de mes/concepto suficiente. No se infieren datos ni se asignan nuevas cuotas a esas familias.
- **Operativa de segundo grupo**: se guardan ambos vínculos y se incluyen en el listado administrativo de grupos. Las pantallas heredadas de entrenadores, asistencia y calendario que dependen de `children.team_id` necesitan una revisión separada antes de afirmar cobertura completa del segundo grupo. El horario de la oferta no genera automáticamente sesiones de calendario ni envía avisos de cambio a familias ya inscritas.
- **Ediciones antiguas y torneos nuevos fuera de campaña** conservan sus gestores operativos; la automatización de alta completa descrita corresponde a las nuevas solicitudes de Academia y los programas/formularios específicos conectados en esta entrega. Solicitudes antiguas sin elección estructurada requieren revisión manual.
- Seguridad: sin avisos nuevos para los objetos de esta entrega. Persisten avisos anteriores de funciones públicas, compartición y Auth; véanse [RPC públicas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) y [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se cambiaron cuentas de trabajadores ni políticas del proveedor.

## Recibos para familias y organización mensual — 19 noviembre 2026

- El propietario confirma que quiere recibos para las familias y una administración clara por meses. Sustituye el requisito anterior de implementar facturación fiscal en esta entrega.
- Descarga privada de PDF desde el historial de cada familia y filtro por mes cubierto/vencimiento. Los pagos guardados son la fuente del recibo, generado bajo demanda: no se crea un archivo fiscal inmutable ni se envía automáticamente. Incluye estado, importes, abonos, anulaciones e indicación de IVA incluido, sin aumentar precios.
- La consulta familiar usa RLS. Para tienda, se comprueba el correo confirmado de Auth contra el comprador del pedido antes de leer el recibo con privilegios de servidor. No se amplían políticas ni se ofrece acceso de servicio a recibos de otros jugadores.
- Finanzas → Recibos del mes incluye todas las procedencias, incluso cargos sin matrícula/plan: academia, campus, torneos, tienda y otros. Selector mensual, búsqueda, filtros de procedencia/estado, abonado y pendiente por recibo, descarga PDF y exportación CSV del filtro. Paginación de lectura para no truncar meses con más de 500 recibos. La vista general distingue dinero recibido durante el mes de recibos que vencen ese mes.
- Pruebas: propiedad, acceso denegado, comprador confirmado/no confirmado, parcial/anulado/Stripe, consulta de todas las procedencias, paginación y errores. RLS conectada con fixtures y ROLLBACK demuestra aislamiento entre familias y pérdida de acceso al retirar el vínculo. TypeScript, lint, suites financieras/familiares, i18n y build correctos; PDF inspeccionado visualmente. Navegador con cuenta QA y respuestas sintéticas verifica filtros, CSV, escritorio y móvil; las consultas reales de lectura también responden correctamente.
- No se crean ni modifican pagos reales. Digest comprobado: 11 pagos, `e9b3ce77d682aabd79e1097a68a22b23`. Cuentas temporales revocadas y eliminadas. Las limitaciones del proveedor Stripe y la falta de prueba de recepción real de correo descritas abajo siguen vigentes.

## Solicitudes de cobro desde administración — 19 noviembre 2026

- Nuevo flujo `/admin/finanzas/solicitudes`: crear recibos mediante el editor existente, seleccionar tutor y recibos, preparar pago único o mensualidades finitas y compartir enlace por correo/copia/WhatsApp. Visible también en pagos de cada jugador y en el portal del tutor designado. Manual: `docs/ADMIN-BILLING.md`.
- No se usa el adaptador antiguo que sustituye recibos: las solicitudes nuevas conservan importes, descuentos, vencimientos y referencias de los recibos seleccionados. Cobro transaccional sobre esos recibos solamente tras confirmación válida. No hay backfill ni cambios en pagos existentes.
- Nuevas tablas con RLS y RPC de escritura exclusivas de service_role. Tutor exacto y vínculo con el jugador comprobados en servidor/base, protección contra origen externo, total alterado, cobro duplicado y solapamiento con otro Checkout/abono manual. Bloqueos ordenados y cancelación en dos fases.
- Suscripción: autorización de tarjeta en Checkout setup; primera cuota en el primer vencimiento, mensualidades iguales/consecutivas, fin automático. Matrícula/extras independientes. La aceptación no se contabiliza como pago. Cancelar no borra recibos ni produce devolución automática.
- Migraciones aditivas aplicadas: `20261119100055_admin_billing_requests`, `20261119102115_billing_request_lock_order`. Asesor de seguridad sin nuevos avisos para estos objetos; permanecen los avisos anteriores.
- Pruebas locales: PostgreSQL 17 desechable con rollback (propiedad, RLS, snapshot, duplicados, modo TEST, bloqueos), SDK Stripe simulado, TypeScript, lint y build Preview. Pruebas conectadas: acceso admin, rechazo anónimo/familia/origen ajeno; tutor ajeno no abre ni acepta; pago único y suscripción crean/reutilizan/caducan Checkout TEST sin tarjeta. Resend acepta el correo al buzón oficial `delivered@resend.dev`, reenvío idempotente; no demuestra bandeja real.
- Reloj TEST: tres intentos, incluido uno posterior a que el usuario comunicase activar el permiso, rechazados en `create_test_clock` con `StripePermissionError / more_permissions_required`. No se ha validado todavía primera factura, siguiente cuota, fallo y fin en el proveedor. La ruta de diagnóstico requiere admin y Preview, y devuelve 404 en Production. No se han cambiado los flags de ventas: pago único LIVE conserva la activación previa; mensualidades LIVE siguen desactivadas.
- Fixtures y cuentas QA eliminados, sesiones revocadas. El histórico se compara antes/después de cada prueba conectada; 11 pagos existentes conservados. No se ha realizado ningún cargo real.
- Publicado y verificado: commit `1eac1ab`, despliegue `dpl_H4wc2MjmHGUkvTAN1yuonxSDQSwn`, dominio `www.academycostabrava.com`. API administrativa devuelve `cardEnabled=true`, `recurringEnabled=false`, `emailConfigured=true`. En producción se comprueba creación/reintento/cancelación de ambas solicitudes con fixtures, sin abrir Checkout LIVE. Listado con recibos/tutor, pantalla del tutor y rechazo de otra familia correctos. Ocho rutas administrativas 200, familia rechazada de finanzas; diagnóstico Test Clock 404 en Production. Digest final de los 11 pagos: `e9b3ce77d682aabd79e1097a68a22b23`; cero solicitudes/cuentas QA residuales. Build local y suites `test:karen`, `test:payments`, `test:stripe` correctos.

Esta sección añade el flujo administrativo; no afirma que las mensualidades LIVE ni la facturación fiscal estén listas. El permiso pendiente corresponde a la clave TEST desplegada en Preview.

## Titular, IVA y muestras — 19 noviembre 2026

- Titular y NIF facilitados por el propietario guardados en los ajustes de producción (sin duplicar sus identificadores en este repositorio). Nombre comercial: Academy Costa Brava. El propietario indica no añadir dirección; permanece vacía.
- Tipo confirmado por el propietario: 21 % siempre incluido en el precio final. `invoice_tax_rate=21`, `prices_include_vat=true`. No se añade IVA a los importes actuales ni se alteran pagos existentes. Aviso público en español, catalán e inglés.
- Tres muestras a la dirección personal confirmada: confirmación de correo, recuperación y recepción de solicitud. Resend aceptó los tres mensajes; consulta del estado de entrega devuelve 401 con esta clave. No se ha confirmado recepción en bandeja, ni completado un alta o una recuperación real. IDs de proveedor: `01a1f350-5eee-71db-8388-73c280c67fa1`, `01a1f350-5eee-720f-b90f-f009f0bfb3e7`, `01a1f350-5eee-713f-b0cc-22987d07baa3`.
- La facturación fiscal automática y el archivo mensual por familia NO están implementados. El PDF actual se genera bajo demanda y es un comprobante informativo, accesible a los roles de finanzas; no es una factura fiscal. Las familias ven pagos y administración dispone de finanzas por mes y resumen por jugador/mes. No confundir eventos `invoice.paid` de Stripe con un archivo de facturas fiscales en Academy.
- Para completar el flujo que pide el propietario faltan emisión/numeración fiscal, desglose de impuestos, datos fiscales de emisor/destinatario, conservación del documento emitido, acceso de cada familia y vista de facturas por mes para administración. La dirección del emisor sigue siendo un dato necesario para factura completa, aunque no se publique en la web. Referencia: https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/folleto-actividades-economicas/5-impuesto-sobre-valor-anadido/5_10-facturas/5_10_2-requisitos.html

## Decisiones de entrega — 19 noviembre 2026, posteriores a la prueba de webhook

El propietario confirma remitente `info@academycostabrava.com`, respuesta/contacto `costabravaacademy@gmail.com`, campus sin límite de plazas, Plus opcional de 50 € en un pago anual y ausencia de tarifa de pago anual completo. Se conserva la cuota de 75 €/mes y el plan existente de dos sesiones de 140 €/mes. No se crean ni modifican recibos existentes.

- Petición expresa nueva de activar cobros LIVE: configurados `STRIPE_LIVE_PAYMENTS_ENABLED=true` y `STRIPE_RECURRING_PAYMENTS_ENABLED=false` en Production. El pago es por recibo aprobado; las suscripciones automáticas siguen pendientes de fechas de temporada y prueba completa con Test Clock. No se ha realizado un cargo real.
- Activación comprobada en producción: commit `46032a7`, despliegue `dpl_25LpTzQmw1ZrKLGKwfWofpT62fyA`, dominio `www.academycostabrava.com`. `payment_card_enabled=true`; diagnóstico autenticado muestra «Pagos con tarjeta activados» y suscripciones pendientes. La clave restringida sigue sin acreditar `charges_enabled`; no confundir los interruptores habilitados y API disponible con un cargo completo aceptado por Stripe.
- Verificación posterior: ocho rutas administrativas 200; familia sin acceso a dashboard/finanzas/inscripciones; páginas públicas 200 y camping 404. Plus anual presente en HTML publicado. QA revocado y eliminado (0 cuentas residuales); 11 pagos con el mismo digest.
- Migración `20261119100957_campus_unlimited_capacity`: opción explícita `capacity_unlimited`; cero sin esa opción sigue significando capacidad no confirmada. El campus de Navidad está configurado sin límite y conserva estado borrador; abrirlo es una acción administrativa independiente.
- Plus se selecciona como 0/50 en nuevas asignaciones y se crea una sola vez; la base impide duplicarlo en la misma temporada (o periodo anual para planes sin temporada). No se asignan planes a alumnos existentes.
- Seguridad: el propietario mantiene el plan actual, sin contratar Pro ni cambiar los controles. Persisten las observaciones anteriores de Auth/RPC; no equivale a una auditoría cerrada. El trigger de aforo conserva sus permisos revocados a clientes.
- Pruebas locales de pagos, familias, Stripe simulado, notificaciones, actividades e i18n superadas. TypeScript, lint (advertencias preexistentes, cero errores) y build correctos. Pruebas SQL `test-delivery-readiness.sql` y `test-season-readiness.sql` con ROLLBACK verifican aforo limitado/ilimitado, Plus anual sin duplicados, tarifa mensual y fin de temporada.
- Integridad comprobada tras pruebas: 11 pagos, digest `e9b3ce77d682aabd79e1097a68a22b23` sin cambios.
- Muestras de correo solicitadas: dirección escrita con `.con`; pendiente confirmar destinatario antes de enviar. Muestras no equivalen a un alta/recuperación completa ni a recepción en bandeja. Datos del titular para aviso legal siguen pendientes.

Esta sección sustituye las decisiones de negocio y autorización de activación previas; la evidencia del webhook sin cobro y los límites de prueba siguen vigentes.

## Estado más reciente — 19 noviembre 2026

Credenciales LIVE y webhook guardados en Vercel Production; lectura y creación/caducidad de Checkout verificadas. Prueba real de entrega sin cobro superada: `checkout.session.expired`, evento `evt_1UdS3bGk8vSBcmVd9xHkmJys`, recibido y firmado correctamente el 19/11/2026 a las 09:55:08 UTC. No acredita un cobro completo ni el ciclo de suscripción. Los nuevos pagos con tarjeta y las mensualidades automáticas siguen desactivados. La clave restringida no permite consultar el estado de activación de la cuenta Stripe. Los 11 pagos existentes mantienen el digest `e9b3ce77d682aabd79e1097a68a22b23`; usuario QA eliminado y sesión revocada. Esta actualización sustituye las afirmaciones antiguas sobre ausencia de credenciales/entrega LIVE, no los pendientes de negocio y seguridad siguientes.

## Cierre operativo — 18 noviembre 2026, segunda revisión

- Catálogo cargado desde el dossier: una sesión semanal 75 €/mes, dos sesiones 140 €/mes, matrícula 30 € solo nuevos jugadores. Temporada 15/09/2026–31/05/2027. Se respeta el horario web confirmado por el dueño: 17:30–19:00.
- Planes de temporada fija: las altas tardías generan solo meses completos restantes hasta mayo, no nueve meses desde cualquier fecha. Septiembre parcial queda fuera de automatización, sin inventar prorrateo. No se han asignado planes ni generado recibos para alumnos existentes.
- Modalidades online del nuevo catálogo desactivadas. La tarifa anual total y la periodicidad del Plus +50 € no aparecen definidas; no se inventan. El asistente permite un extra individual único expresamente acordado, por defecto 0.
- Contactos, temporada y cuenta bancaria confirmados cargados en ajustes. No se presupone que el titular bancario sea la identidad fiscal de la empresa.
- Corregido `ON CONFLICT(key)` de ajustes: el índice parcial anterior no era compatible con el upsert de PostgREST. Índice único normal, mantiene múltiples NULL del legado; no se cambia contenido histórico.
- Campus Navidad preparado como borrador: fechas, horario, ubicación y tarifas por semanas/pack. Aforo 0 significa pendiente; no se puede publicar con aforo 0. Eliminado el valor 30 inventado por defecto en el editor.
- SMTP de Auth comprobado: `smtp.resend.com`, remitente `info@academycostabrava.com`; confirmación de correo requerida. OTP reducido de 86400 a 1800 segundos y verificado por lectura posterior. La protección de contraseñas filtradas devuelve HTTP 402: exige Supabase Pro. No se contrata ningún plan.
- Migraciones: `20261118182118_academy_season_readiness`, `20261118182158_settings_upsert_key`. Datos confirmados reproducibles con `scripts/seed-confirmed-2026-27.sql` (idempotente, no sobrescribe ajustes existentes no vacíos).
- Prueba conectada `scripts/test-season-readiness.sql` con ROLLBACK: noviembre→mayo, 7 cuotas de 75 € + matrícula 30 €, total 555 €, reintento sin duplicados, rechazo de septiembre parcial/junio, rechazo no-admin, upsert y bloqueo de campus sin aforo. También repetidas las pruebas SQL de actividades, campus, reutilización de hijos y cola de correo.
- TypeScript, ESLint, build y suites `test:karen`, `test:events`, `test:stripe`, `test:notifications`, actividades e i18n: correctas. Las pruebas Stripe con SDK simulado NO acreditan el ciclo completo del proveedor.
- Integridad: 11 pagos, digest `e9b3ce77d682aabd79e1097a68a22b23`, igual al inicio. Stripe Production sigue sin claves ni activación. No se crea cuenta de trabajador.

Pendientes reales: aforo; identidad fiscal/NIF/dirección; buzón controlado para probar alta y recuperación con recepción real; decisión sobre Supabase Pro; periodicidad del Plus y cualquier tarifa de pago anual que se quiera ofrecer. Stripe TEST aún necesita prueba completa de primera factura, siguiente cuota, fallo y fin con Test Clock, y diseño de fechas para el catálogo de temporada fija antes de permitir suscripciones. Las claves Preview existentes son sensibles/no recuperables por la API de Vercel; no se copian a producción ni se muestran.

Esta sección sustituye los pendientes desactualizados de las auditorías históricas siguientes.

Comprobación posterior al despliegue `dpl_3wuZjsav1EtVL623TY8L4sjjVBip` (commit `4ec2190`): dominios Academy apuntando a la nueva versión; academia/torneos/formulario campus HTTP 200, camping 404 y webhook LIVE 503 por estar desactivado. Ocho rutas administrativas devuelven 200 con usuario QA autenticado; la misma cuenta como familia no accede a dashboard/finanzas/inscripciones de torneos. Usuario temporal eliminado. Diagnóstico en Preview: lectura Stripe TEST de Checkout y recursos de suscripción correcta. No se confirmó ninguna factura. El plugin Stripe está disponible y se ha sugerido conectarlo para continuar en TEST, todavía no conectado. Digest final de los 11 pagos: sin cambios; no quedan cuentas QA de estas pruebas.

## Recuperación del 18 de noviembre de 2026

La publicación anterior procedía de una copia local antigua. Se ha recuperado `origin/main` (9204450), conservando la gestión completa de torneos/campus, formularios, planes familiares y traducciones, además de la muestra de bienvenida de la copia publicada. Camping no forma parte de Academy.

Las tres fichas antiguas de Navidad se redirigen a la campaña completa y no se duplican como «Próximamente». No se eliminan sus registros ni su historial administrativo. `/camping` devuelve 404 y no figura en navegación/sitemap.

- Pruebas actuales: `test:karen`, `test:events`, `test:stripe`, `test:notifications`, `test-admin-activities.cjs`, `test-i18n.cjs`, TypeScript, ESLint sin errores y build correcto. Auditoría npm de dependencias de producción: 0 vulnerabilidades.
- Pruebas en la base conectada, todas dentro de BEGIN/ROLLBACK y con datos ficticios: solicitudes de torneos, reutilización de hijos, gestión administrativa, asignación de campus y nueva cola de correos. No se envían emails desde SQL. Se comprueba el digest de los 11 pagos existentes antes/después: sin cambios.
- Nueva cola privada de notificaciones transaccionales y panel `/admin/actividades/correos`. Solo administradores pueden leer destinatarios; el envío requiere servicio de servidor. Reintentos con bloqueo, límite por destinatario, idempotencia y sin reenvío histórico. No se envían salud/documentos. Una aceptación por Resend no equivale a entrega final.
- Las pruebas SQL que requieren un PostgreSQL local vacío no se han repetido en esta sesión: solo está instalado el cliente libpq, no el servidor. Nunca ejecutarlas contra producción.

Pendiente, no confundir con funciones ya verificadas:

1. Catálogo mensual, matrícula y temporada resueltos en la segunda revisión (arriba). Siguen pendientes aforo y datos fiscales; no inventar tarifas trimestrales/anuales ni periodicidad Plus.
2. Resend probado con su buzón oficial de pruebas: envío aceptado desde `info@academycostabrava.com`. También se ha probado POST real al formulario de campus → solicitud guardada → correo aceptado y registrado, con datos ficticios, sin plaza/pago, limpiados después. Esto no prueba una bandeja de entrada real. Sigue pendiente una dirección controlada por el usuario para alta/recuperación de cuenta y recepción real; verificar SMTP de Supabase. [Buzones de prueba de Resend](https://resend.com/changelog/sending-test-emails).
3. Auth: OTP de 30 minutos aplicado y SMTP comprobado en la segunda revisión. Protección de contraseñas filtradas bloqueada por plan gratuito; exige Pro, sin contratarlo. [Guía de seguridad](https://supabase.com/docs/guides/platform/going-into-prod#security).
4. Stripe LIVE sigue desactivado, sin cambios en claves, flags ni pagos. El ciclo real TEST de mensualidades, fallos y finalización continúa pendiente antes de activarlo; ver `STRIPE-PRODUCTION.md`.
5. Los avisos de funciones SECURITY DEFINER intencionales y optimizaciones de índices requieren revisión independiente; no se han eliminado permisos funcionales ni índices a ciegas. [Asesor de base de datos](https://supabase.com/docs/guides/database/database-linter).

No se ha creado el acceso especial del responsable de torneos, ni se ha cambiado la web separada de Costa Brava Cup.

Estado actualizado: integración recuperada y adaptada en `feat/stripe-production`. Consulta `STRIPE-PRODUCTION.md` para el estado de noviembre y las comprobaciones pendientes. El resto del archivo conserva la auditoría histórica de septiembre.

## Estado actual — integración comercial del 14 de septiembre

Esta sección sustituye las listas pendientes del archivo histórico que figura debajo.

Implementado:

- Portal Familias → Pagos: botón de Stripe para recibos propios de campus aprobado, participación de torneo, tienda y otros recibos. Importe y propiedad resueltos en servidor. Retorno al mismo dominio y confirmación exclusivamente por webhook.
- Academia: pago completo o autorización de tarjeta seguida de una programación mensual finita, `end_behavior=cancel`, de 1–60 meses según el plan del dueño. La matrícula se añade una sola vez. El precio/duración queda congelado en el contrato y se compara con la oferta que aceptó la familia para rechazar cambios durante la compra.
- Una autorización no se registra como pago. Cada `invoice.paid` registra una cuota; facturas duplicadas no duplican ingresos. Eventos de fallo/autorización pendiente y cambios/bajas de suscripción actualizan un estado separado consultando Stripe para tolerar eventos fuera de orden.
- Familias y administración ven contratos y número de cobros confirmados. Un contrato iniciado se puede retomar sin abrir otro. Si hay un contrato activo no se ofrece pagar de nuevo los recibos antiguos.
- Se puede cancelar un intento abierto: primero se caduca la sesión en Stripe y después se libera en la web. Volver atrás o cerrar una pestaña no se interpreta como cancelación ni como pago.
- Confirmar un jugador en un torneo genera su recibo individual al precio vigente; los recibos anteriores por equipo se conservan para conciliación, sin reescribir el histórico.
- Stock agregado por producto (incluidas líneas repetidas), bloqueos ordenados, devolución del stock una sola vez al cancelar un pedido no pagado. Capacidad de campus validada bajo bloqueo en base de datos.
- Ledger TEST separado: ninguna confirmación test marca recibos reales pagados. Claves solo servidor y cobros LIVE bloqueados salvo activación explícita en producción.
- Migraciones aplicadas: `20260914193102_receipt_checkout_ledger`, `20260914193103_academy_checkout_contracts`, `20260914193104_tournament_player_receipts`, `20260914193109_store_order_stock_safety`.

Verificado:

- `npm run test:payments`: cinco suites, incluyendo contrato Stripe con SDK simulado, matrícula única, fin de programación, firmas, modo, idempotencia y fallos. No son pagos reales ni sustituyen una prueba end-to-end de Stripe.
- PostgreSQL 17 local vacío, pruebas con rollback: `scripts/test-commercial-checkout.sql` y `scripts/test-commercial-sources.sql`. Incluyen propiedad, RLS real de authenticated, duplicados, conservación del histórico, precio inmutable, duración, stock y plazas. Nunca ejecutar estos fixtures en producción.
- TypeScript, ESLint de archivos modificados y build Next.js correctos.
- Prueba de integración `scripts/test-preview-checkouts.cjs`: familia temporal autenticada, plan no publicado, recibo TEST y contratos privados. Apertura real de Checkout de recibo, pago completo y modo setup mensual; segundo clic reutiliza sesión, cancelación real en Stripe y recibo original pendiente. Perfiles/plan/recibos temporales eliminados. NO se proporcionó tarjeta ni se confirmó una factura: esta prueba no acredita el ciclo mensual completo.
- Lectura de Checkout, precios, clientes, suscripciones y programaciones comprobada en Preview. El webhook TEST existente conserva su URL y firma y ahora escucha nueve eventos: los cuatro de Checkout, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `customer.subscription.updated` y `customer.subscription.deleted`.
- Asesor Supabase: no nuevas funciones de cobro expuestas a clientes. `receipt_checkout_events` no tiene políticas de cliente deliberadamente: solo service_role. Persisten avisos anteriores de RPC públicas y Auth; no se alteraron invitaciones ni accesos de trabajadores.

Pendiente antes de habilitar ventas:

1. Prueba real en entorno TEST del checkout comercial de cada módulo, incluyendo retorno autenticado, rechazo, abandono y confirmación.
2. Prueba de mensualidades con tarjeta TEST y Test Clock: primera factura, cuota siguiente, cuota fallida y finalización sin cobro extra. Verificar permisos de ESCRITURA de la clave restringida; que una consulta de lectura funcione no demuestra escritura.
3. Resolver incidencias de tarjeta y cambios de medio de pago desde Stripe; todavía no hay autoservicio de cambio de tarjeta en el portal. Reembolsos, ajustes y cancelaciones deben conciliarlos administración: no se ha implementado el flujo completo de devolución automática en cada módulo.
4. Tienda mantiene reserva de stock al crear el pedido. La cancelación impagada lo libera, pero no existe aún caducidad automática de pedidos abandonados. Los pedidos públicos requieren acceso del comprador al portal para pagar; no hay checkout público inmediato anónimo.
5. Revisar avisos Auth previos (caducidad OTP y protección de contraseñas filtradas) antes de entregar: [seguridad de producción](https://supabase.com/docs/guides/platform/going-into-prod#security). La tienda pública conserva una RPC intencionalmente anónima; endurecer anti-abuso antes de una campaña pública: [revisión SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
6. El dueño valida precios, duración, condiciones y políticas comerciales. Solo después: claves y webhook LIVE independientes, despliegue de producción y activación explícita. No se han habilitado ni hecho cobros reales.

### Operativa para el dueño

- Ajustes → Planes: habilitar pago completo y/o mensualidades, precio de cada opción, matrícula y duración. Las opciones online existentes siguen desactivadas hasta decisión del dueño; no se han inventado tarifas.
- Academia: asignar jugador a su grupo y plan. La familia revisa y acepta una modalidad en Pagos. No cambiar manualmente recibos de una membresía con contrato Stripe activo.
- Campus: aprobar la plaza; la familia paga el recibo desde Pagos. Aprobar no registra dinero recibido.
- Torneos: configurar precio por jugador y confirmar convocados. Los recibos históricos por equipo no se convierten automáticamente a individuales; revisarlos antes de emitir otra obligación.
- Tienda: se crea pedido/recibo pendiente; familias registradas lo pagan desde Pagos. Los pedidos impagados cancelados liberan stock; envío y pago son estados distintos.
- Conexión Stripe: diagnóstico y seguimiento de contratos, cobros confirmados e incidencias. Cobros LIVE todavía bloqueados.

## Archivo histórico — diagnóstico y avances anteriores

Las menciones a “pendiente” en las secciones siguientes reflejan su fecha, no sustituyen el estado actual de arriba.

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
## 19/11/2026 — Prueba privada de entrega LIVE sin cobro

- A petición del propietario se añade `/admin/stripe` → «Probar webhook sin cobrar».
- Solo administradores con sesión vigente; POST requiere mismo origen y JSON. Acceso anónimo y familias rechazado. Claves y URL de Checkout nunca se envían al navegador.
- Crea una sesión técnica de 1 € sin cliente ni tarjeta, la caduca inmediatamente y reutiliza el intento durante cinco minutos. No crea registros financieros, inscripciones, facturas ni suscripciones en Academy. Si una interrupción impide caducarla, Stripe la caduca automáticamente en menos de una hora; no se expone su URL.
- El webhook verifica la firma y el entorno antes de procesar `academy_webhook_delivery_probe_v1`. Solo acepta caducidad sin pago; guarda la referencia del evento en los metadatos de esa sesión aislada de Stripe. La pantalla no considera verificada una mera respuesta de la API.
- No modifica los flags de activación LIVE ni de mensualidades. No añade tablas ni migraciones.
- Pruebas locales: firmas, acceso, origen, duplicados, caducidad y reintentos con Stripe simulado; suites de pagos, TypeScript, lint de archivos modificados y build.
- Baseline previo y posterior: 11 pagos; digest `e9b3ce77d682aabd79e1097a68a22b23`. Sin cambios financieros ni usuarios QA residuales.
- Código `389679e`, primer despliegue verificado `dpl_DFLBhYnomYwpp4G9PLJETg8zTQBe`. Sesión aislada `cs_live_agkSyo8R2Vr9xxKUjz3xELINFlbrtWC3PcvXtykCKkHULyQLN87BBiVn5l`, caducada sin pago; evento firmado `evt_1UdS3bGk8vSBcmVd9xHkmJys` recibido a las 09:55:08 UTC. La clave admite crear, caducar y actualizar metadatos de Checkout. La entrega real prueba que el secreto del destino coincide con el desplegado.
- Accesos reales comprobados: anónimo y tutor reciben 403 en la API; POST desde otro origen recibe 403 incluso con sesión de administrador. Cuenta QA cerrada globalmente y eliminada.


## 20/11/2026 — Acceso de familias con código y contraseña propia

- Academia exige aceptar privacidad y condiciones en el formulario. La autorización de imágenes de Academia se decide y firma aparte en Portal Familias; una inscripción no equivale a permiso de publicación. Campus y torneos tienen sus propios selectores de imagen. No se han cambiado consentimientos existentes.
- La aceptación destaca el email real de la familia, el correo separado con código de bienvenida y la creación obligatoria de contraseña. Las familias con cuenta existente conservan sus credenciales. Recuperación y reenvío utilizan código al mismo email.
- `/portal/codigo`: verifica OTP de invitación/recuperación y conserva la sesión temporal cifrada en cookie HttpOnly de diez minutos, limitada a la API. No emite una sesión de portal hasta guardar una contraseña válida. Valida mismo origen, OTP de un uso, sesión no revocada, contraseña y retorno interno. Tras guardar, revoca la sesión temporal e inicia sesión normal. Los enlaces antiguos siguen funcionando.
- Configuración de Auth preparada para cambiar solo asuntos y HTML de invitación/recuperación, manteniendo OTP de 8 dígitos y 30 minutos. No cambia SMTP, roles, RLS, Stripe ni pagos.
- Validación local: TypeScript, lint de archivos afectados, build de producción y suites de acceso, notificaciones y correo de cobro. Prueba real de Auth con cuenta desechable: OTP incorrecto/reutilizado rechazado, portal bloqueado antes de contraseña, acceso posterior por contraseña y recuperación que invalida la contraseña anterior. Cuenta eliminada al terminar; sin inscripciones ni movimientos financieros.
- Correo de aceptación y pantalla de código revisados visualmente en escritorio y móvil (390 px). La prueba de Auth usa `generateLink`, sin enviar invitaciones a familias. La recepción real en un buzón no se ha comprobado.
- Baseline antes de las pruebas: 21 pagos; digest `13ac2fe6f6d8c3721523c18b62853160`. Verificación final del despliegue, plantillas y digest se registra al completarla.
- Asesor de seguridad: siguen los avisos existentes de funciones SECURITY DEFINER ejecutables, tres tablas RLS sin políticas y protección de contraseñas filtradas desactivada. Este cambio no añade tablas ni amplía permisos. Referencias: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable y https://supabase.com/docs/guides/auth/password-security .
- Publicación verificada: código `27397a8`, despliegue Vercel `dpl_9rmdm7U4tE3pYDdNbDJjGPGAuQn8` READY. La reconstrucción local tras integrar los cambios concurrentes se quedó sin disco; el build de Vercel de esta revisión terminó correctamente. TypeScript, lint y pruebas locales sí pasaron sobre la revisión integrada.
- Supabase aceptó las dos plantillas; una lectura posterior confirmó exactamente ambos asuntos/HTML, OTP de 8 dígitos y 1.800 segundos. Sin cambios de SMTP ni otros ajustes de Auth.
- Prueba del flujo completo repetida en `www.academycostabrava.com`: ocho comprobaciones reales de invitación, bloqueo previo a contraseña, inicio de sesión y recuperación superadas; cuenta desechable eliminada y cero cuentas `qa-code-%@example.invalid` residuales. No se ha verificado entrega a un buzón real.
- Digest final idéntico al inicial: 21 pagos; `13ac2fe6f6d8c3721523c18b62853160`.

## 20/11/2026 — Confirmación de contraseña y repetición en móvil

- El propietario confirmó recepción del correo al abrir el flujo real. Los registros Auth muestran verificación correcta a las 09:46:47 UTC, contraseña guardada a las 09:47:03 y login por contraseña a las 09:47:04. Vercel devolvió 200 al primer guardado y 401 a un segundo envío a las 09:47:23; no consta navegación al portal entre ambos. No se ha determinado por qué ese navegador no completó la primera navegación.
- La pantalla conserva ahora un estado terminal «Contraseña guardada», limpia las contraseñas, impide repetir el envío y ofrece un enlace normal para entrar además del intento de navegación automática. Un fallo de navegación no se convierte en un mensaje de fallo de contraseña. El aviso de verificación usada/caducada indica cómo entrar si la contraseña ya se guardó.
- Tras guardar la contraseña, excepciones de inicio de sesión automático o consulta del rol devuelven éxito con acceso al login; no invitan a repetir una operación ya completada.
- Regresión: pruebas de API con fallo posterior al guardado; componente con navegación bloqueada, doble envío y limpieza de contraseña. Reproducción real con cuenta desechable y sesión previa: recuperación y nuevo acceso correctos; cuenta eliminada. Sin modificar la contraseña del propietario durante el diagnóstico.
- Baseline financiero: 21 pagos; digest `13ac2fe6f6d8c3721523c18b62853160`. Asesores revisados: avisos previos de funciones SECURITY DEFINER, RLS sin políticas y protección de contraseñas filtradas, sin cambios de esquema ni permisos.

## 20/11/2026 — Confirmación visible antes de entrar

- El propietario confirma que el segundo intento completó el acceso. Revisión del recorrido: el estado de éxito anterior navegaba automáticamente tras 700 ms, demasiado rápido para leerlo.
- Se mantiene ahora una pantalla final hasta pulsar «Entrar en mi portal»: check verde, título «¡Contraseña guardada!», confirmación explícita, email verificado y acceso con la contraseña elegida. Textos coherentes en ES/CA/EN; botón previo «Guardar mi contraseña».
- Pruebas de API y componente superadas: código obligatorio, contraseña válida, recuperación, errores/reintentos, bloqueo de doble envío y éxito persistente sin temporizador de navegación. TypeScript y lint correctos. No se cambian Auth, plantillas de correo, cuentas ni registros financieros.
