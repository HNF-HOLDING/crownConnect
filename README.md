# CrownConnect

CrownConnect is a South African hair marketplace running on AWS.

## Architecture

- Next.js frontend hosted by AWS Amplify Hosting.
- Amazon Cognito for customer and seller authentication.
- API Gateway and Lambda for the application API.
- Amazon RDS PostgreSQL for profiles, services, and bookings.
- Amazon S3 for private seller portfolio media with signed URLs.
- CloudFormation infrastructure in `aws/template.yaml`.

## Local development

Use Node 22 or newer and pnpm:

```sh
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Run the production check with `pnpm build`.

## Amplify Hosting

The repository includes `amplify.yml`. Configure these variables on the Amplify branch:

- `NEXT_PUBLIC_CROWCONNECT_API_URL`
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID`

Connect the GitHub repository, deploy a test branch, verify authentication, marketplace,
booking, Seller Studio, uploads, and booking management, then attach the production domain.

Never commit AWS credentials, database passwords, Cognito test passwords, or signed S3 URLs.
