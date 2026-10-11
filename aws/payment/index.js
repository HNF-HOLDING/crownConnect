const crypto = require('crypto');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const lambda = new LambdaClient({});
const secrets = new SecretsManagerClient({});
let cachedSettings;

const response = (statusCode, body) => ({ statusCode, headers: {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': process.env.FRONTEND_ORIGIN,
  'access-control-allow-headers': 'content-type,authorization',
  'access-control-allow-methods': 'POST,OPTIONS',
}, body: JSON.stringify(body) });

function claims(event) {
  const jwt = event.requestContext?.authorizer?.jwt?.claims;
  return jwt?.sub && jwt?.email ? { sub: jwt.sub, email: jwt.email } : null;
}

function rawBody(event) {
  const value = event.body || '';
  return event.isBase64Encoded ? Buffer.from(value, 'base64').toString('utf8') : value;
}

async function settings() {
  if (cachedSettings) return cachedSettings;
  const secret = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.YOCO_SECRET_ARN }));
  cachedSettings = JSON.parse(secret.SecretString || '{}');
  return cachedSettings;
}

const configured = (config) => config.enabled === true && /^sk_(test|live)_/.test(config.secretKey || '');

async function invokeOrders(internalAction, values) {
  const result = await lambda.send(new InvokeCommand({
    FunctionName: process.env.ORDER_FUNCTION_NAME,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ internalAction, ...values })),
  }));
  if (result.FunctionError) throw new Error(`Order service invocation failed: ${result.FunctionError}`);
  return JSON.parse(Buffer.from(result.Payload || []).toString('utf8') || '{}');
}

async function initializePayment(event) {
  const user = claims(event);
  if (!user) return response(401, { error: 'Sign in required.' });
  let data;
  try { data = JSON.parse(rawBody(event) || '{}'); } catch { return response(400, { error: 'Invalid request body.' }); }
  const orderId = Number(data.orderId);
  if (!Number.isInteger(orderId)) return response(400, { error: 'Choose a valid order.' });
  const order = await invokeOrders('preparePayment', { orderId, customerSub: user.sub, customerEmail: user.email });
  if (!order.ok) return response(order.statusCode || 409, { error: order.error || 'Order cannot be paid.' });
  if (order.status === 'paid') return response(200, { paid: true, reference: order.reference });
  const config = await settings();
  if (!configured(config)) return response(503, { error: 'Yoco payment setup is pending. Your order is safely saved and no money has been charged.', setupPending: true });

  const paymentResponse = await fetch('https://payments.yoco.com/api/checkouts', {
    method: 'POST',
    headers: { authorization: `Bearer ${config.secretKey}`, 'content-type': 'application/json', 'idempotency-key': order.reference },
    body: JSON.stringify({
      amount: order.totalCents,
      currency: 'ZAR',
      successUrl: `${process.env.FRONTEND_ORIGIN}/customer/dashboard?payment=success`,
      cancelUrl: `${process.env.FRONTEND_ORIGIN}/customer/dashboard?payment=cancelled`,
      failureUrl: `${process.env.FRONTEND_ORIGIN}/customer/dashboard?payment=failed`,
      clientReferenceId: order.reference,
      externalId: order.reference,
      metadata: { orderId: String(order.orderId), orderNumber: order.orderNumber },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const checkout = await paymentResponse.json().catch(() => ({}));
  if (!paymentResponse.ok || !checkout.id || !checkout.redirectUrl) {
    console.error('Yoco checkout creation failed', paymentResponse.status, checkout);
    return response(502, { error: 'Yoco could not start the payment. Please try again.' });
  }
  const redirect = new URL(checkout.redirectUrl);
  if (redirect.protocol !== 'https:' || !redirect.hostname.endsWith('yoco.com')) throw new Error('Yoco returned an unsafe redirect URL.');
  const recorded = await invokeOrders('recordPayment', { orderId: order.orderId, checkoutId: checkout.id, provider: 'yoco' });
  if (!recorded.ok) return response(recorded.statusCode || 409, { error: recorded.error || 'Payment could not be linked to the order.' });
  return response(200, { paymentUrl: redirect.toString(), checkoutId: checkout.id, reference: order.reference });
}

function verifyWebhook(body, headers, secret) {
  const id = headers['webhook-id'] || headers['Webhook-Id'];
  const timestamp = headers['webhook-timestamp'] || headers['Webhook-Timestamp'];
  const signatures = headers['webhook-signature'] || headers['Webhook-Signature'];
  const timestampNumber = Number(timestamp);
  if (!id || !timestamp || !signatures || !Number.isFinite(timestampNumber)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) > 180 || !/^whsec_/.test(secret || '')) return false;
  const secretBytes = Buffer.from(secret.slice('whsec_'.length), 'base64');
  const expected = crypto.createHmac('sha256', secretBytes).update(`${id}.${timestamp}.${body}`).digest();
  return signatures.split(' ').some((item) => {
    const [version, signature] = item.split(',', 2);
    if (version !== 'v1' || !signature) return false;
    const provided = Buffer.from(signature, 'base64');
    return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
  });
}

async function processWebhook(event) {
  const config = await settings();
  if (!configured(config) || !config.webhookSecret) return response(503, { error: 'Yoco webhook is not configured.' });
  const body = rawBody(event), headers = event.headers || {};
  if (!verifyWebhook(body, headers, config.webhookSecret)) return response(401, { error: 'Invalid webhook signature.' });
  let eventData;
  try { eventData = JSON.parse(body); } catch { return response(400, { error: 'Invalid webhook body.' }); }
  if (eventData.type !== 'payment.succeeded') return response(200, { received: true });
  const payment = eventData.payload || {}, checkoutId = payment.metadata?.checkoutId;
  if (!checkoutId || !payment.id || !Number.isInteger(payment.amount) || payment.currency !== 'ZAR' || payment.status !== 'succeeded') {
    console.error('Yoco successful webhook lacks required payment fields', eventData);
    return response(422, { error: 'Webhook payment data is incomplete.' });
  }
  const confirmed = await invokeOrders('confirmPayment', { checkoutId, paymentId: payment.id, paymentStatus: payment.status, amountCents: payment.amount });
  if (!confirmed.ok) return response(confirmed.statusCode || 409, { error: confirmed.error || 'Payment could not be confirmed.' });
  return response(200, { received: true, duplicate: Boolean(confirmed.duplicate) });
}

exports.handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method, path = event.rawPath;
    if (method === 'OPTIONS') return response(204, {});
    if (method === 'POST' && path === '/payments/initialize') return initializePayment(event);
    if (method === 'POST' && path === '/payments/webhook') return processWebhook(event);
    return response(404, { error: 'Not found.' });
  } catch (cause) {
    console.error(cause);
    return response(500, { error: 'Unable to complete the payment request.' });
  }
};
