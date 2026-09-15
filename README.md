# CrownConnect

A South African hair marketplace where signed-in sellers can publish a profile and customers can send appointment requests.

## What works

- Seller onboarding creates or updates one live business profile.
- Sellers set a featured service and price, then review incoming requests in Seller Studio.
- Customers request one of the available appointment slots; every request is stored as `pending` until the seller confirms or declines it.
- Marketplace listings and booking pages read from the project database. Authentication and permissions are handled server-side through the ChatGPT identity supplied to the site.

## Local development

Use Node 24+ and install dependencies with pnpm:

```sh
pnpm install
pnpm dev
```

The production check is:

```sh
pnpm build
```

## Data and deployment

The live production site uses the `DB` D1 binding declared in `.openai/hosting.json`. Drizzle migrations live in `drizzle/`; apply the generated migration when provisioning a new database.

The hosted site is public. Confirm that supplied salon imagery and business details may be used commercially before wider promotion.

## AWS migration

The current production application runs on its managed platform. The initial AWS foundation is in `aws/` and targets Africa (Cape Town): PostgreSQL in RDS, S3 media storage, and Cognito identity. The application must be converted from its current D1/R2 and platform-sign-in integrations before the AWS stack can replace the working public site.

## Key files

- `app/`: marketplace, booking, seller studio, and server routes.
- `db/schema.ts`: seller and booking-request schema.
- `db/queries.ts`: database reads and scoped lookup helpers.
- `drizzle/`: generated database migration and metadata.
