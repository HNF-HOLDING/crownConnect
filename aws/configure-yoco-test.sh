#!/usr/bin/env bash
set -euo pipefail

YOCO_WEBHOOK_URL='https://t4rexmr9zk.execute-api.af-south-1.amazonaws.com/payments/webhook'
YOCO_SECRET_ID='crownconnect/production/yoco'
SECRET_INPUT_FILE="$(mktemp)"
chmod 600 "$SECRET_INPUT_FILE"
trap 'rm -f "$SECRET_INPUT_FILE"' EXIT

read -r -s -p 'Paste the NEW Yoco test secret key (hidden): ' YOCO_SECRET_KEY
printf '\n'

if [[ ! "$YOCO_SECRET_KEY" =~ ^sk_test_ ]]; then
  unset YOCO_SECRET_KEY
  echo 'Expected a new Yoco test secret beginning with sk_test_.' >&2
  exit 1
fi

EXISTING_WEBHOOKS="$(curl --fail-with-body --silent --show-error \
  'https://payments.yoco.com/api/webhooks' \
  -H "Authorization: Bearer $YOCO_SECRET_KEY")"
while IFS= read -r webhook_id; do
  [[ -z "$webhook_id" ]] && continue
  curl --fail-with-body --silent --show-error \
    -X DELETE "https://payments.yoco.com/api/webhooks/$webhook_id" \
    -H "Authorization: Bearer $YOCO_SECRET_KEY" >/dev/null
done < <(printf '%s' "$EXISTING_WEBHOOKS" | jq -r '.. | objects | select(.name? == "CrownConnect test payments") | .id // empty')

WEBHOOK_REQUEST="$(jq -nc --arg name 'CrownConnect test payments' --arg url "$YOCO_WEBHOOK_URL" '{name:$name,url:$url}')"
WEBHOOK_RESPONSE="$(curl --fail-with-body --silent --show-error \
  -X POST 'https://payments.yoco.com/api/webhooks' \
  -H "Authorization: Bearer $YOCO_SECRET_KEY" \
  -H 'Content-Type: application/json' \
  --data "$WEBHOOK_REQUEST")"
YOCO_WEBHOOK_SECRET="$(printf '%s' "$WEBHOOK_RESPONSE" | jq -er '.secret')"

jq -nc \
  --arg secretId "$YOCO_SECRET_ID" \
  --arg secretKey "$YOCO_SECRET_KEY" \
  --arg webhookSecret "$YOCO_WEBHOOK_SECRET" \
  '{SecretId:$secretId,SecretString:({enabled:true,secretKey:$secretKey,webhookSecret:$webhookSecret}|tojson)}' >"$SECRET_INPUT_FILE"
aws secretsmanager put-secret-value --region af-south-1 --cli-input-json "file://$SECRET_INPUT_FILE" >/dev/null

unset YOCO_SECRET_KEY YOCO_WEBHOOK_SECRET WEBHOOK_REQUEST WEBHOOK_RESPONSE EXISTING_WEBHOOKS
echo 'Yoco test checkout and signed webhook are now configured in AWS Secrets Manager.'
