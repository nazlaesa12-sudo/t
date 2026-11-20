import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const BOOTSTRAPPED_ADMIN_EMAIL = 'merahputh65@gmail.com';
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIREBASE_AUTH_SETTINGS_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

export interface AuthErrorDetails {
  code: string;
  title: string;
  message: string;
  isUnauthorizedDomain: boolean;
  hostname: string;
}

export function mapFirebaseAuthError(error: unknown): AuthErrorDetails {
  const hostname =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : 'domain-saat-ini';

  const firebaseCode =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : '';

  const rawMessage =
    error instanceof Error ? error.message : String(error ?? '');

  if (
    firebaseCode === 'auth/unauthorized-domain' ||
    rawMessage.includes('auth/unauthorized-domain')
  ) {
    return {
      code: 'auth/unauthorized-domain',
      title: 'Domain Belum Diizinkan oleh Firebase',
      message: `Domain "${hostname}" belum masuk daftar Authorized domains di Firebase Authentication proyek ${FIREBASE_PROJECT_ID}.`,
      isUnauthorizedDomain: true,
      hostname,
    };
  }

  if (
    firebaseCode === 'auth/popup-blocked' ||
    rawMessage.includes('auth/popup-blocked')
  ) {
    return {
      code: 'auth/popup-blocked',
      title: 'Popup Login Diblokir Browser',
      message:
        'Izinkan pop-up untuk situs ini di pengaturan browser Anda, lalu ketuk tombol masuk kembali.',
      isUnauthorizedDomain: false,
      hostname,
    };
  }

  if (
    firebaseCode === 'auth/popup-closed-by-user' ||
    firebaseCode === 'auth/cancelled-popup-request' ||
    rawMessage.includes('auth/popup-closed-by-user') ||
    rawMessage.includes('auth/cancelled-popup-request')
  ) {
    return {
      code: firebaseCode || 'auth/popup-closed-by-user',
      title: 'Jendela Login Ditutup',
      message:
        'Proses verifikasi Google dibatalkan sebelum selesai. Silakan ketuk masuk kembali.',
      isUnauthorizedDomain: false,
      hostname,
    };
  }

  if (
    firebaseCode === 'auth/network-request-failed' ||
    rawMessage.includes('auth/network-request-failed')
  ) {
    return {
      code: 'auth/network-request-failed',
      title: 'Koneksi Jaringan Bermasalah',
      message:
        'Tidak dapat menghubungi server Firebase Auth. Periksa koneksi internet Anda lalu coba lagi.',
      isUnauthorizedDomain: false,
      hostname,
    };
  }

  if (
    firebaseCode === 'auth/operation-not-allowed' ||
    rawMessage.includes('auth/operation-not-allowed')
  ) {
    return {
      code: 'auth/operation-not-allowed',
      title: 'Metode Login Google Belum Aktif',
      message:
        'Aktifkan penyedia login Google pada menu Authentication → Sign-in method di Firebase Console.',
      isUnauthorizedDomain: false,
      hostname,
    };
  }

  return {
    code: firebaseCode || 'auth/unknown',
    title: 'Gagal Masuk ke Firebase',
    message:
      rawMessage ||
      'Autentikasi dibatalkan atau gagal. Silakan coba kembali.',
    isUnauthorizedDomain: false,
    hostname,
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testFirestoreConnection();
