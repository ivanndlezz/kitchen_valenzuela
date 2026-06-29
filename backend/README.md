# Backend

Server-side support files live here.

- `php/shum_api.php` - PHP Airtable proxy implementation.

The root `shum_api.php` file is kept as a compatibility entrypoint for any existing deployment or documentation that still points to the old root path.

## SHUM Proxy Access

The proxy keeps CORS open with `Access-Control-Allow-Origin: *` so the same endpoint works from production, Live Server with changing ports, Postman/cURL, and Codex.

Write actions can be protected with `X-KV-Import-Token` when `/home/rccgaowg/zakra/garden.php` defines:

```php
"shum_proxy" => [
    "kv_import_token" => "REPLACE_WITH_LONG_SECRET_TOKEN"
]
```

Required for `create`, `update`, and `delete`; not required for `list` or `get`.
