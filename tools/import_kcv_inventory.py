#!/usr/bin/env python3
"""
Import helper for Kitchen Valenzuela inventory closing workbooks.

Default behavior is safe: generate comparison reports only. With
--apply-output, it writes updated copies into the output directory without
overwriting production data files.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd


EXCEL_COLUMNS = {
    "model": "MODELO",
    "description": "DESCRIPCION",
    "stock": "STOCK",
    "store": "TIENDA",
    "warehouse": "BODEGA",
    "physical": "INVENTARIO FISICO FINAL",
    "cost_mxn": "COSTO UNITARIO (PESOS)",
    "cost_usd": "COSTO UNITARIO (DOLARES)",
    "converted_cost_mxn": "TOTAL DE COSTO UNITARIO PESOS",
    "acquired_at": "FECHA ADQ",
    "validity": "VIGENCIA",
}


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_header(value: Any) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    text = strip_accents(str(value)).upper().strip()
    text = re.sub(r"\s+", " ", text)
    return text


def normalize_key(value: Any) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    text = strip_accents(str(value)).upper().strip()
    text = re.sub(r"\s+", " ", text)
    return text


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


def clean_for_csv(value: Any) -> Any:
    if pd.isna(value):
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def read_excel_inventory(path: Path, sheet_name: str) -> list[dict[str, Any]]:
    raw = pd.read_excel(path, sheet_name=sheet_name, header=2)
    raw = raw.dropna(how="all")
    raw.columns = [normalize_header(column) for column in raw.columns]

    missing = [column for column in EXCEL_COLUMNS.values() if column not in raw.columns]
    if missing:
        raise SystemExit(f"Missing expected Excel columns: {', '.join(missing)}")

    rows: list[dict[str, Any]] = []
    for index, row in raw.iterrows():
        model = row.get(EXCEL_COLUMNS["model"])
        description = row.get(EXCEL_COLUMNS["description"])
        key = normalize_key(model)
        if not key:
            continue
        if pd.isna(description):
            continue

        store_qty = to_number(row.get(EXCEL_COLUMNS["store"]))
        warehouse_qty = to_number(row.get(EXCEL_COLUMNS["warehouse"]))
        physical_qty = to_number(row.get(EXCEL_COLUMNS["physical"]))
        stock_qty = to_number(row.get(EXCEL_COLUMNS["stock"]))

        rows.append({
            "source_row": int(index) + 4,
            "key": key,
            "modelo": str(model).strip(),
            "descripcion": str(description).strip(),
            "stock": stock_qty,
            "tienda": store_qty,
            "bodega": warehouse_qty,
            "location_sum": store_qty + warehouse_qty,
            "inventario_fisico_final": physical_qty,
            "costo_unitario_pesos": to_number(row.get(EXCEL_COLUMNS["cost_mxn"])),
            "costo_unitario_dolares": to_number(row.get(EXCEL_COLUMNS["cost_usd"])),
            "total_costo_unitario_pesos": to_number(row.get(EXCEL_COLUMNS["converted_cost_mxn"])),
            "fecha_adq": clean_for_csv(row.get(EXCEL_COLUMNS["acquired_at"])),
            "vigencia": clean_for_csv(row.get(EXCEL_COLUMNS["validity"])),
        })
    return rows


def choose_quantity(row: dict[str, Any], stock_source: str) -> float:
    if stock_source == "physical":
        return to_number(row["inventario_fisico_final"])
    if stock_source == "location_sum":
        return to_number(row["location_sum"])
    if stock_source == "stock":
        return to_number(row["stock"])
    raise ValueError(f"Unknown stock source: {stock_source}")


def read_json_products(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise SystemExit(f"{path} must contain a JSON array")
    return data


def product_code(product: dict[str, Any]) -> str:
    return str(product.get("Código") or product.get("codigo") or "").strip()


def index_products(products: list[dict[str, Any]]) -> dict[str, list[int]]:
    index: dict[str, list[int]] = defaultdict(list)
    for pos, product in enumerate(products):
        key = normalize_key(product_code(product))
        if key:
            index[key].append(pos)
    return dict(index)


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def update_product(product: dict[str, Any], row: dict[str, Any], next_qty: float, import_id: str) -> dict[str, Any]:
    updated = dict(product)
    now = datetime.now().isoformat(timespec="seconds")
    current_stock = updated.get("Cantidad", updated.get("stock", 0))
    if "Cantidad" in updated or "Código" in updated:
        updated["Cantidad"] = next_qty
    else:
        updated["stock"] = next_qty

    updated["warehouseStock"] = {
        "tienda": row["tienda"],
        "bodega": row["bodega"],
    }
    updated["inventory_import"] = {
        "id": import_id,
        "source": "Inventario de TIENDA KCV MAYO 2026 Final (CIERRE).xlsx",
        "sourceRow": row["source_row"],
        "stockSource": "Cantidad",
        "previousQuantity": to_number(current_stock),
        "importedQuantity": next_qty,
        "tienda": row["tienda"],
        "bodega": row["bodega"],
        "physicalFinal": row["inventario_fisico_final"],
        "locationSum": row["location_sum"],
        "updatedAt": now,
    }
    updated["updatedAt"] = now
    return updated


def update_json_copy(
    source_path: Path,
    output_path: Path,
    import_rows_by_key: dict[str, dict[str, Any]],
    duplicate_excel_keys: set[str],
    stock_source: str,
    import_id: str,
) -> dict[str, Any]:
    products = read_json_products(source_path)
    product_index = index_products(products)
    duplicate_catalog_keys = {key for key, positions in product_index.items() if len(positions) > 1}
    updates = 0
    skipped_duplicate_catalog = 0

    next_products = list(products)
    for key, row in import_rows_by_key.items():
        if key in duplicate_excel_keys:
            continue
        positions = product_index.get(key, [])
        if not positions:
            continue
        if len(positions) > 1:
            skipped_duplicate_catalog += 1
            continue
        pos = positions[0]
        next_qty = choose_quantity(row, stock_source)
        next_products[pos] = update_product(next_products[pos], row, next_qty, import_id)
        updates += 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(next_products, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    return {
        "source": str(source_path),
        "output": str(output_path),
        "product_count": len(products),
        "updates_written": updates,
        "duplicate_catalog_keys": len(duplicate_catalog_keys),
        "skipped_duplicate_catalog": skipped_duplicate_catalog,
    }


def read_csv_products(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        return rows, list(reader.fieldnames or [])


def update_csv_copy(
    source_path: Path,
    output_path: Path,
    import_rows_by_key: dict[str, dict[str, Any]],
    duplicate_excel_keys: set[str],
    stock_source: str,
) -> dict[str, Any]:
    rows, fieldnames = read_csv_products(source_path)
    product_index = index_products(rows)
    duplicate_catalog_keys = {key for key, positions in product_index.items() if len(positions) > 1}
    updates = 0
    skipped_duplicate_catalog = 0

    if "Cantidad" not in fieldnames:
        fieldnames.append("Cantidad")
    if "warehouseStock" not in fieldnames:
        fieldnames.append("warehouseStock")

    for key, row in import_rows_by_key.items():
        if key in duplicate_excel_keys:
            continue
        positions = product_index.get(key, [])
        if not positions:
            continue
        if len(positions) > 1:
            skipped_duplicate_catalog += 1
            continue
        target = rows[positions[0]]
        next_qty = choose_quantity(row, stock_source)
        target["Cantidad"] = next_qty
        target["warehouseStock"] = json.dumps({"tienda": row["tienda"], "bodega": row["bodega"]}, ensure_ascii=False)
        updates += 1

    write_csv(output_path, rows, fieldnames)
    return {
        "source": str(source_path),
        "output": str(output_path),
        "product_count": len(rows),
        "updates_written": updates,
        "duplicate_catalog_keys": len(duplicate_catalog_keys),
        "skipped_duplicate_catalog": skipped_duplicate_catalog,
    }


def build_reports(
    import_rows: list[dict[str, Any]],
    catalog_paths: list[Path],
    csv_paths: list[Path],
    output_dir: Path,
    stock_source: str,
    apply_output: bool,
) -> dict[str, Any]:
    import_id = datetime.now().strftime("kcv-may-2026-%Y%m%d-%H%M%S")
    output_dir.mkdir(parents=True, exist_ok=True)

    key_counts = Counter(row["key"] for row in import_rows)
    duplicate_excel_keys = {key for key, count in key_counts.items() if count > 1}
    import_rows_by_key = {row["key"]: row for row in import_rows if key_counts[row["key"]] == 1}

    catalog_indexes: list[tuple[str, dict[str, list[int]]]] = []
    catalog_key_sources: dict[str, list[str]] = defaultdict(list)
    duplicate_catalog_rows: list[dict[str, Any]] = []

    for path in catalog_paths:
        products = read_json_products(path)
        product_index = index_products(products)
        catalog_indexes.append((str(path), product_index))
        for key, positions in product_index.items():
            catalog_key_sources[key].append(str(path))
            if len(positions) > 1:
                duplicate_catalog_rows.append({
                    "source": str(path),
                    "codigo_normalizado": key,
                    "count": len(positions),
                })

    for path in csv_paths:
        rows, _ = read_csv_products(path)
        product_index = index_products(rows)
        catalog_indexes.append((str(path), product_index))
        for key, positions in product_index.items():
            catalog_key_sources[key].append(str(path))
            if len(positions) > 1:
                duplicate_catalog_rows.append({
                    "source": str(path),
                    "codigo_normalizado": key,
                    "count": len(positions),
                })

    matched_rows: list[dict[str, Any]] = []
    unmatched_rows: list[dict[str, Any]] = []
    duplicate_excel_rows: list[dict[str, Any]] = []

    for row in import_rows:
        report_row = {
            **row,
            "cantidad_a_importar": choose_quantity(row, stock_source),
            "matched_sources": "; ".join(catalog_key_sources.get(row["key"], [])),
        }
        if row["key"] in duplicate_excel_keys:
            duplicate_excel_rows.append(report_row)
        elif row["key"] in catalog_key_sources:
            matched_rows.append(report_row)
        else:
            unmatched_rows.append(report_row)

    report_fields = [
        "source_row",
        "key",
        "modelo",
        "descripcion",
        "stock",
        "tienda",
        "bodega",
        "location_sum",
        "inventario_fisico_final",
        "cantidad_a_importar",
        "costo_unitario_pesos",
        "costo_unitario_dolares",
        "total_costo_unitario_pesos",
        "fecha_adq",
        "vigencia",
        "matched_sources",
    ]
    write_csv(output_dir / "01_normalized_inventory.csv", import_rows, report_fields[:-1])
    write_csv(output_dir / "02_matches_to_update.csv", matched_rows, report_fields)
    write_csv(output_dir / "03_unmatched_review.csv", unmatched_rows, report_fields)
    write_csv(output_dir / "04_duplicate_excel_review.csv", duplicate_excel_rows, report_fields)
    write_csv(output_dir / "05_duplicate_catalog_review.csv", duplicate_catalog_rows, ["source", "codigo_normalizado", "count"])

    apply_results: list[dict[str, Any]] = []
    if apply_output:
        for path in catalog_paths:
            apply_results.append(update_json_copy(
                path,
                output_dir / f"updated_{path.name}",
                import_rows_by_key,
                duplicate_excel_keys,
                stock_source,
                import_id,
            ))
        for path in csv_paths:
            apply_results.append(update_csv_copy(
                path,
                output_dir / f"updated_{path.name}",
                import_rows_by_key,
                duplicate_excel_keys,
                stock_source,
            ))

    summary = {
        "import_id": import_id,
        "stock_source": stock_source,
        "apply_output": apply_output,
        "output_dir": str(output_dir),
        "excel_rows_clean": len(import_rows),
        "excel_unique_keys": len(key_counts),
        "excel_duplicate_keys": len(duplicate_excel_keys),
        "matches_to_update": len(matched_rows),
        "unmatched_review": len(unmatched_rows),
        "duplicate_excel_review": len(duplicate_excel_rows),
        "duplicate_catalog_review": len(duplicate_catalog_rows),
        "apply_results": apply_results,
    }
    with (output_dir / "import_summary.json").open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare/import KCV Excel inventory into project product files.")
    parser.add_argument("excel", type=Path, help="Path to the source .xlsx inventory workbook.")
    parser.add_argument("--sheet", default="Vaciado", help="Workbook sheet to read. Default: Vaciado")
    parser.add_argument("--json", action="append", type=Path, default=[], help="JSON product file to compare/update.")
    parser.add_argument("--csv", action="append", type=Path, default=[], help="CSV product file to compare/update.")
    parser.add_argument(
        "--stock-source",
        choices=["physical", "location_sum", "stock"],
        default="physical",
        help="Quantity source. physical=INVENTARIO FISICO FINAL, location_sum=TIENDA+BODEGA, stock=STOCK.",
    )
    parser.add_argument("--output-dir", type=Path, default=None, help="Directory for reports and updated copies.")
    parser.add_argument("--apply-output", action="store_true", help="Write updated copies to output-dir.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.excel.exists():
        raise SystemExit(f"Excel file not found: {args.excel}")

    catalog_paths = args.json or [
        Path("inventory/data/local_products.json"),
        Path("inventory/data/inventory-products.json"),
    ]
    csv_paths = args.csv or [Path("inventory/data/products-all.csv")]

    for path in [*catalog_paths, *csv_paths]:
        if not path.exists():
            raise SystemExit(f"Catalog file not found: {path}")

    output_dir = args.output_dir or Path("inventory/data/imports") / datetime.now().strftime("%Y%m%d_%H%M%S")
    import_rows = read_excel_inventory(args.excel, args.sheet)
    summary = build_reports(
        import_rows=import_rows,
        catalog_paths=catalog_paths,
        csv_paths=csv_paths,
        output_dir=output_dir,
        stock_source=args.stock_source,
        apply_output=args.apply_output,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
