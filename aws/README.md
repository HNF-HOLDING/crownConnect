# CrownConnect AWS backend

The `crownconnect-production` CloudFormation stack in `af-south-1` provides Cognito,
API Gateway, Lambda, RDS PostgreSQL, S3 media storage, networking, and secrets.

Package and deploy a Lambda revision from `aws/api`:

```sh
npm run package
aws s3 cp ../dist/crownconnect-api.zip s3://crownconnect-production-mediabucket-z4rmkpl6thu1/deployments/crownconnect-api-vNEXT.zip --region af-south-1
aws cloudformation update-stack --stack-name crownconnect-production --region af-south-1 --template-body file://../template.yaml --parameters ParameterKey=Environment,UsePreviousValue=true ParameterKey=DatabaseName,UsePreviousValue=true ParameterKey=DatabaseUsername,UsePreviousValue=true ParameterKey=DeployApiPackage,ParameterValue=true ParameterKey=ApiPackageKey,ParameterValue=deployments/crownconnect-api-vNEXT.zip --capabilities CAPABILITY_NAMED_IAM
aws cloudformation wait stack-update-complete --stack-name crownconnect-production --region af-south-1
```

Smoke-test with `/health`. Authenticated route testing requires a Cognito ID token.
