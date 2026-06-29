# Reporte de Unmatched - Inventario KCV Mayo 2026

Este reporte reclasifica las filas que no coincidieron por `MODELO` contra `Código`. Los duplicados se ignoran por ahora, como se solicitó.

## Resumen

- Existen con otro código: 27
- Posibles variantes: 29
- To create: 69
- Total revisado desde Unmatched: 125

## Criterio usado

- `exists_other_code`: descripción casi idéntica o código equivalente con formato distinto.
- `variant`: nombre parecido, pero cambia presentación, medida, modelo, marca o descripción.
- `to_create`: no hay coincidencia suficientemente confiable contra el catálogo actual.

## Archivos generados

- `06_unmatched_classification.csv`: clasificación completa.
- `07_unmatched_exists_other_code.csv`: revisar y mapear al código existente sugerido.
- `08_unmatched_possible_variants.csv`: revisar si son variantes o productos separados.
- `09_unmatched_to_create.csv`: candidatos a alta de producto nuevo.

## Recomendación operativa

1. Revisar primero `07_unmatched_exists_other_code.csv` y confirmar si el código sugerido es el producto correcto.
2. Revisar `08_unmatched_possible_variants.csv` para decidir si cada fila debe vincularse al producto base o crearse como SKU separado.
3. Usar `09_unmatched_to_create.csv` como lista de altas nuevas, agregando marca, categoría, costo/precio y datos faltantes antes de importarlas.

La clasificación es sugerida. Antes de crear productos nuevos o mapear códigos, conviene revisar las filas con score bajo o nombres comerciales ambiguos.
