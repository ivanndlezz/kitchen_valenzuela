# Schema de Almacenes

## Ubicación

Los almacenes viven en la tabla `configs`, campo:

`Almacenes`

El valor debe guardarse como JSON.

## Formato

```json
[
  {
    "id": "3",
    "name": "Kitchen Clean",
    "color": "#111111",
    "active": true
  },
  {
    "id": "4",
    "name": "Inoxidables",
    "color": "#999999",
    "active": true
  }
]
```

## Contrato

- `id`: identificador estable del almacén. No debe cambiar cuando se renombra.
- `name`: nombre visible en Catálogos y en el Paso 4 del formulario.
- `color`: color del punto visual del almacén.
- `active`: si es `false`, el almacén no se renderiza en el formulario.

## Estado actual de implementación

- Catálogos puede crear, editar y eliminar almacenes.
- El Paso 4 renderiza almacenes dinámicamente desde `configs.Almacenes`.
- El stock del producto se calcula sumando todos los inputs `wh_qty_*`.
- Airtable sigue recibiendo el total en `Cantidad`.
- La distribución por almacén se conserva localmente en `warehouseStock` cuando existe, pero todavía no tiene columnas propias en Airtable.

## Pendiente

- Definir si Airtable tendrá campos por almacén o una tabla relacional de existencias.
- Crear selector global de almacén activo en header.
- Definir si el selector filtra lectura, escritura o ambas.
