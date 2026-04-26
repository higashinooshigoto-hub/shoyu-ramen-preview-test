# AGENTS.md

## Project Goal

This app is a static novelty-product mockup composer. Keep one shared `index.html` and add products through JSON configuration plus image assets.

## Product Structure

- Product list: `products/index.json`
- Product settings: `products/{productId}.json`
- Product template example: `products/_template.json`
- Shared JavaScript modules: `src/`
- Shared styles: `styles.css`

## Product Addition Rules

- Do not copy `index.html` for each product.
- Do not add product-ID-specific branches to shared JavaScript.
- Add or update a product by editing `products/{productId}.json` and adding image assets.
- Use `controls` in product JSON to define the operation panel.
- Use URL parameters to switch products, for example `?product=shoyu-ramen`.

## Verification

- Run `node --check` for JavaScript files after changes.
- For local browser verification, use a local static server because product JSON is loaded with `fetch()`.
- Do not use Safari unless explicitly approved by the user for that single check.
