# CrownConnect AWS migration

This CloudFormation foundation creates the persistent AWS services in `af-south-1`:

- Amazon RDS PostgreSQL for accounts, salons, bookings, services, and products.
- Amazon S3 for portfolio photos and videos.
- Amazon Cognito for customer and seller sign-in.

The current application runs as a Cloudflare Worker and uses Cloudflare D1/R2 and ChatGPT sign-in. Its route handlers must be rewritten to use PostgreSQL, S3, and Cognito before an API Gateway/Lambda deployment can be safely created.

## Database conversion

`db/001_crownconnect_schema.sql` is the PostgreSQL schema for the AWS RDS database. It preserves the live application's account, customer application, salon, service, portfolio media, and booking data model, including the active-booking slot rule.

After RDS is created, run this migration once through a private database connection. Set the resulting AWS identifiers and database connection string in the Lambda environment using `aws/.env.example` as the key list. Do not commit real credentials.

Do not deploy `template.yaml` until the Lambda application package and private VPC/database networking are added. The RDS resource is deliberately private and needs subnet/security-group configuration before production deployment.
