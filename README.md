# CrownConnect

A South African hair product and hairstylist marketplace prototype.

## Run locally

From this folder, run:

```sh
python3 -m http.server 4174 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4174 in your browser. No package installation or build is required.

## Features

- Browse hairstylist services and hair products.
- Filter by category and location, or search listing names and sellers.
- Browse straight, body wave, and curly weave samples.
- Preview booking requests, product quantities, and seller profiles.

## Project files

- `dist/index.html`: page structure and metadata.
- `dist/style.css`: responsive styling.
- `dist/app.js`: sample listings and marketplace interactions.
- `dist/assets/salon.jpeg`: supplied salon reference image.
- `.openai/hosting.json`: existing Sites project configuration.

## Prototype limitations

Listings and prices are illustrative. Seller profiles, bookings, and orders are previews only. There is no account system, database, checkout, payment processing, or delivery integration. No requests are sent to sellers.

The supplied salon flyer is reference content; confirm permission and current details before using it in a public commercial release.

## Validate

```sh
node --check dist/app.js
```

In the browser, check category and location filters, an empty search result, booking date validation, and product quantities from 1 to 10. Real seller onboarding and commerce services require further development.
