# Auditoría del portal de familias — 19 noviembre 2026

Estado: correcciones preparadas y comprobadas en código y en una prueba visual aislada. **La auditoría completa, botón a botón, de la sesión real de Álex Demo sigue pendiente de iniciar sesión. No equivale a una validación de producción.**

## Base y cuenta

- Base: `main`, commit `37d07bcf8909e90a1629c4767aa22e160950d5c9`; fetch explícito de `refs/heads/main:refs/remotes/origin/main` antes de editar y al terminar; sin divergencias.
- Fuente: `/Users/roque/academy-karen-production`; trabajo aislado en `/Users/roque/academy-parent-audit`, rama `fix/parent-portal-audit`.
- Producción: proyecto Vercel `academycb`; no se utiliza ninguna copia histórica de Desktop.
- El CRM muestra Familia Demo · Manu, correo `demo.familias@academycostabrava.com`, jugador Álex Demo (ficticio). El navegador disponible tiene sesión de administrador. Se dejó una ventana de incógnito en `/portal` con el correo y la contraseña vacía; se solicitó al usuario iniciar sesión sin compartir la contraseña. El archivo temporal de credenciales de la creación de la demo ya no existe. No se restableció ninguna contraseña.

## Hallazgos corregidos

| Área | Problema confirmado en código | Cambio |
| --- | --- | --- |
| Torneos | El menú enlazaba `/torneos/inscripcion`, fuera del portal privado. | Nueva página `/portal/torneos` con el formulario existente. La entrada pública redirige a las familias autenticadas, conservando torneo e intento de pago. |
| Retorno de torneos | La vuelta del checkout apuntaba a la página pública. | Los nuevos enlaces de checkout de torneos vuelven a la página interna. No se modifica precio, modo Stripe ni pagos existentes. |
| Navegación móvil | Pagos quedaba oculto en Más. | Barra Inicio, Calendario, Pagos, Avisos, Más. Las 12 secciones proceden de una lista común. |
| Navegación escritorio | Se ocultaban automáticamente las etiquetas a anchuras inferiores a 1280 px. | Menú expandido por defecto, agrupado por uso; contracción manual disponible. |
| Tienda | El portal actualizaba el carrito pero no montaba el panel que lo muestra. | Panel compartido montado en el portal y botón Ver carrito. Talla visible, controles con etiquetas accesibles. |
| Perfil | Guardar no mostraba éxito o error. | Estado guardando, bloqueo durante el envío y confirmación/error visible. Misma acción de servidor existente. |
| Ayuda | Contactar salía a la web pública. | Página interna con contacto y accesos a gestiones habituales. |
| Calendario | Las actividades no abrían detalles en la vista de familias. | Agenda próxima por defecto, vista mensual opcional y detalle con fecha, hora, lugar y equipo. |
| Ficha de jugador | Sin eventos, no había acceso al calendario desde esa sección. | Botón Ver calendario también en el estado vacío. |
| Selector de jugador | Etiquetas oscuras sobre fondo oscuro. | Contraste claro/dorado en la barra lateral. |
| Descargas | Error de URL firmada generaba enlace `#` sin acción. | Archivo marcado no disponible, sin enlace falso. |
| Accesibilidad | Menú Más y carrito con paneles manuales. | Diálogos Radix con Escape y confinamiento de foco; controles de cantidades/tallas identificados. |

Las cadenas nuevas principales incluyen catalán e inglés.

## Pruebas realizadas

- `npm run typecheck`: pasa.
- ESLint de todos los archivos TS/TSX modificados/nuevos: cero errores; 11 avisos (tipos `any`, variables existentes, imagen y cierre de menú mediante efecto).
- `npx next build --webpack`: pasa, 63 páginas estáticas generadas y rutas internas nuevas compiladas. Webpack se usó porque la copia de trabajo comparte `node_modules` por enlace con el repositorio activo para no agotar el disco.
- `node scripts/test-family-navigation.cjs`: pasa. Comprueba destinos existentes, prioridades móviles, estado activo de fichas/rutas anidadas, redirección de familias con parámetros y entrada anónima/admin; checkout Stripe simulado conserva importes y devuelve torneos al portal.
- `npm run test:events`, `npm run test:karen`, `npm run test:stripe`: pasan con dobles de prueba; no acreditan cobros reales ni envío/entrega de emails.
- `git diff --check`: pasa.

### Clics observados en fixture local aislado

Chrome mediante control visual, `127.0.0.1:4189`; componentes reales modificados, datos ficticios y acciones de servidor sustituidas. Banner explícito «datos simulados · sin envíos ni cobros». La fixture está ignorada en `tmp/parent-audit` y no forma parte del producto.

| Secuencia | Resultado observado | Límite |
| --- | --- | --- |
| Tienda → talla M → añadir | Panel abierto, talla M, subtotal 25 €, contador 1 | Producto ficticio |
| Aumentar → reducir | 50 €/2 y después 25 €/1 | Sin pedido real |
| Solicitar pedido → enviar vacío | Validación de campos obligatorios | No se envía formulario válido |
| Volver al carrito → quitar → seguir comprando | Carrito vacío y retorno a tienda | Sin persistencia remota |
| Calendario → actividad → Escape | Detalle visible y cierre | Evento simulado |
| Ver por mes → siguiente → anterior | Navegación noviembre/diciembre/noviembre | Sin consulta real de agenda de Álex |
| Perfil → Guardar | Confirmación visible | Acción simulada; no prueba persistencia |
| Móvil 320 px → Más → Mis torneos | Menú abierto, destino `/portal/torneos`, menú cerrado y barra inferior conservada | Valida enlace y menú; contenido de ruta simulado |

## Pendiente de la sesión real

Recorrer las 12 secciones con Álex Demo, incluyendo ficha y selector de jugador, notificaciones, documentos/firmas ya existentes, descargas, recibos PDF, avisos, vídeos y lectura del muro. Verificar escritorio y móvil, vuelta atrás, recarga, errores y estados vacíos. Confirmar que las inscripciones existentes aparecen en Mis torneos sin abandonar la estructura del portal. Comprobar conservación de sesión y permisos efectivos.

No marcar «todos los botones probados» hasta completar este recorrido. Las acciones que cobran, firman, publican, comparten fichas, cambian credenciales o modifican datos se verifican mediante mocks o con una autorización y fixture específica; no pulsarlas indiscriminadamente en producción.

## Integridad

Única comprobación de datos de pagos: lectura agregada, antes y después. Ambos resultados: 11 registros, digest `e9b3ce77d682aabd79e1097a68a22b23` mediante `md5(string_agg(to_jsonb(p)::text, '' order by id))`. Sin modificaciones de pagos, flags Stripe, cuentas staff, firmas, pedidos, publicaciones ni comunicaciones.
