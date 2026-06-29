#!/usr/bin/env python3
"""
Apply KCV May 2026 inventory import to local project data files and optionally
sync exact updates / new products to SHUM API.

This intentionally ignores duplicates and fuzzy categories. It applies only:
- 02_matches_to_update.csv as stock updates for existing exact matches.
- 09_unmatched_to_create.csv as new product rows.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import shutil
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd


BASE_ID = "apppjeEy9lY65U4On"
TABLE = "products"
ENDPOINT = "https://klef.newfacecards.com/shum-api/api.php"


JSON_FILES = [
    Path("inventory/data/local_products.json"),
    Path("inventory/data/inventory-products.json"),
]
CSV_FILE = Path("inventory/data/products-all.csv")


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_key(value: Any) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    text = strip_accents(str(value)).upper().strip()
    text = re.sub(r"\s+", " ", text)
    return text


def code_key(value: Any) -> str:
    return re.sub(r"[^A-Z0-9]", "", normalize_key(value))


def to_number(value: Any, default: float = 0) -> float:
    if value is None:
        return default
    if isinstance(value, str) and not value.strip():
        return default
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(number):
        return default
    return number


def clean_text(value: Any) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    return str(value).strip()


def read_csv_dicts(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        return rows, list(reader.fieldnames or [])


def write_csv_dicts(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def read_json_list(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise SystemExit(f"{path} must contain a JSON array")
    return data


def write_json_list(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(rows, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def index_by_code(rows: list[dict[str, Any]]) -> dict[str, list[int]]:
    index: dict[str, list[int]] = defaultdict(list)
    for idx, row in enumerate(rows):
        key = normalize_key(row.get("Código") or row.get("codigo") or "")
        if key:
            index[key].append(idx)
    return dict(index)


def make_backup(paths: list[Path], backup_dir: Path) -> None:
    backup_dir.mkdir(parents=True, exist_ok=True)
    for path in paths:
        shutil.copy2(path, backup_dir / path.name)


def excel_category_by_model(excel_path: Path) -> dict[str, str]:
    df = pd.read_excel(excel_path, sheet_name="Vaciado", header=2).dropna(how="all")
    current_category = ""
    result: dict[str, str] = {}
    for _, row in df.iterrows():
        model = clean_text(row.get("MODELO"))
        description = row.get("DESCRIPCIÓN")
        if not model:
            continue
        if pd.isna(description):
            current_category = model
            continue
        result[normalize_key(model)] = current_category
    return result


def category_code(category: str, description: str) -> int:
    cat = normalize_key(category)
    desc = normalize_key(description)
    if "DETERGENTE" in cat or "QUIMICO" in cat or "LIMPIADOR" in desc or "DETERGENTE" in desc:
        return 3
    if cat in {"EQUIPOS", "MUEBLES DE ACERO INOXIDABLE", "UTENSILIOS DE COCINA", "EQUIPOS A CONSIGNA"}:
        return 4
    return 2


def import_meta(row: dict[str, Any], action: str, import_id: str) -> dict[str, Any]:
    return {
        "id": import_id,
        "action": action,
        "source": "Inventario de TIENDA KCV MAYO 2026 Final (CIERRE).xlsx",
        "sourceRow": int(to_number(row.get("source_row_excel") or row.get("source_row"))),
        "stockSource": "INVENTARIO FISICO FINAL",
        "tienda": to_number(row.get("tienda")),
        "bodega": to_number(row.get("bodega")),
        "physicalFinal": to_number(row.get("inventario_fisico_final")),
        "updatedAt": datetime.now().isoformat(timespec="seconds"),
    }


def apply_stock_update(product: dict[str, Any], row: dict[str, Any], import_id: str) -> dict[str, Any]:
    next_product = dict(product)
    qty = to_number(row.get("cantidad_a_importar"))
    previous = to_number(next_product.get("Cantidad", next_product.get("stock", 0)))
    next_product["Cantidad"] = qty
    next_product["warehouseStock"] = {
        "tienda": to_number(row.get("tienda")),
        "bodega": to_number(row.get("bodega")),
    }
    meta = import_meta(row, "update", import_id)
    meta["previousQuantity"] = previous
    meta["importedQuantity"] = qty
    next_product["inventory_import"] = meta
    next_product["updatedAt"] = datetime.now().isoformat(timespec="seconds")
    return next_product


def new_product_from_row(row: dict[str, Any], import_id: str, category_by_key: dict[str, str]) -> dict[str, Any]:
    model = clean_text(row.get("modelo_excel") or row.get("modelo"))
    description = clean_text(row.get("descripcion_excel") or row.get("descripcion"))
    category = category_by_key.get(normalize_key(model), "")
    qty = to_number(row.get("cantidad_a_importar"))
    cost = to_number(row.get("total_costo_unitario_pesos") or row.get("costo_unitario_pesos"))
    product = {
        "Nombre": description,
        "Código": model,
        "Clase de Código de barras": "code128",
        "Marca": "Generales",
        "Código de categoría": category_code(category, description),
        "unit code": "Pieza",
        "Venta unit code": "Pieza",
        "Comprar unit code": "Pieza",
        "Costo": cost,
        "Precio": 0,
        "Cantidad de alerta": 0,
        "Tasa de impuestos": "IVA",
        "Método de impuestos": "Exclusivo",
        "Imagen": "no_image.png",
        "Código de la Sub categoría": "",
        "Variantes de producto": "",
        "Producto de campo personalizado 1": "",
        "Producto Campo Personalizadoo 2": "",
        "Producto Campo Personalizadoo 3": "",
        "Producto Campo Personalizadoo 4": "",
        "Producto Campo Personalizadoo 5": "",
        "Producto Campo Personalizadoo 6": "",
        "Cantidad": qty,
        "warehouseStock": {
            "tienda": to_number(row.get("tienda")),
            "bodega": to_number(row.get("bodega")),
        },
        "inventory_import": import_meta(row, "create", import_id),
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "updatedAt": datetime.now().isoformat(timespec="seconds"),
    }
    return product


def product_to_csv_row(product: dict[str, Any], fieldnames: list[str]) -> dict[str, Any]:
    row = {field: "" for field in fieldnames}
    for key, value in product.items():
        if key in row:
            row[key] = json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else value
    return row


def airtable_payload(product: dict[str, Any]) -> dict[str, Any]:
    return {
        "Nombre": product.get("Nombre", ""),
        "Código": str(product.get("Código", "")),
        "Clase de Código de barras": product.get("Clase de Código de barras", "code128"),
        "Marca": product.get("Marca", "Generales"),
        "Código de categoría": int(to_number(product.get("Código de categoría"), 2)),
        "unit code": product.get("unit code", "Pieza"),
        "Venta unit code": product.get("Venta unit code", "Pieza"),
        "Comprar unit code": product.get("Comprar unit code", "Pieza"),
        "Costo": to_number(product.get("Costo")),
        "Precio": to_number(product.get("Precio")),
        "Cantidad de alerta": to_number(product.get("Cantidad de alerta")),
        "Tasa de impuestos": product.get("Tasa de impuestos", "IVA"),
        "Método de impuestos": product.get("Método de impuestos", "Exclusivo"),
        "Imagen": product.get("Imagen", "no_image.png"),
        "Código de la Sub categoría": product.get("Código de la Sub categoría", ""),
        "Variantes de producto": product.get("Variantes de producto", ""),
        "Producto de campo personalizado 1": product.get("Producto de campo personalizado 1", ""),
        "Producto Campo Personalizadoo 2": product.get("Producto Campo Personalizadoo 2", ""),
        "Producto Campo Personalizadoo 3": product.get("Producto Campo Personalizadoo 3", ""),
        "Producto Campo Personalizadoo 4": product.get("Producto Campo Personalizadoo 4", ""),
        "Producto Campo Personalizadoo 5": product.get("Producto Campo Personalizadoo 5", ""),
        "Producto Campo Personalizadoo 6": product.get("Producto Campo Personalizadoo 6", ""),
        "Cantidad": to_number(product.get("Cantidad")),
    }


def shum_request(action: str, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps({"action": action, **payload}).encode("utf-8")
    request = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        result = json.loads(response.read().decode("utf-8"))
    if not result.get("success"):
        raise RuntimeError(result.get("message") or f"SHUM {action} failed")
    return result.get("data") or {}


def sync_cloud(updated_rows: list[dict[str, Any]], created_products: list[dict[str, Any]], csv_rows: list[dict[str, Any]]) -> dict[str, Any]:
    update_count = 0
    create_count = 0
    errors: list[dict[str, str]] = []
    csv_by_code = {normalize_key(row.get("Código")): row for row in csv_rows if normalize_key(row.get("Código"))}

    for row in updated_rows:
        code = normalize_key(row.get("modelo") or row.get("modelo_excel"))
        csv_row = csv_by_code.get(code)
        rec_id = clean_text(csv_row.get("recID")) if csv_row else ""
        if not rec_id:
            continue
        try:
            shum_request("update", {
                "baseId": BASE_ID,
                "table": TABLE,
                "recordId": rec_id,
                "data": {
                    "Cantidad": to_number(row.get("cantidad_a_importar")),
                },
            })
            update_count += 1
            time.sleep(0.12)
        except Exception as exc:  # noqa: BLE001
            errors.append({"action": "update", "code": clean_text(row.get("modelo") or row.get("modelo_excel")), "error": str(exc)})

    for product in created_products:
        existing_csv_row = csv_by_code.get(normalize_key(product.get("Código")))
        if existing_csv_row and clean_text(existing_csv_row.get("recID")):
            continue
        try:
            data = shum_request("create", {
                "baseId": BASE_ID,
                "table": TABLE,
                "data": airtable_payload(product),
            })
            record_id = clean_text(data.get("id"))
            if record_id:
                code = normalize_key(product.get("Código"))
                if code in csv_by_code:
                    csv_by_code[code]["recID"] = record_id
                product["recID"] = record_id
            create_count += 1
            time.sleep(0.12)
        except Exception as exc:  # noqa: BLE001
            errors.append({"action": "create", "code": clean_text(product.get("Código")), "error": str(exc)})

    return {"updated": update_count, "created": create_count, "errors": errors}


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply KCV inventory import to local data and optionally SHUM/Airtable.")
    parser.add_argument("--preview-dir", type=Path, default=Path("inventory/data/imports/kcv_mayo_2026_preview"))
    parser.add_argument("--excel", type=Path, default=Path("/Users/a74525/Downloads/Inventario de TIENDA KCV MAYO 2026 Final (CIERRE).xlsx"))
    parser.add_argument("--sync-cloud", action="store_true")
    args = parser.parse_args()

    matches_path = args.preview_dir / "02_matches_to_update.csv"
    to_create_path = args.preview_dir / "09_unmatched_to_create.csv"
    if not matches_path.exists() or not to_create_path.exists():
        raise SystemExit("Missing preview CSV files. Generate the preview before applying.")

    import_id = datetime.now().strftime("kcv-may-2026-apply-%Y%m%d-%H%M%S")
    backup_dir = args.preview_dir / "backups" / import_id
    make_backup([*JSON_FILES, CSV_FILE], backup_dir)

    updates = pd.read_csv(matches_path).to_dict("records")
    creates = pd.read_csv(to_create_path).to_dict("records")
    category_by_key = excel_category_by_model(args.excel)

    created_products = [new_product_from_row(row, import_id, category_by_key) for row in creates]

    json_results = []
    for path in JSON_FILES:
        products = read_json_list(path)
        product_index = index_by_code(products)
        updated = 0
        skipped_duplicate = 0
        for row in updates:
            key = normalize_key(row.get("modelo"))
            positions = product_index.get(key, [])
            if len(positions) == 1:
                products[positions[0]] = apply_stock_update(products[positions[0]], row, import_id)
                updated += 1
            elif len(positions) > 1:
                skipped_duplicate += 1
        existing_keys = set(product_index)
        appended = 0
        for product in created_products:
            key = normalize_key(product.get("Código"))
            if key and key not in existing_keys:
                products.append(dict(product))
                existing_keys.add(key)
                appended += 1
        write_json_list(path, products)
        json_results.append({"file": str(path), "updated": updated, "created": appended, "skipped_duplicate": skipped_duplicate, "final_count": len(products)})

    csv_rows, fieldnames = read_csv_dicts(CSV_FILE)
    for field in ["warehouseStock", "inventory_import"]:
        if field not in fieldnames:
            fieldnames.append(field)
    csv_index = index_by_code(csv_rows)
    csv_updated = 0
    csv_skipped_duplicate = 0
    for row in updates:
        key = normalize_key(row.get("modelo"))
        positions = csv_index.get(key, [])
        if len(positions) == 1:
            target = csv_rows[positions[0]]
            target["Cantidad"] = to_number(row.get("cantidad_a_importar"))
            target["warehouseStock"] = json.dumps({"tienda": to_number(row.get("tienda")), "bodega": to_number(row.get("bodega"))}, ensure_ascii=False)
            target["inventory_import"] = json.dumps(import_meta(row, "update", import_id), ensure_ascii=False)
            csv_updated += 1
        elif len(positions) > 1:
            csv_skipped_duplicate += 1

    csv_existing_keys = set(csv_index)
    csv_created = 0
    for product in created_products:
        key = normalize_key(product.get("Código"))
        if key and key not in csv_existing_keys:
            csv_rows.append(product_to_csv_row(product, fieldnames))
            csv_existing_keys.add(key)
            csv_created += 1

    cloud_result = {"skipped": True}
    if args.sync_cloud:
        cloud_result = sync_cloud(updates, created_products, csv_rows)

    write_csv_dicts(CSV_FILE, csv_rows, fieldnames)

    summary = {
        "import_id": import_id,
        "backup_dir": str(backup_dir),
        "local_json": json_results,
        "local_csv": {
            "file": str(CSV_FILE),
            "updated": csv_updated,
            "created": csv_created,
            "skipped_duplicate": csv_skipped_duplicate,
            "final_count": len(csv_rows),
        },
        "cloud": cloud_result,
        "ignored": {
            "duplicates": "not applied",
            "exists_other_code": "not applied",
            "variant": "not applied",
        },
    }
    summary_path = args.preview_dir / f"apply_summary_{import_id}.json"
    with summary_path.open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
