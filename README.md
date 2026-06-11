# Pattern Webflow Assets

Canonical public repo for Pattern Webflow support files.

## Structure

```text
webflow/pattern.com/
  scripts/
    nav/
    content/
    schema/
    interaction/
    media/
  styles/
  vendor/
  archive/
docs/
```

## Production Delivery

GitHub is the source of truth. Production should load pinned release assets through jsDelivr, not raw GitHub URLs.

Example:

```html
<script defer src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/scripts/nav/v1-nav-desktop.js"></script>
```

Flowdrive URLs remain live until the jsDelivr replacements in `docs/WEBFLOW-FOOTER-CODE.md` are tested in Webflow.

## Archives

- `webflow/pattern.com/archive/legacy-root/` preserves files that previously lived at the repo root.
- `webflow/pattern.com/archive/pattern-2026-05-28/` preserves the public-safe snapshot imported from `blackpixelca/pattern-2026-05-28`.

Do not commit private client references, exports, local app settings, or generated previews to this public repo.
