/**
 * EditProfileModal — view and edit the signed-in user's profile.
 *
 * Persistence:
 *  - displayName + photoURL → Firebase Auth updateProfile
 *  - phoneNumber            → Firestore users/{uid}
 *  - displayName + photoURL mirrored in Firestore for easy reads
 *  - email                  → read-only
 *  - profile photo          → Firebase Storage  profile-photos/{uid}/{filename}
 *
 * Photo upload flow:
 *  1. User clicks the avatar area or drags an image file onto it
 *  2. A local object URL is shown immediately as a preview
 *  3. On "Save Changes", the file is uploaded to Firebase Storage
 *  4. The resulting download URL is written to Auth + Firestore
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  Lock,
  Pencil,
  Upload,
  User,
  X,
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type FieldValue,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { auth, db, storage } from '../firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfileDoc {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  photoURL: string;
  provider: 'google' | 'password';
  updatedAt?: FieldValue;
  createdAt?: FieldValue;
}

interface FormState {
  displayName: string;
  phoneNumber: string;
}

interface FormErrors {
  displayName?: string;
  phoneNumber?: string;
  photo?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ─── Validation ───────────────────────────────────────────────────────────────

const INDIAN_PHONE_RE = /^(\+91|91|0)?[6-9]\d{9}$/;

function validateForm(form: FormState, photoFile: File | null): FormErrors {
  const errors: FormErrors = {};

  if (!form.displayName.trim()) {
    errors.displayName = 'Display name cannot be empty.';
  } else if (form.displayName.trim().length < 2) {
    errors.displayName = 'Must be at least 2 characters.';
  }

  if (form.phoneNumber.trim() && !INDIAN_PHONE_RE.test(form.phoneNumber.trim().replace(/\s/g, ''))) {
    errors.phoneNumber = 'Enter a valid 10-digit Indian mobile (e.g. 98201 54321).';
  }

  if (photoFile) {
    if (!ALLOWED_TYPES.includes(photoFile.type)) {
      errors.photo = 'Only JPEG, PNG, WebP, or GIF files are accepted.';
    } else if (photoFile.size > MAX_FILE_BYTES) {
      errors.photo = `File is too large. Maximum size is 5 MB.`;
    }
  }

  return errors;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProvider(user: FirebaseUser): 'google' | 'password' {
  return user.providerData[0]?.providerId === 'google.com' ? 'google' : 'password';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  src: string;
  fallbackName: string;
  size?: 'sm' | 'lg';
}

const Avatar: React.FC<AvatarProps> = ({ src, fallbackName, size = 'lg' }) => {
  const [imgError, setImgError] = useState(false);
  const prevSrc = useRef(src);

  if (src !== prevSrc.current) {
    prevSrc.current = src;
    if (imgError) setImgError(false);
  }

  const dim = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-8 h-8 text-xs';

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={fallbackName || 'Profile photo'}
        onError={() => setImgError(true)}
        className={`${dim} rounded-full object-cover border-2 border-[#D8D5CA] shrink-0`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${dim} rounded-full bg-[#173D2C] text-[#D8F36A] font-bold inline-flex items-center justify-center border-2 border-[#D8D5CA] shrink-0 select-none`}
    >
      {fallbackName ? getInitials(fallbackName) : <User className="w-5 h-5" />}
    </div>
  );
};

// ─── ProfileField ─────────────────────────────────────────────────────────────

interface ProfileFieldProps {
  label: string;
  value: string;
  note?: string;
  locked?: boolean;
}

const ProfileField: React.FC<ProfileFieldProps> = ({ label, value, note, locked }) => (
  <div className="p-3 bg-white border border-[#D8D5CA] rounded space-y-0.5">
    <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-[#888] font-semibold">
      {label}
      {locked && <Lock className="w-2.5 h-2.5" />}
    </div>
    <div className="text-sm font-medium text-[#22251F] break-all">{value}</div>
    {note && <div className="text-[10px] text-[#888]">{note}</div>}
  </div>
);

// ─── Photo upload zone ────────────────────────────────────────────────────────

interface PhotoPickerProps {
  previewSrc: string;        // local blob URL or existing photo URL
  fallbackName: string;
  uploadProgress: number;    // 0–100, shown while uploading
  isUploading: boolean;
  error?: string;
  onFileSelected: (file: File) => void;
}

const PhotoPicker: React.FC<PhotoPickerProps> = ({
  previewSrc,
  fallbackName,
  uploadProgress,
  isUploading,
  error,
  onFileSelected,
}) => {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File | undefined | null) => {
    if (!file) return;
    onFileSelected(file);
  }, [onFileSelected]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold text-[#22251F]">Profile Photo</span>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Click or drag to upload a profile photo"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative flex items-center gap-4 p-3 rounded border-2 border-dashed cursor-pointer transition-colors
          ${isDragging
            ? 'border-[#173D2C] bg-[#EAF5E3]'
            : 'border-[#D8D5CA] bg-white hover:border-[#173D2C] hover:bg-[#F6F3E9]'
          }`}
      >
        {/* Current avatar preview */}
        <Avatar src={previewSrc} fallbackName={fallbackName} size="lg" />

        {/* Upload prompt */}
        <div className="flex-1 min-w-0">
          {isUploading ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-[#173D2C] font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                Uploading… {uploadProgress}%
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-[#D8D5CA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#173D2C] rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#173D2C]">
                <Upload className="w-3.5 h-3.5 shrink-0" />
                {previewSrc ? 'Change photo' : 'Upload photo'}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                Click or drag &amp; drop · JPEG, PNG, WebP, GIF · max 5 MB
              </p>
            </>
          )}
        </div>

        {/* Camera badge */}
        <span
          aria-hidden="true"
          className="absolute bottom-2 left-[4.5rem] w-6 h-6 bg-[#173D2C] text-[#D8F36A] rounded-full flex items-center justify-center border-2 border-white pointer-events-none"
        >
          <ImagePlus className="w-3 h-3" />
        </span>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
        // Reset value so re-selecting the same file triggers onChange
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
      />

      {error && <p className="text-[#B42318] text-[11px]">{error}</p>}
    </div>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────

interface EditProfileModalProps {
  isOpen: boolean;
  /** Which pane to open on — 'view' for the read-only profile, 'edit' for the form. */
  initialView?: ModalView;
  onClose: () => void;
}

type ModalView = 'view' | 'edit';

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  initialView = 'view',
  onClose,
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [view, setView]               = useState<ModalView>(initialView);

  // Firestore extras cache
  const [fsProfile,      setFsProfile]      = useState<Partial<UserProfileDoc>>({});
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Authoritative local display values — updated immediately after save
  const [localDisplayName, setLocalDisplayName] = useState('');
  const [localPhotoURL,    setLocalPhotoURL]    = useState('');
  const [localPhone,       setLocalPhone]       = useState('');

  // Edit form
  const [form,   setForm]   = useState<FormState>({ displayName: '', phoneNumber: '' });
  const [errors, setErrors] = useState<FormErrors>({});

  // Photo state
  const [photoFile,       setPhotoFile]       = useState<File | null>(null);
  const [photoPreviewSrc, setPhotoPreviewSrc] = useState(''); // local blob or existing URL
  const previewBlobRef = useRef<string>('');  // track for revocation

  // Upload progress
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading,    setIsUploading]    = useState(false);

  // Save status
  const [saving,      setSaving]      = useState(false);
  const [saveStatus,  setSaveStatus]  = useState<'idle' | 'success' | 'auth-error' | 'fs-warning'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setLocalDisplayName(user.displayName || '');
        setLocalPhotoURL(user.photoURL || '');
      }
    });
    return unsub;
  }, []);

  // Honour the pane requested by the caller each time the modal is opened
  useEffect(() => {
    if (!isOpen) return;
    setView(initialView);
  }, [isOpen, initialView]);

  // Load Firestore profile when modal opens
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    let cancelled = false;
    setLoadingProfile(true);

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (!cancelled) {
          const data = snap.exists()
            ? (snap.data() as Partial<UserProfileDoc>)
            : {} as Partial<UserProfileDoc>;
          setFsProfile(data);
          setLocalPhone(data.phoneNumber || '');
          if (data.displayName) setLocalDisplayName(data.displayName);
          if (data.photoURL)    setLocalPhotoURL(data.photoURL);
        }
      } catch {
        if (!cancelled) setFsProfile({});
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, currentUser?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Populate edit form when switching to edit view
  useEffect(() => {
    if (view !== 'edit' || !currentUser) return;
    setForm({
      displayName: localDisplayName || currentUser.displayName || currentUser.email || '',
      phoneNumber: localPhone,
    });
    setPhotoFile(null);
    setPhotoPreviewSrc(localPhotoURL || currentUser.photoURL || '');
    setErrors({});
    setSaveStatus('idle');
    setSaveMessage('');
    setUploadProgress(0);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke old blob URLs to avoid memory leaks
  const setPhotoFileWithPreview = useCallback((file: File) => {
    if (previewBlobRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(previewBlobRef.current);
    }
    const blobUrl = URL.createObjectURL(file);
    previewBlobRef.current = blobUrl;
    setPhotoFile(file);
    setPhotoPreviewSrc(blobUrl);
    // Clear any previous photo error
    setErrors((prev) => ({ ...prev, photo: undefined }));
  }, []);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewBlobRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previewBlobRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <div role="dialog" aria-modal="true" aria-labelledby="profile-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
        <div className="bg-[#F6F3E9] border-2 border-[#22251F] rounded max-w-sm w-full p-6 space-y-4">
          <h2 id="profile-modal-title" className="text-lg font-bold font-display text-[#22251F]">Profile</h2>
          <p className="text-sm text-[#565A52]">Sign in to view your profile.</p>
          <div className="flex justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#F6F3E9] bg-[#173D2C] rounded cursor-pointer">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const provider    = getProvider(currentUser);
  const displayName = localDisplayName || currentUser.displayName || currentUser.email || 'User';
  const photoURL    = localPhotoURL    || currentUser.photoURL    || '';
  const phone       = localPhone       || '—';

  // ── Upload helper ────────────────────────────────────────────────────────────

  async function uploadPhoto(file: File, uid: string): Promise<string> {
    const ext      = file.name.split('.').pop() ?? 'jpg';
    const path     = `profile-photos/${uid}/${Date.now()}.${ext}`;
    const fileRef  = storageRef(storage, path);
    const task     = uploadBytesResumable(fileRef, file, { contentType: file.type });

    return new Promise((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploadProgress(pct);
        },
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        },
      );
    });
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(form, photoFile);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSaveStatus('idle');
    setSaveMessage('');
    setSaving(true);

    const newName  = form.displayName.trim();
    const newPhone = form.phoneNumber.trim();
    let   newPhoto = photoPreviewSrc; // start with whatever is currently previewed

    // ── 1. Upload photo file if one was selected ─────────────────────────────
    if (photoFile) {
      try {
        setIsUploading(true);
        setUploadProgress(0);
        newPhoto = await uploadPhoto(photoFile, currentUser.uid);
      } catch (uploadErr) {
        const code = (uploadErr as { code?: string })?.code ?? '';
        console.error('[EditProfile] Storage upload failed:', uploadErr);
        setSaveMessage(
          code === 'storage/unauthorized'
            ? 'Photo upload blocked — Firebase Storage rules need to allow authenticated writes. See Firebase Console → Storage → Rules.'
            : 'Photo upload failed. Check your connection and try again.',
        );
        setSaveStatus('auth-error');
        setSaving(false);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    // ── 2. Firebase Auth updateProfile ───────────────────────────────────────
    try {
      await updateProfile(currentUser, {
        displayName: newName,
        photoURL:    newPhoto || null,
      } as Parameters<typeof updateProfile>[1]);
    } catch (authErr) {
      const code = (authErr as { code?: string })?.code ?? '';
      setSaveMessage(
        code === 'auth/requires-recent-login'
          ? 'Please sign out and sign back in before updating your profile.'
          : 'Could not update display name or photo. Please try again.',
      );
      setSaveStatus('auth-error');
      setSaving(false);
      return;
    }

    // Reflect Auth changes immediately in local state
    setLocalDisplayName(newName);
    setLocalPhotoURL(newPhoto);

    // ── 3. Firestore upsert (best-effort) ────────────────────────────────────
    let fsWarning = '';
    try {
      const ref  = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(ref);

      const payload: Partial<UserProfileDoc> & { updatedAt: FieldValue; createdAt?: FieldValue } = {
        uid:         currentUser.uid,
        displayName: newName,
        email:       currentUser.email ?? '',
        phoneNumber: newPhone,
        photoURL:    newPhoto,
        provider,
        updatedAt:   serverTimestamp(),
      };

      if (!snap.exists()) payload.createdAt = serverTimestamp();

      await setDoc(ref, payload, { merge: true });
    } catch (fsErr) {
      const code = (fsErr as { code?: string })?.code ?? '';
      console.warn('[EditProfile] Firestore write failed:', code, fsErr);
      fsWarning =
        code === 'permission-denied'
          ? 'Photo and name updated. Phone number could not be saved — Firestore rules are blocking writes. See Firebase Console → Firestore → Rules.'
          : 'Photo and name updated. Phone number could not be saved (database unavailable).';
    }

    // ── 4. Update local cache ────────────────────────────────────────────────
    setLocalPhone(newPhone);
    setFsProfile((prev) => ({
      ...prev,
      displayName: newName,
      phoneNumber: newPhone,
      photoURL:    newPhoto,
    }));

    // Clean up blob preview now that we have a real URL
    if (previewBlobRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = '';
    }
    setPhotoFile(null);

    setSaving(false);

    if (fsWarning) {
      setSaveMessage(fsWarning);
      setSaveStatus('fs-warning');
    } else {
      setSaveStatus('success');
      setSaveMessage('Profile updated successfully!');
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
        setView('view');
      }, 1500);
    }
  };

  // ── Close ─────────────────────────────────────────────────────────────────

  const handleClose = () => {
    setView('view');
    setErrors({});
    setSaveStatus('idle');
    setSaveMessage('');
    onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 overflow-y-auto"
    >
      <div className="bg-[#F6F3E9] border-2 border-[#22251F] rounded max-w-lg w-full p-6 sm:p-7 relative my-8 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#D8D5CA]">
          <div>
            <span className="text-xs font-mono uppercase text-[#173D2C] font-semibold tracking-wide">
              {view === 'edit' ? 'EDIT PROFILE' : 'YOUR PROFILE'}
            </span>
            <h2 id="profile-modal-title" className="text-xl font-bold font-display text-[#22251F] mt-1">
              {view === 'edit' ? 'Update your account details' : displayName}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close profile dialog"
            className="p-1.5 rounded border border-[#D8D5CA] text-[#22251F] hover:bg-[#EDE8D8] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading */}
        {loadingProfile && view === 'view' && (
          <div className="flex items-center gap-2 text-xs text-[#565A52]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading profile…</span>
          </div>
        )}

        {/* ════ VIEW MODE ════════════════════════════════════════════════════ */}
        {view === 'view' && !loadingProfile && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar src={photoURL} fallbackName={displayName} size="lg" />
              <div className="min-w-0">
                <p className="font-bold text-[#22251F] text-base leading-tight truncate">{displayName}</p>
                <p className="text-xs text-[#565A52] mt-0.5 truncate">{currentUser.email}</p>
                <span className="inline-block mt-1.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-[#D8D5CA] text-[#173D2C] bg-white">
                  {provider === 'google' ? 'Google Account' : 'Email / Password'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <ProfileField label="Display Name" value={displayName} />
              <ProfileField
                label="Email"
                value={currentUser.email ?? '—'}
                note={provider === 'google' ? 'Managed by Google' : 'Cannot be changed here'}
                locked
              />
              <ProfileField label="Phone Number" value={phone} />
              <ProfileField
                label="Sign-in Method"
                value={provider === 'google' ? 'Continue with Google' : 'Email & Password'}
              />
            </div>

            <div className="pt-2 border-t border-[#D8D5CA] flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-[#22251F] border border-[#D8D5CA] rounded hover:bg-[#EDE8D8] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setView('edit')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#173D2C] bg-[#D8F36A] border border-[#173D2C] rounded hover:bg-[#c9e854] cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            </div>
          </div>
        )}

        {/* ════ EDIT MODE ════════════════════════════════════════════════════ */}
        {view === 'edit' && (
          <form onSubmit={handleSave} noValidate className="space-y-4 text-xs">

            {/* Photo picker */}
            <PhotoPicker
              previewSrc={photoPreviewSrc}
              fallbackName={form.displayName}
              uploadProgress={uploadProgress}
              isUploading={isUploading}
              error={errors.photo}
              onFileSelected={setPhotoFileWithPreview}
            />

            {/* Display Name */}
            <div>
              <label htmlFor="ep-display-name" className="block font-semibold text-[#22251F] mb-1">
                Display Name <span className="text-[#B42318]">*</span>
              </label>
              <input
                id="ep-display-name"
                type="text"
                autoComplete="name"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="e.g. Vikram Nair"
                className="w-full px-3 py-2 bg-white border border-[#D8D5CA] rounded text-[#22251F]"
              />
              {errors.displayName && <p className="text-[#B42318] mt-1">{errors.displayName}</p>}
            </div>

            {/* Email — read-only */}
            <div>
              <label
                htmlFor="ep-email"
                className="block font-semibold text-[#22251F] mb-1 inline-flex items-center gap-1.5"
              >
                Email Address <Lock className="w-3 h-3 text-[#888]" />
              </label>
              <input
                id="ep-email"
                type="email"
                readOnly
                value={currentUser.email ?? ''}
                className="w-full px-3 py-2 bg-[#EDE8D8] border border-[#D8D5CA] rounded text-[#565A52] cursor-not-allowed"
              />
              <p className="text-[#888] mt-1 text-[11px]">
                {provider === 'google'
                  ? 'Managed by your Google account.'
                  : 'Email changes are not supported in this version.'}
              </p>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="ep-phone" className="block font-semibold text-[#22251F] mb-1">
                Phone Number (India)
              </label>
              <input
                id="ep-phone"
                type="tel"
                autoComplete="tel"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                placeholder="e.g. 98201 54321"
                className="w-full px-3 py-2 bg-white border border-[#D8D5CA] rounded text-[#22251F] font-mono"
              />
              {errors.phoneNumber && <p className="text-[#B42318] mt-1">{errors.phoneNumber}</p>}
            </div>

            {/* Feedback */}
            {saveStatus === 'auth-error' && (
              <div className="p-3 bg-[#FEE4E2] border border-[#FDA29B] rounded text-[#B42318] text-xs">
                {saveMessage}
              </div>
            )}
            {saveStatus === 'fs-warning' && (
              <div className="p-3 bg-[#FFFAEB] border border-[#FEC84B] rounded text-[#7A4F00] text-xs">
                {saveMessage}
              </div>
            )}
            {saveStatus === 'success' && (
              <div className="p-3 bg-[#ECFDF3] border border-[#6CE9A6] rounded text-[#027A48] flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {saveMessage}
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-[#D8D5CA] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setView('view'); setErrors({}); setSaveStatus('idle'); }}
                disabled={saving}
                className="px-4 py-2.5 font-medium text-[#22251F] border border-[#D8D5CA] rounded hover:bg-[#EDE8D8] disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 font-semibold text-[#173D2C] bg-[#D8F36A] border border-[#173D2C] rounded hover:bg-[#c9e854] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                  : 'Save Changes'
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
