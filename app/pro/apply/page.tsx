'use client';

import Link from 'next/link';
import { SyntheticEvent, useEffect, useState } from 'react';
import { awsApi, cognitoToken } from '../../aws-client';
import { PortalHeader } from '../../portal-header';

type Application = {
  id: string;
  legal_name: string;
  business_name: string;
  phone: string;
  city: string;
  province: string;
  service_area: string;
  categories: string;
  years_experience: number;
  bio: string;
  business_registration_number: string;
  identity_type: string;
  identity_number: string;
  fulfilment_model: string;
  collection_street_address: string;
  collection_suburb: string;
  collection_city: string;
  collection_province: string;
  collection_postal_code: string;
  returns_same_as_collection: boolean;
  return_street_address: string;
  return_suburb: string;
  return_city: string;
  return_province: string;
  return_postal_code: string;
  bank_account_holder: string;
  bank_name: string;
  bank_account_number: string;
  bank_branch_code: string;
  bank_account_type: string;
  default_stock_quantity: number;
  default_product_weight_kg: number;
  default_package_length_cm: number;
  default_package_width_cm: number;
  default_package_height_cm: number;
  handling_days: number;
  verification_consent: boolean;
  status: string;
  review_note: string;
  submitted_at: string;
};
const provinces = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];

export default function ProApply() {
  const [application, setApplication] = useState<Application | null>(null),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(''),
    [returnsSame, setReturnsSame] = useState(true);
  useEffect(() => {
    void (async () => {
      if (!(await cognitoToken())) {
        window.location.replace(
          '/sign-in?mode=signup&portal=pro&next=/pro/apply',
        );
        return;
      }
      const response = await awsApi('/pro/application'),
        data = await response.json();
      if (response.ok) {
        setApplication(data.application);
        setReturnsSame(data.application?.returns_same_as_collection ?? true);
      } else setMessage(data.error || 'Unable to load your application.');
      setLoading(false);
    })();
  }, []);
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await awsApi('/pro/application', {
      method: 'POST',
      body: JSON.stringify({
        legalName: form.get('legalName'),
        businessName: form.get('businessName'),
        phone: form.get('phone'),
        city: form.get('city'),
        province: form.get('province'),
        serviceArea: form.get('serviceArea'),
        categories: form.get('categories'),
        yearsExperience: Number(form.get('yearsExperience')),
        bio: form.get('bio'),
        businessRegistrationNumber: form.get('businessRegistrationNumber'),
        identityType: form.get('identityType'),
        identityNumber: form.get('identityNumber'),
        fulfilmentModel: form.get('fulfilmentModel'),
        collectionStreetAddress: form.get('collectionStreetAddress'),
        collectionSuburb: form.get('collectionSuburb'),
        collectionCity: form.get('collectionCity'),
        collectionProvince: form.get('collectionProvince'),
        collectionPostalCode: form.get('collectionPostalCode'),
        returnsSameAsCollection: form.get('returnsSameAsCollection') === 'on',
        returnStreetAddress: form.get('returnStreetAddress'),
        returnSuburb: form.get('returnSuburb'),
        returnCity: form.get('returnCity'),
        returnProvince: form.get('returnProvince'),
        returnPostalCode: form.get('returnPostalCode'),
        bankAccountHolder: form.get('bankAccountHolder'),
        bankName: form.get('bankName'),
        bankAccountNumber: form.get('bankAccountNumber'),
        bankBranchCode: form.get('bankBranchCode'),
        bankAccountType: form.get('bankAccountType'),
        defaultStockQuantity: Number(form.get('defaultStockQuantity')),
        defaultProductWeightKg: Number(form.get('defaultProductWeightKg')),
        defaultPackageLengthCm: Number(form.get('defaultPackageLengthCm')),
        defaultPackageWidthCm: Number(form.get('defaultPackageWidthCm')),
        defaultPackageHeightCm: Number(form.get('defaultPackageHeightCm')),
        handlingDays: Number(form.get('handlingDays')),
        verificationConsent: form.get('verificationConsent') === 'on',
        providerAgreement: form.get('providerAgreement') === 'on',
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setApplication(data.application);
      setMessage('Application submitted for CrownConnect review.');
    } else setMessage(data.error || 'Unable to submit your application.');
    setSaving(false);
  }
  const editable =
    !application ||
    application.status === 'more_information' ||
    application.status === 'rejected';
  return (
    <>
      <PortalHeader portal="pro" />
      <main className="page-shell pro-application-page">
        <div className="page-top">
          <div>
            <p className="eyebrow">CROWNCONNECT PRO APPLICATION</p>
            <h1>
              {application
                ? 'Application status'
                : 'Apply to join CrownConnect Pro.'}
            </h1>
          </div>
          <Link href="/pro">Back to Pro home</Link>
        </div>
        {loading ? (
          <div className="empty">Loading your application…</div>
        ) : (
          <>
            {application && (
              <section
                className={`application-status status-${application.status}`}
              >
                <span>{application.status.replace('_', ' ')}</span>
                <h2>{application.business_name}</h2>
                <p>
                  {application.status === 'approved'
                    ? 'Your business is approved. You can now open CrownConnect Pro.'
                    : application.status === 'more_information'
                      ? 'CrownConnect needs more information before continuing.'
                      : application.status === 'rejected'
                        ? 'This application was not approved. You may update and resubmit it.'
                        : 'Your application is safely submitted and awaiting review.'}
                </p>
                {application.review_note && (
                  <p>
                    <strong>Review note:</strong> {application.review_note}
                  </p>
                )}
                {application.status === 'approved' && (
                  <Link className="button" href="/pro/dashboard">
                    Open Pro workspace
                  </Link>
                )}
              </section>
            )}
            {editable && (
              <form className="panel registration-form" onSubmit={submit}>
                <header className="onboarding-section-heading">
                  <span>1</span>
                  <div>
                    <h2>Business and professional profile</h2>
                    <p>
                      Details customers and the CrownConnect review team need.
                    </p>
                  </div>
                </header>
                <div className="form-grid">
                  <label className="field">
                    Legal full name
                    <input
                      name="legalName"
                      required
                      maxLength={100}
                      defaultValue={application?.legal_name}
                    />
                  </label>
                  <label className="field">
                    Business or trading name
                    <input
                      name="businessName"
                      required
                      maxLength={120}
                      defaultValue={application?.business_name}
                    />
                  </label>
                  <label className="field">
                    Mobile or WhatsApp
                    <input
                      name="phone"
                      type="tel"
                      required
                      maxLength={30}
                      defaultValue={application?.phone}
                    />
                  </label>
                  <label className="field">
                    Years of experience
                    <input
                      name="yearsExperience"
                      type="number"
                      min="0"
                      max="80"
                      required
                      defaultValue={application?.years_experience ?? 0}
                    />
                  </label>
                  <label className="field">
                    Town or city
                    <input
                      name="city"
                      required
                      maxLength={80}
                      defaultValue={application?.city}
                    />
                  </label>
                  <label className="field">
                    Province
                    <select
                      name="province"
                      required
                      defaultValue={application?.province || ''}
                    >
                      <option value="" disabled>
                        Select province
                      </option>
                      {provinces.map((province) => (
                        <option key={province}>{province}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field full">
                    Service area
                    <input
                      name="serviceArea"
                      required
                      maxLength={120}
                      placeholder="e.g. Cape Town CBD and Southern Suburbs"
                      defaultValue={application?.service_area}
                    />
                  </label>
                  <label className="field full">
                    Service categories
                    <input
                      name="categories"
                      required
                      maxLength={300}
                      placeholder="e.g. Braids, wigs, natural hair"
                      defaultValue={application?.categories}
                    />
                  </label>
                  <label className="field full">
                    Professional background
                    <textarea
                      name="bio"
                      required
                      minLength={40}
                      maxLength={1000}
                      defaultValue={application?.bio}
                    />
                  </label>
                </div>
                <header className="onboarding-section-heading">
                  <span>2</span>
                  <div>
                    <h2>Identity and business verification</h2>
                    <p>
                      These details are private and only available to authorised
                      reviewers.
                    </p>
                  </div>
                </header>
                <div className="form-grid">
                  <label className="field">
                    Verification document
                    <select
                      name="identityType"
                      required
                      defaultValue={
                        application?.identity_type || 'south_african_id'
                      }
                    >
                      <option value="south_african_id">South African ID</option>
                      <option value="passport">Passport</option>
                      <option value="business_registration">
                        Business registration document
                      </option>
                    </select>
                  </label>
                  <label className="field">
                    ID, passport or registration number
                    <input
                      name="identityNumber"
                      required
                      maxLength={80}
                      autoComplete="off"
                      defaultValue={application?.identity_number}
                    />
                  </label>
                  <label className="field full">
                    Company registration number (optional for sole traders)
                    <input
                      name="businessRegistrationNumber"
                      maxLength={80}
                      defaultValue={application?.business_registration_number}
                    />
                  </label>
                </div>
                <label className="registration-choice">
                  <input
                    type="checkbox"
                    name="verificationConsent"
                    aria-label="Consent to identity and business verification"
                    required
                    defaultChecked={application?.verification_consent}
                  />
                  <span>
                    <strong>
                      I consent to identity and business verification
                    </strong>
                    <small>
                      CrownConnect may request supporting documents before
                      approval.
                    </small>
                  </span>
                </label>
                <header className="onboarding-section-heading">
                  <span>3</span>
                  <div>
                    <h2>Fulfilment model</h2>
                    <p>
                      Warehouse fulfilment remains available alongside direct
                      collection from your business.
                    </p>
                  </div>
                </header>
                <label className="field">
                  How should products be fulfilled?
                  <select
                    name="fulfilmentModel"
                    required
                    defaultValue={
                      application?.fulfilment_model || 'seller_direct'
                    }
                  >
                    <option value="seller_direct">
                      Seller direct — courier collects from me
                    </option>
                    <option value="crownconnect_warehouse">
                      CrownConnect warehouse — send stock in bulk
                    </option>
                    <option value="hybrid">
                      Hybrid — use both depending on the product
                    </option>
                  </select>
                </label>
                <h3 className="form-subheading">Collection address</h3>
                <p className="form-help">
                  Kept private and used only for stock transfers or courier
                  collection.
                </p>
                <div className="form-grid">
                  <label className="field full">
                    Street address
                    <input
                      name="collectionStreetAddress"
                      required
                      maxLength={200}
                      autoComplete="street-address"
                      defaultValue={application?.collection_street_address}
                    />
                  </label>
                  <label className="field">
                    Suburb
                    <input
                      name="collectionSuburb"
                      required
                      maxLength={100}
                      defaultValue={application?.collection_suburb}
                    />
                  </label>
                  <label className="field">
                    City
                    <input
                      name="collectionCity"
                      required
                      maxLength={80}
                      defaultValue={application?.collection_city}
                    />
                  </label>
                  <label className="field">
                    Province
                    <select
                      name="collectionProvince"
                      required
                      defaultValue={application?.collection_province || ''}
                    >
                      <option value="" disabled>
                        Select province
                      </option>
                      {provinces.map((province) => (
                        <option key={province}>{province}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Postal code
                    <input
                      name="collectionPostalCode"
                      required
                      maxLength={12}
                      inputMode="numeric"
                      defaultValue={application?.collection_postal_code}
                    />
                  </label>
                </div>
                <label className="registration-choice">
                  <input
                    type="checkbox"
                    name="returnsSameAsCollection"
                    aria-label="Use the collection address for returns"
                    checked={returnsSame}
                    onChange={(event) => setReturnsSame(event.target.checked)}
                  />
                  <span>
                    <strong>Use collection address for returns</strong>
                    <small>
                      Turn this off to provide a separate returns address.
                    </small>
                  </span>
                </label>
                {!returnsSame && (
                  <div className="form-grid conditional-fields">
                    <label className="field full">
                      Returns street address
                      <input
                        name="returnStreetAddress"
                        required
                        maxLength={200}
                        defaultValue={application?.return_street_address}
                      />
                    </label>
                    <label className="field">
                      Returns suburb
                      <input
                        name="returnSuburb"
                        required
                        maxLength={100}
                        defaultValue={application?.return_suburb}
                      />
                    </label>
                    <label className="field">
                      Returns city
                      <input
                        name="returnCity"
                        required
                        maxLength={80}
                        defaultValue={application?.return_city}
                      />
                    </label>
                    <label className="field">
                      Returns province
                      <select
                        name="returnProvince"
                        required
                        defaultValue={application?.return_province || ''}
                      >
                        <option value="" disabled>
                          Select province
                        </option>
                        {provinces.map((province) => (
                          <option key={province}>{province}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Returns postal code
                      <input
                        name="returnPostalCode"
                        required
                        maxLength={12}
                        inputMode="numeric"
                        defaultValue={application?.return_postal_code}
                      />
                    </label>
                  </div>
                )}
                <header className="onboarding-section-heading">
                  <span>4</span>
                  <div>
                    <h2>Payout details</h2>
                    <p>
                      Private banking details used only for verified seller
                      payouts.
                    </p>
                  </div>
                </header>
                <div className="form-grid">
                  <label className="field full">
                    Account holder
                    <input
                      name="bankAccountHolder"
                      required
                      maxLength={120}
                      autoComplete="off"
                      defaultValue={application?.bank_account_holder}
                    />
                  </label>
                  <label className="field">
                    Bank name
                    <input
                      name="bankName"
                      required
                      maxLength={80}
                      autoComplete="off"
                      defaultValue={application?.bank_name}
                    />
                  </label>
                  <label className="field">
                    Account type
                    <select
                      name="bankAccountType"
                      required
                      defaultValue={application?.bank_account_type || ''}
                    >
                      <option value="" disabled>
                        Select type
                      </option>
                      <option value="cheque">Cheque/current</option>
                      <option value="savings">Savings</option>
                      <option value="business">Business</option>
                    </select>
                  </label>
                  <label className="field">
                    Account number
                    <input
                      name="bankAccountNumber"
                      required
                      maxLength={40}
                      inputMode="numeric"
                      autoComplete="off"
                      defaultValue={application?.bank_account_number}
                    />
                  </label>
                  <label className="field">
                    Branch code
                    <input
                      name="bankBranchCode"
                      required
                      maxLength={20}
                      inputMode="numeric"
                      autoComplete="off"
                      defaultValue={application?.bank_branch_code}
                    />
                  </label>
                </div>
                <header className="onboarding-section-heading">
                  <span>5</span>
                  <div>
                    <h2>Stock and parcel defaults</h2>
                    <p>
                      Starting defaults only. Every product listing must confirm
                      its exact stock, weight and packed dimensions.
                    </p>
                  </div>
                </header>
                <div className="form-grid logistics-grid">
                  <label className="field">
                    Typical opening stock
                    <input
                      name="defaultStockQuantity"
                      type="number"
                      required
                      min="0"
                      max="100000"
                      defaultValue={application?.default_stock_quantity ?? 0}
                    />
                  </label>
                  <label className="field">
                    Handling time (business days)
                    <input
                      name="handlingDays"
                      type="number"
                      required
                      min="0"
                      max="30"
                      defaultValue={application?.handling_days ?? 1}
                    />
                  </label>
                  <label className="field">
                    Packed weight (kg)
                    <input
                      name="defaultProductWeightKg"
                      type="number"
                      required
                      min="0.001"
                      max="1000"
                      step="0.001"
                      defaultValue={
                        application?.default_product_weight_kg || ''
                      }
                    />
                  </label>
                  <label className="field">
                    Package length (cm)
                    <input
                      name="defaultPackageLengthCm"
                      type="number"
                      required
                      min="0.1"
                      max="500"
                      step="0.1"
                      defaultValue={
                        application?.default_package_length_cm || ''
                      }
                    />
                  </label>
                  <label className="field">
                    Package width (cm)
                    <input
                      name="defaultPackageWidthCm"
                      type="number"
                      required
                      min="0.1"
                      max="500"
                      step="0.1"
                      defaultValue={application?.default_package_width_cm || ''}
                    />
                  </label>
                  <label className="field">
                    Package height (cm)
                    <input
                      name="defaultPackageHeightCm"
                      type="number"
                      required
                      min="0.1"
                      max="500"
                      step="0.1"
                      defaultValue={
                        application?.default_package_height_cm || ''
                      }
                    />
                  </label>
                </div>
                <label className="registration-choice">
                  <input
                    type="checkbox"
                    name="providerAgreement"
                    aria-label="Accept the CrownConnect provider agreement"
                    required
                  />
                  <span>
                    <strong>I accept the provider agreement</strong>
                    <small>
                      I confirm these details are accurate and agree to
                      professional verification and marketplace standards.
                    </small>
                  </span>
                </label>
                <button className="button" disabled={saving}>
                  {saving
                    ? 'Submitting…'
                    : application
                      ? 'Update and resubmit'
                      : 'Submit application'}
                </button>
              </form>
            )}
            {message && <output className="notice">{message}</output>}
          </>
        )}
      </main>
    </>
  );
}
