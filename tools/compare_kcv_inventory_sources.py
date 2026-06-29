#!/usr/bin/env python3
"""
Compare the KCV closing Excel against local JSON files and Airtable via SHUM API.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import ssl
import unicodedata
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd


EXCEL_COLUMNS = {
    "model": "MODELO",
    "description": "DESCRIPCION",
    "physical": "INVENTARIO FISICO FINAL",
}


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_header(value: Any) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    text = strip_accents(str(value)).upper().strip()
    return " ".join(text.split())


def normalize_key(value: Any) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    text = strip_accents(str(value)).upper().strip()
    return " ".join(text.split())


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


def display_number(value: float) -> str:
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.2f}".rstrip("0").rstrip(".")


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
        if not key or pd.isna(description):
            continue

        rows.append({
            "source_row": int(index) + 4,
            "key": key,
            "codigo": str(model).strip(),
            "descripcion": str(description).strip(),
            "quantity": to_number(row.get(EXCEL_COLUMNS["physical"])),
        })
    return rows


def unique_excel_rows(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], set[str], int]:
    counts = Counter(row["key"] for row in rows)
    duplicate_keys = {key for key, count in counts.items() if count > 1}
    comparable: list[dict[str, Any]] = []
    ignored = 0
    for row in rows:
        if row["key"] in duplicate_keys:
            ignored += 1
            continue
        comparable.append(row)
    return comparable, duplicate_keys, ignored


def read_json(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise SystemExit(f"{path} must contain a JSON array")
    return data


def product_code(product: dict[str, Any]) -> str:
    return str(product.get("Código") or product.get("codigo") or "").strip()


def product_quantity(product: dict[str, Any]) -> float:
    return to_number(product.get("Cantidad", product.get("stock", 0)))


def index_local_products(products: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    index: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for product in products:
        key = normalize_key(product_code(product))
        if key:
            index[key].append(product)
    return dict(index)


def compare_index(
    excel_rows: list[dict[str, Any]],
    product_index: dict[str, list[dict[str, Any]]],
    source_name: str,
) -> dict[str, Any]:
    missing: list[dict[str, Any]] = []
    mismatches: list[dict[str, Any]] = []
    matched = 0
    duplicate_codes = {key: values for key, values in product_index.items() if len(values) > 1}

    for row in excel_rows:
        products = product_index.get(row["key"], [])
        if not products:
            missing.append(row)
            continue
        matched += 1
        product = products[0]
        actual = product_quantity(product)
        expected = row["quantity"]
        if actual != expected:
            mismatches.append({
                "source": source_name,
                "codigo": row["codigo"],
                "descripcion": row["descripcion"],
                "excel_quantity": expected,
                "source_quantity": actual,
                "difference": actual - expected,
            })

    return {
        "source": source_name,
        "status": "ok",
        "product_count": sum(len(values) for values in product_index.values()),
        "unique_product_codes": len(product_index),
        "matched": matched,
        "missing": missing,
        "quantity_mismatches": mismatches,
        "duplicate_codes": duplicate_codes,
    }


def skipped_comparison(source_name: str, error: Exception) -> dict[str, Any]:
    return {
        "source": source_name,
        "status": "error",
        "error": str(error),
        "product_count": 0,
        "unique_product_codes": 0,
        "matched": 0,
        "missing": [],
        "quantity_mismatches": [],
        "duplicate_codes": {},
    }


def shum_request(endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=60, context=context) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_cloud_products(endpoint: str, base_id: str, table: str, max_pages: int) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    offset = None
    pages = 0
    while True:
        pages += 1
        payload: dict[str, Any] = {
            "action": "list",
            "baseId": base_id,
            "table": table,
        }
        if offset:
            payload["offset"] = offset
        result = shum_request(endpoint, payload)
        if not result.get("success"):
            raise SystemExit(f"SHUM API error: {result}")
        data = result.get("data") or {}
        records.extend(data.get("records") or [])
        offset = data.get("offset")
        if not offset or pages >= max_pages:
            break
    return [record.get("fields") or {} for record in records]


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["source", "codigo", "descripcion", "excel_quantity", "source_quantity", "difference"]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_report(path: Path, summary: dict[str, Any], comparisons: list[dict[str, Any]]) -> None:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        "# Comparación Excel vs JSON vs Nube",
        "",
        f"Generado: {now}",
        "",
        "## Resumen del Excel",
        "",
        f"- Filas limpias del Excel: {summary['excel_clean_rows']}",
        f"- Códigos únicos comparados: {summary['excel_unique_codes']}",
        f"- Filas duplicadas ignoradas en la comparación: {summary['excel_duplicate_rows_ignored']}",
        "",
        "## Resultado por fuente",
        "",
    ]

    for comparison in comparisons:
        if comparison.get("status") != "ok":
            lines.extend([
                f"### {comparison['source']}",
                "",
                "- Estado: no verificado por error de conexión.",
                f"- Error: `{comparison.get('error', 'unknown error')}`",
                "",
            ])
            continue

        lines.extend([
            f"### {comparison['source']}",
            "",
            f"- Productos/registros en la fuente: {comparison['product_count']}",
            f"- Códigos únicos en la fuente: {comparison['unique_product_codes']}",
            f"- Códigos del Excel encontrados: {comparison['matched']}",
            f"- Códigos del Excel no encontrados: {len(comparison['missing'])}",
            f"- Diferencias de cantidad: {len(comparison['quantity_mismatches'])}",
            f"- Códigos duplicados en la fuente: {len(comparison['duplicate_codes'])}",
            "",
        ])

        if comparison["quantity_mismatches"]:
            lines.append("Primeras diferencias de cantidad:")
            lines.append("")
            lines.append("| Código | Excel | Fuente | Diferencia |")
            lines.append("|---|---:|---:|---:|")
            for row in comparison["quantity_mismatches"][:12]:
                lines.append(
                    f"| {row['codigo']} | {display_number(row['excel_quantity'])} | "
                    f"{display_number(row['source_quantity'])} | {display_number(row['difference'])} |"
                )
            lines.append("")

        if comparison["missing"]:
            lines.append("Primeros códigos del Excel no encontrados:")
            lines.append("")
            lines.append("| Código | Descripción | Cantidad Excel |")
            lines.append("|---|---|---:|")
            for row in comparison["missing"][:12]:
                lines.append(
                    f"| {row['codigo']} | {row['descripcion']} | {display_number(row['quantity'])} |"
                )
            lines.append("")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--excel", required=True, type=Path)
    parser.add_argument("--sheet", default="Vaciado")
    parser.add_argument("--inventory-json", default="inventory/data/inventory-products.json", type=Path)
    parser.add_argument("--local-json", default="inventory/data/local_products.json", type=Path)
    parser.add_argument("--endpoint", default="https://klef.newfacecards.com/shum-api/api.php")
    parser.add_argument("--base-id", default="apppjeEy9lY65U4On")
    parser.add_argument("--table", default="products")
    parser.add_argument("--max-pages", default=20, type=int)
    parser.add_argument("--report", default="inventory/data/imports/kcv_mayo_2026_preview/COMPARE_EXCEL_JSON_CLOUD.md", type=Path)
    parser.add_argument("--mismatches-csv", default="inventory/data/imports/kcv_mayo_2026_preview/10_compare_quantity_mismatches.csv", type=Path)
    args = parser.parse_args()

    excel_rows, duplicate_excel_keys, ignored_duplicates = unique_excel_rows(
        read_excel_inventory(args.excel, args.sheet)
    )

    comparisons = [
        compare_index(excel_rows, index_local_products(read_json(args.inventory_json)), "JSON activo inventory-products.json"),
        compare_index(excel_rows, index_local_products(read_json(args.local_json)), "JSON local local_products.json"),
    ]

    try:
        comparisons.append(
            compare_index(
                excel_rows,
                index_local_products(fetch_cloud_products(args.endpoint, args.base_id, args.table, args.max_pages)),
                "Nube Airtable via SHUM API",
            )
        )
    except Exception as error:
        comparisons.append(skipped_comparison("Nube Airtable via SHUM API", error))

    summary = {
        "excel_clean_rows": len(excel_rows) + ignored_duplicates,
        "excel_unique_codes": len(excel_rows),
        "excel_duplicate_rows_ignored": ignored_duplicates,
        "excel_duplicate_keys": sorted(duplicate_excel_keys),
    }

    all_mismatches: list[dict[str, Any]] = []
    for comparison in comparisons:
        all_mismatches.extend(comparison["quantity_mismatches"])

    write_report(args.report, summary, comparisons)
    write_csv(args.mismatches_csv, all_mismatches)

    compact = {
        **summary,
        "comparisons": [
            {
                "source": comparison["source"],
                "status": comparison["status"],
                "error": comparison.get("error"),
                "product_count": comparison["product_count"],
                "unique_product_codes": comparison["unique_product_codes"],
                "matched": comparison["matched"],
                "missing": len(comparison["missing"]),
                "quantity_mismatches": len(comparison["quantity_mismatches"]),
                "duplicate_codes": len(comparison["duplicate_codes"]),
            }
            for comparison in comparisons
        ],
        "report": str(args.report),
        "mismatches_csv": str(args.mismatches_csv),
    }
    print(json.dumps(compact, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
