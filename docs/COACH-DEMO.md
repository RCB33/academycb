# Demo de entrenador — 20 noviembre 2026

## Alcance vigente: acceso deportivo compartido

Publicación verificada: `6215c77`, Vercel `dpl_9gPpePx5L1kNaRjev6WCeqCBGdBj` READY en `www.academycostabrava.com`. Seis rutas nuevas del entrenador responden 200 con contenido actualizado; dashboard/finanzas/pagos familiares redirigen y las tablas financieras no exponen filas. La demo no tiene ya ningún equipo asignado, pero ve los 21 jugadores activos al finalizar la prueba. Sesión técnica de verificación cerrada; cuenta demo conservada. Los 21 pagos mantienen exactamente `13ac2fe6f6d8c3721523c18b62853160`.

El build de Vercel, TypeScript, lint y suites específicas han pasado. El asesor conserva los avisos previos de Auth y funciones privilegiadas; no añade avisos para la nueva tabla. La revisión visual se hizo en el entorno local con código equivalente, 360/390 px, y la versión publicada se comprobó mediante sesión HTTP autenticada. La URL alternativa de Vercel requiere SSO y no se deshabilitó esa protección.

Por nueva petición explícita del propietario, los entrenadores activos ya no necesitan grupo asignado: pueden consultar todos los jugadores activos y todo el calendario, registrar notas/evaluaciones y asistencia. Los avisos son de todos los equipos. Las restricciones a un equipo descritas en la prueba inicial de abajo quedan sustituidas por este alcance. Los pagos siguen excluidos.

`coach_session_roster` añade/quita jugadores solo de una sesión, sin cambiar inscripciones ni grupos habituales. Protege asistencia existente y evita trasladar registros a otro jugador/evento. Campus y torneos obtienen su lista de sus inscripciones no canceladas, sin exponer sus detalles financieros. Familias no pueden acceder a esta lista operativa ni editarla. No se amplían permisos de documentos, imágenes, compras, finanzas ni administración.

Migración remota/local `20261120102637_coach_shared_sports_workspace`. Prueba conectada con ROLLBACK: entrenador sin asignación, tres actividades, convocatoria base/adiciones/exclusiones/restauración, asistencia preservada, notas y puntuaciones, aislamiento de familias, revocación y pagos existentes intactos. Fixtures de campus pueden generar recibos ficticios por los triggers existentes, pero todo se revierte; el digest de los 21 pagos reales se mantiene antes y después.

Pruebas locales: límites de fecha y cambio horario de Madrid, clasificación de actividades, validación y autorización de acciones, notas sin escrituras de inscripción/pagos, TypeScript y lint de archivos modificados. No se activa Stripe ni se modifican cobros existentes.

## Prueba inicial (alcance anterior)

La migración `20261120103201_coach_multiday_attendance` permite asistencia por evento/jugador/día y rechaza fechas fuera de la actividad, conservando filas históricas. La convocatoria de una actividad de varios días es común; su asistencia se guarda por separado cada día. Probados dos días diferentes sin sobrescritura y rechazo de fecha exterior mediante ROLLBACK.

Revisión visual en navegador a 360 y 390 px: jornada, convocatoria, notas y calendario. Añadir/quitar/restaurar a Dani, guardar evaluación en borrador y revisión interna de Alex, ambos ficticios, comprobados desde la interfaz. No es una prueba en dispositivo iPhone físico. Se corrige el scroll del contenedor al cambiar de sección, evitando aterrizar a mitad de pantalla. No se modificaron jugadores reales durante estas pruebas.

Creada por petición explícita del propietario para explorar el panel de entrenador. No es un trabajador real ni un acceso de torneos. No se enviaron correos.

- Login: `entrenador.demo@example.invalid` en `/portal`; destino `/coach`.
- Contraseña entregada directamente al propietario, no guardada en el repositorio. El email es ficticio y no recibe recuperación de contraseña.
- Auth/profile: `c96e2370-cde4-483e-a9b3-9894309ca396`, rol `coach`.
- Worker: `ba80643f-e649-4dc8-94a6-e5536bdbc68f`, acceso habilitado.
- Equipo aislado `DEMO · Equipo de prueba`: `6816424f-ef29-4cf5-a906-d12e3975fd71`, sin oferta pública ni horario recurrente.
- Jugadores ficticios Alex `4723fb54-b65a-4dcd-9f56-7abead8498b0` y Dani `209012ee-14b4-4413-a263-9197239c5040`. No vinculados a tutores, matrículas ni pagos.
- Sesión interna del 20/11, 17:30–19:00: `cd33d381-3a26-4751-8a9e-0016da07ce9f`. Aviso de ejemplo, evaluación en borrador, observación y asistencia presentes como demostración.

## Verificación realizada

Inicio de sesión real por contraseña; RLS muestra exclusivamente esos dos jugadores y ese equipo. Escrituras autenticadas de evaluación, observación y asistencia correctas. Lista de sesión devuelve dos jugadores. Pagos, solicitudes de cobro, membresías y pedidos sin registros accesibles.

Siete rutas de entrenador/cuenta responden HTTP 200 sin error de servidor. Accesos a `/admin/dashboard`, `/admin/finanzas`, `/admin/gestion` y `/portal/pagos` rechazados/redirigidos. Sesión técnica cerrada globalmente tras comprobar; la cuenta permanece disponible para el propietario.

No se modificaron pagos ni ajustes Stripe. Antes/después: 21 pagos, digest `13ac2fe6f6d8c3721523c18b62853160`. La prueba es de Auth, base de datos y renderizado HTTP; no acredita una nueva revisión visual en iPhone.

## Funciones y límites actuales

- Jornada, calendario de sesiones asignadas, pase de lista.
- Jugadores de equipos asignados, siete puntuaciones de 0–99, historial por fecha, borrador/publicación a familias.
- Observaciones internas del equipo técnico.
- Avisos de coordinación: lectura, no chat ni respuestas.
- Los equipos aparecen asociados a jugadores/sesiones. No existe una pantalla independiente de gestión de equipos para entrenador; creación, asignación y cambios de horarios corresponden a administración.

Para retirar esta demo, revocar primero sus sesiones y deshabilitar el worker; eliminar únicamente sus fixtures identificados, revisando dependencias. No borrar por nombres genéricos ni tocar el demo de familias existente.
