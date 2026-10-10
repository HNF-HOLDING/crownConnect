const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { Webhook } = require('svix');

const lambda = new LambdaClient({});
const secrets = new SecretsManagerClient({});
let cachedSettings;

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': process.env.FRONTEND_ORIGIN,
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-allow-methods': 'POST,OPTIONS',
  },
  body: JSON.stringify(body),
});

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
  const secret = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.OZOW_SECRET_ARN }));
  cachedSettings = JSON.parse(secret.SecretString || '{}');
  return cachedSettings;
}

function configured(config) {
  return config.enabled === true && config.clientId && config.clientSecret && config.siteCode && config.webhookSecret;
}

async function invokeOrders(internalAction, values) {
  const result = await lambda.send(new InvokeCommand({
    FunctionName: process.env.ORDER_FUNCTION_NAME,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ internalAction, ...values })),
  }));
  if (result.FunctionError) throw new Error(`Order service invocation failed: ${result.FunctionError}`);
  return JSON.parse(Buffer.from(result.Payload || []).toString('utf8') || '{}');
}

function apiBase(config) {
  return config.environment === 'production' ? 'https://one.ozow.com/v1' : 'https://stagingone.ozow.com/v1';
}

async function accessToken(config) {
  const form = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: 'payments',
    grant_type: 'client_credentials',
  });
  const tokenResponse = await fetch(`${apiBase(config)}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(10000),
  });
  const payload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !payload.access_token) throw new Error('Ozow authentication failed.');
  return payload.access_token;
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
  if (!configured(config)) return response(503, { error: 'Ozow payment setup is pending. Your order is safely saved and no money has been charged.', setupPending: true });

  const token = await accessToken(config);
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const paymentResponse = await fetch(`${apiBase(config)}/payments`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'idempotency-key': order.reference,
    },
    body: JSON.stringify({
      siteCode: config.siteCode,
      region: 'ZA',
      amount: { currency: 'ZAR', value: order.totalCents / 100 },
      merchantReference: order.reference,
      payerReference: order.orderNumber,
      expireAt: expires,
      returnUrl: `${process.env.FRONTEND_ORIGIN}/customer/dashboard?payment=return`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const payment = await paymentResponse.json().catch(() => ({}));
  if (!paymentResponse.ok || !payment.id || !payment.redirectUrl) {
    console.error('Ozow payment creation failed', paymentResponse.status, payment);
    return response(502, { error: 'Ozow could not start the payment. Please try again.' });
  }
  const redirect = new URL(payment.redirectUrl);
  if (redirect.protocol !== 'https:') throw new Error('Ozow returned an unsafe redirect URL.');
  const recorded = await invokeOrders('recordPayment', { orderId: order.orderId, paymentId: payment.id });
  if (!recorded.ok) return response(recorded.statusCode || 409, { error: recorded.error || 'Payment could not be linked to the order.' });
  return response(200, { paymentUrl: redirect.toString(), paymentId: payment.id, reference: order.reference });
}

function webhookValues(payload) {
  const data = payload.data || payload;
  const amount = data.amount?.value ?? data.amount;
  return {
    eventType: payload.type || payload.eventType || '',
    paymentId: String(data.id || data.transactionId || data.paymentId || ''),
    reference: String(data.merchantReference || data.merchant_reference || ''),
    paymentStatus: String(data.status || ''),
    amountCents: Number.isFinite(Number(amount)) ? Math.round(Number(amount) * 100) : NaN,
  };
}

async function processWebhook(event) {
  const config = await settings();
  if (!configured(config)) return response(503, { error: 'Ozow webhook is not configured.' });
  const body = rawBody(event), headers = event.headers || {};
  let payload;
  try {
    payload = new Webhook(config.webhookSecret).verify(body, {
      'svix-id': headers['svix-id'] || headers['Svix-Id'],
      'svix-timestamp': headers['svix-timestamp'] || headers['Svix-Timestamp'],
      'svix-signature': headers['svix-signature'] || headers['Svix-Signature'],
    });
  } catch (cause) {
    console.warn('Rejected invalid Ozow webhook', cause?.message);
    return response(401, { error: 'Invalid webhook signature.' });
  }
  const values = webhookValues(payload);
  if (values.paymentStatus !== 'Successful') return response(200, { received: true });
  if (!values.paymentId || !values.reference || !Number.isInteger(values.amountCents)) {
    console.error('Ozow successful webhook lacks required transaction fields', values);
    return response(422, { error: 'Webhook transaction data is incomplete.' });
  }
  const confirmed = await invokeOrders('confirmPayment', values);
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
