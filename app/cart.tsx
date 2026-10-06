'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useState } from 'react';
import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { products } from './marketplace-data';

type CartLine = { id: string; quantity: number };
type CartContextValue = { lines: CartLine[]; count: number; total: number; open: boolean; setOpen: (open: boolean) => void; add: (id: string) => void; change: (id: string, amount: number) => void; clear: () => void };
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]); const [open, setOpen] = useState(false);
  useEffect(() => { const saved = window.localStorage.getItem('crownconnect-cart'); if (saved) window.requestAnimationFrame(() => setLines(JSON.parse(saved))); }, []);
  useEffect(() => { window.localStorage.setItem('crownconnect-cart', JSON.stringify(lines)); }, [lines]);
  const add = (id: string) => { setLines(current => current.some(line => line.id === id) ? current.map(line => line.id === id ? {...line, quantity: line.quantity + 1} : line) : [...current, { id, quantity: 1 }]); setOpen(true); };
  const change = (id: string, amount: number) => setLines(current => current.map(line => line.id === id ? {...line, quantity: line.quantity + amount} : line).filter(line => line.quantity > 0));
  const value = { lines, count: lines.reduce((sum,line)=>sum+line.quantity,0), total: lines.reduce((sum,line)=>sum+(products.find(p=>p.id===line.id)?.price ?? 0)*line.quantity,0), open, setOpen, add, change, clear:()=>setLines([]) };
  return <CartContext.Provider value={value}>{children}<CartDrawer/></CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error('useCart requires CartProvider'); return value; }
export function CartButton() { const { count, setOpen } = useCart(); return <button className="header-cart" onClick={()=>setOpen(true)} aria-label={`Open cart with ${count} items`}><ShoppingBag/><span>{count}</span></button>; }
export function AddToCartButton({ id, children = 'Add to cart', className = 'cc-button' }: { id: string; children?: React.ReactNode; className?: string }) { const { add } = useCart(); return <button className={className} onClick={()=>add(id)}>{children}</button>; }
function CartDrawer() { const { lines, total, open, setOpen, change } = useCart(); return <><button className={`cart-scrim ${open?'open':''}`} onClick={()=>setOpen(false)} aria-label="Close cart"/><aside className={`cart-drawer ${open?'open':''}`} aria-label="Shopping cart"><header><div><p className="kicker">YOUR BAG</p><h2>Cart</h2></div><button onClick={()=>setOpen(false)}><X/></button></header><div className="cart-lines">{lines.length ? lines.map(line=>{ const product=products.find(p=>p.id===line.id); if(!product)return null; return <article key={line.id}><div className={`editorial-image cell-${product.cell}`}/><div><strong>{product.name}</strong><small>R{product.price.toFixed(2)}</small><div><button onClick={()=>change(line.id,-1)}><Minus/></button><span>{line.quantity}</span><button onClick={()=>change(line.id,1)}><Plus/></button></div></div></article>}) : <div className="cart-empty"><ShoppingBag/><h3>Your bag is empty</h3><p>Shop stylist-approved hair and care.</p></div>}</div>{lines.length>0&&<footer><div><span>Subtotal</span><strong>R{total.toFixed(2)}</strong></div><Link className="cc-button full" href="/checkout" onClick={()=>setOpen(false)}>Checkout securely</Link><small>Delivery calculated at checkout</small></footer>}</aside></> }
