'use client';

import Link from 'next/link';
import { Camera, CheckCircle2, Star } from 'lucide-react';
import { useState } from 'react';
import { PortalHeader } from '../../portal-header';

function StarInput({ label }: { label:string }) { const [value,setValue]=useState(0); return <div className="star-input"><span>{label}</span><div>{[1,2,3,4,5].map(star=><button type="button" onClick={()=>setValue(star)} aria-label={`${star} stars`} key={star}><Star fill={star<=value?'currentColor':'none'}/></button>)}</div></div> }
export default function NewReviewPage() { const [complete,setComplete]=useState(false); if(complete)return <><PortalHeader portal="customer"/><main className="checkout-success"><CheckCircle2/><p className="kicker">REVIEW SUBMITTED</p><h1>Thank you.</h1><p>Your experience helps customers choose confidently and helps professionals grow.</p><Link className="cc-button" href="/customer/dashboard">Return to dashboard</Link></main></>; return <><PortalHeader portal="customer"/><main className="review-page"><header><p className="kicker">AFTER YOUR APPOINTMENT</p><h1>How was your look?</h1><p>Share an honest review of the service you received.</p></header><form onSubmit={event=>{event.preventDefault();setComplete(true)}}><StarInput label="Overall experience"/><StarInput label="Service quality"/><StarInput label="Professionalism"/><StarInput label="Value for money"/><label>Write your review<textarea required minLength={20} placeholder="Tell us about your appointment, result and stylist…"/></label><label className="review-upload"><Camera/><span><strong>Add your final hairstyle photo</strong><small>Customer result photos are labelled separately from the stylist portfolio.</small></span><input type="file" accept="image/jpeg,image/png,image/webp"/></label><button className="cc-button full">Submit review</button></form></main></>;
}
