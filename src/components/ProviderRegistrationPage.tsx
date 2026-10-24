import React, { useRef, useState } from 'react';
import { ArrowLeft, FileImage, LoaderCircle, ShieldCheck, Upload, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import { ROUTES, navigateTo } from '../utils/appRoute';
import { uploadVerificationImageToCloudinary, type CloudinaryImage } from '../utils/cloudinary';
import { saveProviderProfile } from '../utils/providerProfile';

interface ProviderRegistrationPageProps {
  user: User;
}

type DocumentKey = 'electricityBill' | 'ownershipProof';

const DOCUMENTS: Array<{ key: DocumentKey; title: string; description: string }> = [
  { key: 'electricityBill', title: 'Electricity bill', description: 'Upload a recent bill for this property.' },
  { key: 'ownershipProof', title: 'Ownership confirmation', description: 'Upload a government document confirming ownership or authorization.' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const ProviderRegistrationPage: React.FC<ProviderRegistrationPageProps> = ({ user }) => {
  const [fullName, setFullName] = useState(user.displayName?.trim() ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [files, setFiles] = useState<Record<DocumentKey, File | null>>({ electricityBill: null, ownershipProof: null });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<DocumentKey, number>>({ electricityBill: 0, ownershipProof: 0 });
  const inputRefs = useRef<Record<DocumentKey, HTMLInputElement | null>>({ electricityBill: null, ownershipProof: null });

  const chooseFile = (key: DocumentKey, file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Each image must be 5 MB or smaller.');
      return;
    }
    setError('');
    setFiles((current) => ({ ...current, [key]: file }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!fullName.trim() || !email.trim() || !propertyAddress.trim()) {
      setError('Complete your name, email, and property address before continuing.');
      return;
    }
    if (!files.electricityBill || !files.ownershipProof) {
      setError('Upload both the electricity bill and ownership confirmation image to continue.');
      return;
    }

    setSaving(true);
    try {
      const uploads: Array<[DocumentKey, CloudinaryImage]> = [];
      for (const { key } of DOCUMENTS) {
        const file = files[key]!;
        const image = await uploadVerificationImageToCloudinary(file, (progress) => {
          setUploadProgress((current) => ({ ...current, [key]: progress }));
        });
        uploads.push([key, image]);
      }
      const uploadedDocuments = Object.fromEntries(uploads) as Record<DocumentKey, CloudinaryImage>;
      await saveProviderProfile(user.uid, {
        displayName: fullName.trim(),
        email: email.trim(),
        address: propertyAddress.trim(),
        propertyAddress: propertyAddress.trim(),
        electricityBillPublicId: uploadedDocuments.electricityBill.publicId,
        electricityBillVersion: uploadedDocuments.electricityBill.version,
        electricityBillFormat: uploadedDocuments.electricityBill.format,
        ownershipProofPublicId: uploadedDocuments.ownershipProof.publicId,
        ownershipProofVersion: uploadedDocuments.ownershipProof.version,
        ownershipProofFormat: uploadedDocuments.ownershipProof.format,
        applicationStatus: 'under_review',
        applicationReviewedAt: '',
        applicationReviewedBy: '',
        registrationCompletedAt: new Date().toISOString(),
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error
        ? `Could not submit your application: ${uploadError.message}`
        : 'Could not save your registration. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F7] font-body text-[#111]">
      <header className="sticky top-0 z-10 border-b border-neutral-800 bg-[#141414] text-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold uppercase tracking-[0.16em]">ChargeShare</span>
            <span className="rounded border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-white/80">Host</span>
          </div>
          <button type="button" onClick={() => navigateTo(ROUTES.landing)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/20 px-3 text-xs font-semibold text-white hover:bg-white/10">
            <ArrowLeft size={14} /> Explore map
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#555]">
            <ShieldCheck size={14} /> Provider registration · Step 1
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Set up your provider profile</h1>
          <p className="mt-2 text-sm leading-6 text-[#666]">Tell us about yourself and the property where you plan to host a charger.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-[#444]">
                Full name <span className="text-red-600">*</span>
                <input required autoComplete="name" maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[#D5D5D5] bg-white px-3 text-sm font-normal text-black outline-none focus:border-black" placeholder="Your full name" />
              </label>
              <label className="block text-xs font-semibold text-[#444]">
                Email <span className="text-red-600">*</span>
                <input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[#D5D5D5] bg-white px-3 text-sm font-normal text-black outline-none focus:border-black" placeholder="you@example.com" />
              </label>
            </div>

            <label className="block text-xs font-semibold text-[#444]">
              Property address <span className="text-red-600">*</span>
              <textarea required rows={3} maxLength={500} value={propertyAddress} onChange={(event) => setPropertyAddress(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-[#D5D5D5] bg-white px-3 py-2.5 text-sm font-normal text-black outline-none focus:border-black" placeholder="Full address of the property where the charger is located" />
            </label>

            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-bold">Property documents</h2>
                <p className="mt-1 text-xs leading-5 text-[#777]">Upload a clear image up to 5 MB. JPG, PNG, and WebP are accepted.</p>
              </div>
              {DOCUMENTS.map(({ key, title, description }) => (
                <div key={key} className="rounded-xl border border-[#DADADA] p-4">
                  <input
                    ref={(element) => { inputRefs.current[key] = element; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => chooseFile(key, event.target.files?.[0])}
                  />
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-[#F3F2F0] p-2.5"><FileImage size={18} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{title} <span className="text-red-600">*</span></p>
                      <p className="mt-1 text-xs leading-5 text-[#777]">{description}</p>
                      {files[key] && <p className="mt-2 truncate text-xs font-medium text-[#333]">{files[key]?.name}</p>}
                      {saving && files[key] && <p className="mt-1 text-[11px] text-[#666]">Uploading: {uploadProgress[key]}%</p>}
                    </div>
                    {files[key] ? (
                      <button type="button" aria-label={`Remove ${title}`} onClick={() => { setFiles((current) => ({ ...current, [key]: null })); if (inputRefs.current[key]) inputRefs.current[key]!.value = ''; }} className="rounded-lg border border-black/10 p-2 hover:bg-black/5"><X size={16} /></button>
                    ) : (
                      <button type="button" onClick={() => inputRefs.current[key]?.click()} className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-black/15 px-3 text-xs font-semibold hover:bg-black/5"><Upload size={14} /> Upload</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-800">{error}</p>}

            <button type="submit" disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60">
              {saving ? <><LoaderCircle size={17} className="animate-spin" /> Uploading and saving…</> : 'Save registration details'}
            </button>
            <p className="text-center text-[11px] leading-5 text-[#888]">Signed in as {user.email || email || 'your ChargeShare account'}</p>
        </form>
      </main>
    </div>
  );
};
