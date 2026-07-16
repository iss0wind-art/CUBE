import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Drive scopes
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory.
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Try to trigger sign in if user exists in auth but we have no token,
        // or let UI handle the Sign In button.
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Google Drive API Helpers

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  size?: string;
}

/**
 * List files matching application/json (Architect OS saved schematics)
 */
export const listDriveFiles = async (accessToken: string): Promise<DriveFile[]> => {
  try {
    const q = encodeURIComponent("mimeType = 'application/json' and trashed = false");
    const fields = encodeURIComponent("files(id, name, mimeType, createdTime, size)");
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=createdTime desc`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to list files: ${res.statusText}. ${errText}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Error listing Google Drive files:', err);
    throw err;
  }
};

/**
 * Save state as JSON to Google Drive
 */
export const saveDriveFile = async (
  accessToken: string,
  filename: string,
  content: any
): Promise<DriveFile> => {
  try {
    const metadata = {
      name: filename.endsWith('.json') ? filename : `${filename}.json`,
      mimeType: 'application/json',
      description: 'Architect OS saved drafting schematic',
    };

    const boundary = 'architect_os_multipart_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(content) +
      close_delim;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upload failed: ${res.statusText}. ${errText}`);
    }

    const file = await res.json();
    return file as DriveFile;
  } catch (err) {
    console.error('Error saving file to Google Drive:', err);
    throw err;
  }
};

/**
 * Download file content
 */
export const downloadDriveFile = async (accessToken: string, fileId: string): Promise<any> => {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to download file: ${res.statusText}. ${errText}`);
    }

    return await res.json();
  } catch (err) {
    console.error('Error downloading file from Google Drive:', err);
    throw err;
  }
};

/**
 * Delete a file from Google Drive
 */
export const deleteDriveFile = async (accessToken: string, fileId: string): Promise<void> => {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to delete file: ${res.statusText}. ${errText}`);
    }
  } catch (err) {
    console.error('Error deleting file from Google Drive:', err);
    throw err;
  }
};
