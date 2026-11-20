## Una firma inicial y permisos por publicación — 20 noviembre 2026

La bienvenida reúne condiciones y decisiones opcionales de imagen por jugador. Un único dibujo de firma se guarda en un único archivo; una inserción atómica registra condiciones y decisiones por hijo con la misma evidencia. Una negativa no impide entrar. No se convierten las firmas antiguas en permisos de imagen ni se modifican decisiones previas.

Si la familia ya firmó, los nuevos permisos o sus cambios se confirman con su sesión de tutor, sin otro dibujo. Son registros nuevos de tipo `authenticated_choice`, con fecha y versión, y sin reutilizar la imagen de una firma anterior. Documentos distingue firmas de decisiones posteriores. Nuevos hijos reciben sus propias opciones.

El muro permite revisar el permiso en un diálogo sin abandonar texto ni adjunto. Cada publicación elige entre «Solo mi familia y Academy» (por defecto) y «Comunidad Academy», que sigue siendo el portal privado. Uso en web/redes por Academy conserva una opción independiente. El backend revalida al tutor, su relación con el jugador y el permiso actual. Triggers privados comprueban permisos incluso en inserciones directas, ocultan las fotos al retirar permiso y serializan publicaciones/cambios por tutor y jugador. No reescriben publicaciones históricas al desplegar.

Pruebas: acciones con mocks (una sola subida, lote atómico, negativos, tutor ajeno, hijos duplicados/ajenos, cambios sin firma nueva, historial y limpieza ante fallo); SQL local con rollback; transacción remota revertida bajo RLS real (hijo ajeno denegado, retirada oculta foto, pagos intactos). No se firma ni se cambian permisos de ninguna familia real ni de la cuenta de demostración del propietario. Baseline financiero: 21 pagos, digest `13ac2fe6f6d8c3721523c18b62853160`.

# Portal de familias: fotos y evaluaciones

## Operativa

- Inicio muestra una tarjeta por hijo activo, con su foto propia. La familia puede añadir/cambiar la foto desde esa tarjeta o desde la ficha del jugador. JPG, PNG y WebP hasta 3 MB; se comprueba el contenido y se elimina la información EXIF al guardar.
- La tarjeta deportiva existe antes de la primera evaluación. Muestra la foto y «Sin evaluar», sin inventar puntuaciones ni informes.
- Galería de la ficha: fotos privadas, subida, vista completa, navegación anterior/siguiente y borrado de fotos subidas por la propia familia. Las fotos de Academy solo las elimina administración. Administración gestiona las imágenes en la pestaña Documentos de la ficha del alumno.
- La videoteca familiar y administrativa consulta solo vídeos válidos; las imágenes de galería no entran en esa lista.
- Entrenadores → Jugadores → ficha → Evaluaciones deportivas: siete valores enteros entre 0 y 99, fecha y casilla «Mostrar a la familia». Desmarcada guarda un borrador interno. Guardar la misma fecha actualiza esa evaluación, sin duplicarla. Las observaciones del equipo técnico siguen siendo internas.
- Solo el entrenador actualmente asignado y administración pueden guardar evaluaciones. La familia solo lee las publicadas. Retirar el acceso al entrenador o cambiar la asignación revoca el permiso en la base de datos.

## Implementación y validación

- Fotos y galería permanecen en buckets privados. Las respuestas de imagen comprueban sesión/propiedad y usan `private, no-store`. Las acciones privilegiadas verifican el hijo con RLS antes de escribir un único campo de foto o un archivo de galería. No se concede a las familias actualización general de alumnos.
- Migración `20261120095023_coach_player_evaluations`: índice único jugador/fecha, autor de evaluación, límites de puntuación para nuevas escrituras, INSERT/UPDATE para entrenadores asignados. No modifica evaluaciones históricas ni pagos.
- `scripts/test-family-portal-media.cjs`: imagen real y formato/tamaño, bloqueo antes de acceso privilegiado, privacidad de imágenes, validación de puntuaciones y borrador/publicación.
- `scripts/test-coach-evaluations.sql`: fixtures con ROLLBACK; entrenador asignado, otro jugador, reasignación, rango, borrador/publicado, familia y entrenador revocado.
- Suites existentes de pagos/acceso familiar, TypeScript, lint e i18n. Pagos al iniciar y tras pruebas SQL: 21, digest `13ac2fe6f6d8c3721523c18b62853160`.
- Prueba de navegador con familia de dos hijos y entrenador temporales: subida real de ambas fotos, persistencia y aislamiento entre hermanos, tarjeta sin evaluar, galería con dos imágenes y visor completo, borrado, videoteca sin error, borrador del entrenador invisible y posterior publicación visible. Sin errores de navegador ni desbordamiento móvil. Las imágenes/cuentas/fichas QA se eliminan y las sesiones se revocan al finalizar.
- Build de producción correcto. Auditoría de dependencias de producción: 0 vulnerabilidades. Asesor de base de datos sin nuevos avisos sobre evaluaciones; los avisos preexistentes de Auth/RPC se conservan.
