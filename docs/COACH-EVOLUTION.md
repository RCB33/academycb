# Evolución deportiva visual — 20/11/2026

El entrenador usa la misma `FifaCard` y el mismo gráfico radial de escala fija 0–99 que la familia. Los siete controles combinan deslizador y entrada numérica. La media de la carta usa las seis habilidades técnicas; disciplina se muestra por separado. La vista previa es local y no guarda automáticamente. Cada fecha conserva una evaluación; el historial representa datos guardados, no cambios pendientes.

La valoración se guarda en la columna existente `child_metrics.notes`, junto con las notas y la opción `visible_to_guardian`. No se convierte una observación interna en pública. Omitir `notes` en una edición antigua conserva el escrito anterior. La familia ve el mensaje de la última evaluación publicada.

Los trofeos reutilizan `achievements` y `child_achievements`, incluida su columna `note` para la dedicatoria. Concederlos es una acción explícita y se hacen visibles inmediatamente a la familia. La nueva política permite lectura y concesión a entrenadores activos para jugadores activos; no permite borrar trofeos, cambiar los anteriores ni modificar el catálogo. Duplicados rechazados por la clave existente. No cambia permisos financieros.

## Verificación

- TypeScript, lint específico, tests unitarios de notas/trofeos, workspace de entrenador y regresión de medios familiares.
- `scripts/test-coach-awards.sql` y `scripts/test-coach-evaluations.sql`: fixtures sintéticos en transacciones con ROLLBACK. Concesión, dedicatoria, duplicados, longitud, jugador archivado, catálogo protegido, familias vinculadas, borradores privados y revocación.
- Revisión visual local con los componentes reales y datos ficticios a 360 y 390 px. Deslizador sincronizado con número, OVR 68→73 al cambiar dos habilidades, escrito y trofeo en directo. Corregidos corte vertical de carta y etiquetas del radar. No es una prueba en iPhone físico.
- La cuenta demo histórica fue retirada por petición del propietario en otro trabajo. No se recrea ni se modifica ninguna cuenta real; el arnés visual temporal se elimina antes de publicar. No se han hecho concesiones ni evaluaciones persistentes a jugadores reales.
- Pagos antes/después de las pruebas: 21 filas; digest `13ac2fe6f6d8c3721523c18b62853160`. Stripe no se modifica.

Migración: `20261120104505_coach_award_achievements.sql`. Los avisos previos de seguridad del proyecto se mantienen; este cambio no acredita una auditoría global.
