# Airtable Clients Table Schema

## Field Definitions

| Field Name | Airtable Type | Required | Description |
|------------|---------------|----------|-------------|
| `client_id` | Single line text | Yes | Unique identifier for client |
| `contact_name` | Single line text | Yes | Full name of primary contact |
| `company` | Single line text | No | Company / Business name |
| `legal_name` | Single line text | No | Legal business name |
| `tax_id` | Single line text | No | RFC / Tax ID / CUIT for invoicing |
| `phone` | Single line text | No | Primary contact phone number |
| `email` | Single line text | No | Primary contact email address |
| `address` | Long text | No | Primary fiscal / delivery address |
| `city` | Single line text | No | City for primary address |
| `state` | Single line text | No | State for primary address |
| `category` | Single select | No | Client classification (e.g., REFACCIONES) |
| `industry` | Single line text | No | Industry sector (e.g., Restaurantero) |
| `alt_contact` | Single line text | No | Alternate contact person name |
| `alt_phone` | Single line text | No | Alternate phone number |
| `alt_email` | Single line text | No | Alternate email address |
| `alt_city` | Single line text | No | Alternate address city |
| `alt_state` | Single line text | No | Alternate address state |
| `purchase_frequency` | Single line text | No | Purchase frequency indicator |
| `notes` | Long text | No | Additional notes / observations |
| `column_12` | Single line text | No | Reserved custom field |

## Auto-Generated Fields

| Field Name | Type | Description |
|------------|------|-------------|
| `created_time` | Created time | Auto-generated timestamp when record created |
| `last_modified` | Last modified time | Auto-generated timestamp when record updated |
| `recID` | Formula | Airtable record ID reference |

## Data Flow Example

```json
{
    "success": true,
    "message": "Record retrieved.",
    "data": {
        "id": "recNWicpkIb2nDW3L",
        "createdTime": "2026-06-02T23:36:31.000Z",
        "fields": {
            "phone": "test",
            "legal_name": "test",
            "last_modified": "2026-06-02T23:37:46.000Z",
            "category": "REFACCIONES",
            "alt_contact": "test",
            "alt_phone": "test",
            "industry": "Restaurantero",
            "contact_name": "test",
            "recID": "recNWicpkIb2nDW3L",
            "city": "Cabo san lucas",
            "alt_state": "test",
            "email": "test",
            "address": "test",
            "column_12": "test",
            "purchase_frequency": "test",
            "tax_id": "test",
            "state": "Baja california sur",
            "alt_email": "test",
            "alt_city": "test",
            "client_id": "test",
            "created_time": "2026-06-02T23:36:31.000Z",
            "notes": "test",
            "company": "test"
        }
    }
}
```

## Mapping to Application

| Airtable Field | Application Property | Notes |
|----------------|-------------------|-------|
| `client_id` | `id` | Maps directly to client ID |
| `contact_name` | `nombre` | Primary contact name |
| `company` | `empresa` | Business name |
| `legal_name` | - | Currently unused in app |
| `tax_id` | `rfc` | Tax identifier |
| `phone` | `telefono` | Contact phone |
| `email` | `correo` | Contact email |
| `address` | `direccion` | Primary address |
| `city` | - | Currently unused |
| `state` | - | Currently unused |
| `category` | - | Currently unused |
| `industry` | - | Currently unused |
| `alt_contact` | - | Currently unused |
| `alt_phone` | - | Currently unused |
| `alt_email` | - | Currently unused |
| `alt_city` | - | Currently unused |
| `alt_state` | - | Currently unused |
| `purchase_frequency` | - | Currently unused |
| `notes` | - | Currently unused |
| `column_12` | - | Reserved |

## Sync Mapping Functions

### Local → Airtable Mapping

```javascript
function mapLocalToAirtableClient(client) {
  return {
    "client_id": client.id || "",
    "contact_name": client.nombre || "",
    "company": client.empresa || "",
    "legal_name": client.legal_name || "",
    "tax_id": client.rfc || "",
    "phone": client.telefono || "",
    "email": client.correo || "",
    "address": client.direccion || "",
    "city": client.ciudad || "",
    "state": client.estado || "",
    "category": client.categoria || "REFACCIONES",
    "industry": client.industry || "",
    "alt_contact": client.alt_contact || "",
    "alt_phone": client.alt_phone || "",
    "alt_email": client.alt_email || "",
    "alt_city": client.alt_city || "",
    "alt_state": client.alt_state || "",
    "purchase_frequency": client.purchase_frequency || "",
    "notes": client.notes || "",
    "column_12": client.column_12 || ""
  };
}
```

### Airtable → Local Mapping

```javascript
function mapAirtableToLocalClient(record) {
  const f = record.fields || {};
  return {
    id: (f["client_id"] || record.id || "").replace(/\n/g, ""),
    nombre: (f["contact_name"] || "").replace(/\n/g, ""),
    empresa: (f["company"] || "").replace(/\n/g, ""),
    legal_name: (f["legal_name"] || "").replace(/\n/g, ""),
    rfc: (f["tax_id"] || "").replace(/\n/g, ""),
    telefono: (f["phone"] || "").replace(/\n/g, ""),
    correo: (f["email"] || "").replace(/\n/g, ""),
    direccion: (f["address"] || "").replace(/\n/g, ""),
    ciudad: (f["city"] || "").replace(/\n/g, ""),
    estado: (f["state"] || "").replace(/\n/g, ""),
    categoria: (f["category"] || "").replace(/\n/g, ""),
    industry: (f["industry"] || "").replace(/\n/g, ""),
    alt_contact: (f["alt_contact"] || "").replace(/\n/g, ""),
    alt_phone: (f["alt_phone"] || "").replace(/\n/g, ""),
    alt_email: (f["alt_email"] || "").replace(/\n/g, ""),
    alt_city: (f["alt_city"] || "").replace(/\n/g, ""),
    alt_state: (f["alt_state"] || "").replace(/\n/g, ""),
    purchase_frequency: (f["purchase_frequency"] || "").replace(/\n/g, ""),
    notes: (f["notes"] || "").replace(/\n/g, ""),
    column_12: (f["column_12"] || "").replace(/\n/g, "")
  };
}
```

## Integration Notes

- **Primary Field**: Set `client_id` as the primary field in Airtable
- **Table Name**: Create table named `clients` under base `apppjeEy9lY65U4On`
- **API Endpoint**: Uses existing Shum API at `https://klef.newfacecards.com/shum-api/api.php`
- **Storage Key**: Clients are stored in `localStorage` under `kv-catalog-clients`
- **Newline Handling**: Airtable may return fields with trailing newlines - clean with `.replace(/\n/g, "")` if needed
- **Category Options**: Configure single select with options like `REFACCIONES`, `EQUIPOS`, `SERVICIOS`