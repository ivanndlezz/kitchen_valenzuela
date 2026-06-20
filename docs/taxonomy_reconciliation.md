# Conciliación de Taxonomía Importada

## Problema real

Los productos importados desde Caja Soft pueden traer valores históricos que no existen, o no coinciden exactamente, con la taxonomía actual del sistema: marcas, categorías, subcategorías y unidades.

El formulario no debe mentir. Si Airtable dice `Pieza` o categoría `02`, la UI no debe mostrar una taxonomía nueva como si fuera una asignación confirmada, salvo que exista un alias explícito en `configs`.

## Contrato

1. La UI preserva el valor importado cuando no hay match.
2. El campo preservado se marca con alerta naranja.
3. Amarillo queda reservado para cambios sin guardar.
4. Rojo queda reservado para errores de entrada.
5. Los aliases viven en `configs`, no hardcodeados en JS.
6. La normalización de productos aplica aliases configurados al cargar productos nube.
7. Las diferencias se guardan como reporte local para revisión posterior.

## Utilidad

Archivo:

`inventory/js/taxonomy-reconciliation.js`

Responsabilidades:

- Leer aliases desde `window.ProductFormConfig.TAXONOMY_ALIASES`.
- Normalizar productos con aliases configurados.
- Comparar productos nube contra la taxonomía actual.
- Guardar un reporte local de diferencias.
- Exponer helpers para que el formulario pueda resolver aliases sin duplicar lógica.

LocalStorage:

`kv-taxonomy-reconciliation-report`

## Field propuesto en `configs`

El sistema busca cualquiera de estos nombres para no bloquear el avance por nomenclatura:

- `Aliases`
- `aliases`
- `TaxonomyAliases`
- `taxonomy_aliases`

Formato recomendado:

```json
{
  "categories": {
    "02": "39"
  },
  "units": {
    "Pieza": "4"
  },
  "brands": {
    "UNOX": "UNOX"
  },
  "subcategories": {}
}
```

También se soporta formato de lista:

```json
{
  "units": [
    { "from": "Pieza", "to": "4" }
  ]
}
```

## Guard defensivo en formulario

Si un valor importado no existe en el select y no hay alias:

- Se agrega temporalmente como opción del select.
- Se marca el contenedor/control con `has-taxonomy-guard-control`.
- El control recibe un chip clicable con `taxonomy-guard-chip`.
- Al hacer click en el chip se abre un modal de conciliación para mapear el valor importado a una opción existente.
- El modal también permite aceptar el valor importado como nueva opción del catálogo:
  - `brands` se agrega a `Marcas`.
  - `categories` se agrega a `Categorias`.
  - `subcategories` se agrega a la categoría activa en `Subcategorias`.
- El usuario ve el dato real que viene de Airtable.

Esto evita dos fallas:

- Mostrar `No especificado` cuando sí hay un dato importado.
- Mapear silenciosamente a una taxonomía nueva sin decisión del usuario.

## Reporte local

El reporte incluye:

- Fecha de generación.
- Total de productos revisados.
- Valores faltantes por scope:
  - `brands`
  - `categories`
  - `subcategories`
  - `units`
- Valores que parecen tener correspondencia, pero requieren mapeo explícito:
  - Ejemplo: `Pieza` puede sugerir `Pieza (Pz)`, pero no se considera resuelto hasta guardarlo como alias.
- Aliases aplicados.
- Ejemplos de productos afectados por valor.

## Siguiente paso

Crear en Catálogos o en un side sheet la vista:

`Conciliar datos importados`

Acciones por lote:

- Importar faltantes.
- Mapear a existente.
- Ignorar.

Las decisiones deben escribirse en `configs` como aliases o como taxonomía nueva, nunca como condicionales hardcodeados en JS.
