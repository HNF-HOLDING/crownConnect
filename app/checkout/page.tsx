'use client';

import Link from 'next/link';
import { CheckCircle2, CreditCard, LockKeyhole, MapPin } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { PortalHeader } from '../portal-header';
import { useCart } from '../cart';
import { products } from '../marketplace-data';
import { awsApi, cognitoToken } from '../aws-client';

type CreatedOrder = { id: string; order_number: string; status: string; total: number };

export default function CheckoutPage() {
  const { lines, total, clear } = useCart();
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const delivery = lines.length && total < 1000 ? 75 : 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lines.length || sending) return;
    setSending(true);
    setMessage('');
    try {
      const token = await Promise.race([
        cognitoToken(),
        new Promise<null>((_, reject) =>
          window.setTimeout(
            () => reject(new Error('Authentication timed out')),
            12000,
          ),
        ),
      ]);
      if (!token) {
        window.location.href = '/sign-in?portal=customer&next=/checkout';
        return;
      }
      const fields = new FormData(event.currentTarget);
      const response = await awsApi('/orders', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: fields.get('fullName'),
          phone: fields.get('phone'),
          streetAddress: fields.get('streetAddress'),
          city: fields.get('city'),
          province: fields.get('province'),
          lines,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error || 'Unable to reserve this order.');
        return;
      }
      setOrder(payload.order);
      clear();
      const paymentResponse = await awsApi('/payments/initialize', {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: Number(payload.order.id) }),
      });
      const payment = await paymentResponse.json().catch(() => ({}));
      if (paymentResponse.ok && payment.paymentUrl) {
        window.location.assign(payment.paymentUrl);
        return;
      }
      setPaymentMessage(
        payment.error ||
          'Your order is saved, but payment could not start. You can retry from your orders.',
      );
    } catch (cause) {
      console.error(cause);
      setMessage(
        'Your secure session could not complete the order. Please sign in again and retry.',
      );
    } finally {
      setSending(false);
    }
  }

  if (order)
    return (
      <>
        <PortalHeader portal="customer" />
        <main className="checkout-success">
          <CheckCircle2 />
          <p className="kicker">ORDER RESERVED</p>
          <h1>Beautiful choice.</h1>
          <p>
            Order <strong>{order.order_number}</strong> is saved securely. Its
            status is <strong>awaiting payment</strong>; no money has been
            charged.
          </p>
          <p>{paymentMessage || 'Preparing the secure Ozow payment page…'}</p>
          <Link className="cc-button" href="/customer/dashboard#orders">
            View my orders
          </Link>
        </main>
      </>
    );
  return (
    <>
      <PortalHeader portal="customer" />
      <main className="checkout-page">
        <header>
          <p className="kicker">SECURE CHECKOUT</p>
          <h1>Complete your order.</h1>
          <p>Prices and stock are verified by CrownConnect when you submit.</p>
        </header>
        <div className="checkout-layout">
          <form onSubmit={submit}>
            <section>
              <h2>
                <MapPin /> Delivery details
              </h2>
              <div className="checkout-fields">
                <label>
                  Full name
                  <input
                    name="fullName"
                    required
                    maxLength={120}
                    autoComplete="name"
                    placeholder="Your full name"
                  />
                </label>
                <label>
                  Phone number
                  <input
                    name="phone"
                    required
                    maxLength={30}
                    type="tel"
                    autoComplete="tel"
                    placeholder="+27"
                  />
                </label>
                <label className="full">
                  Street address
                  <input
                    name="streetAddress"
                    required
                    maxLength={240}
                    autoComplete="street-address"
                    placeholder="Street and suburb"
                  />
                </label>
                <label>
                  City
                  <input
                    name="city"
                    required
                    maxLength={80}
                    autoComplete="address-level2"
                    placeholder="Pretoria"
                  />
                </label>
                <label>
                  Province
                  <select name="province">
                    <option>Gauteng</option>
                    <option>Western Cape</option>
                    <option>KwaZulu-Natal</option>
                    <option>Eastern Cape</option>
                    <option>Free State</option>
                    <option>Limpopo</option>
                    <option>Mpumalanga</option>
                    <option>North West</option>
                    <option>Northern Cape</option>
                  </select>
                </label>
              </div>
            </section>
            <section>
              <h2>
                <CreditCard /> Payment status
              </h2>
              <div className="payment-placeholder">
                <LockKeyhole />
                <div>
                  <strong>No payment will be taken yet</strong>
                  <p>
                    This creates an awaiting-payment order. Card and Instant EFT
                    will be added through a verified provider next.
                  </p>
                </div>
              </div>
              <label className="terms-check">
                <input type="checkbox" required /> I agree to the order and
                cancellation terms.
              </label>
              {message && (
                <p className="notice" role="alert">
                  {message}{' '}
                  <Link href="/sign-in?portal=customer&next=/checkout">
                    Sign in again
                  </Link>
                  .
                </p>
              )}
              <button
                className="cc-button full"
                disabled={!lines.length || sending}
              >
                {sending
                  ? 'Reserving order…'
                  : `Reserve order · R${(total + delivery).toFixed(2)}`}
              </button>
            </section>
          </form>
          <aside className="order-summary">
            <h2>Order summary</h2>
            {lines.length ? (
              lines.map((line) => {
                const product = products.find((p) => p.id === line.id);
                if (!product) return null;
                return (
                  <div className="checkout-line" key={line.id}>
                    <span className={`product-thumb cell-${product.cell}`} />
                    <span>
                      <strong>{product.name}</strong>
                      <small>Quantity {line.quantity}</small>
                    </span>
                    <b>R{(product.price * line.quantity).toFixed(2)}</b>
                  </div>
                );
              })
            ) : (
              <div className="empty">
                Your cart is empty. <Link href="/shop">Visit the shop</Link>.
              </div>
            )}
            <div className="price-summary">
              <div>
                <span>Subtotal</span>
                <strong>R{total.toFixed(2)}</strong>
              </div>
              <div>
                <span>Delivery</span>
                <strong>{delivery ? `R${delivery.toFixed(2)}` : 'Free'}</strong>
              </div>
              <div className="total">
                <span>Total</span>
                <strong>R{(total + delivery).toFixed(2)}</strong>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
