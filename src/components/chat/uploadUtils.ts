import { supabase } from '@/integrations/supabase/client';

export const CHAT_UPLOAD_BUCKET = 'board-files';
export const UPLOAD_TIMEOUT_MS = 120_000;
export const DB_WRITE_TIMEOUT_MS = 30_000;

export const sanitizeStorageSegment = (value: string) => {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return cleaned || 'file';
};

export const createChatStoragePath = (
  contextType: string,
  contextId: string | null,
  fileName: string,
) => {
  const safeContextId = sanitizeStorageSegment(contextId || 'general');
  const safeFileName = sanitizeStorageSegment(fileName);
  const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${sanitizeStorageSegment(contextType)}/${safeContextId}/${Date.now()}-${uniqueId}-${safeFileName}`;
};

export const withTimeout = async <T,>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const buildStorageObjectUrl = (bucket: string, path: string) => {
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
  if (!baseUrl) throw new Error('Missing Supabase URL');

  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;
};

const getUploadErrorMessage = (status: number, responseText: string) => {
  let serverMessage = responseText;

  try {
    const parsed = JSON.parse(responseText);
    serverMessage = parsed.message || parsed.error || parsed.msg || responseText;
  } catch {
    // Keep the raw response text.
  }

  if (status === 413) {
    return 'File exceeds the Supabase Storage or reverse-proxy upload limit.';
  }

  if (/row-level security|rls|policy/i.test(serverMessage)) {
    return 'Storage policy blocked this upload. Check the board-files INSERT policy for authenticated users.';
  }

  return `Upload failed (${status}): ${serverMessage || 'Unknown storage error'}`;
};

export const uploadFileToStorage = async (
  bucket: string,
  path: string,
  file: File,
  onProgress: (percent: number) => void,
) => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) throw new Error('Not authenticated');

  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const url = buildStorageObjectUrl(bucket, path);

  onProgress(1);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('cacheControl', '3600');
    formData.append('', file, file.name);

    xhr.open('POST', url);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader('authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('x-upsert', 'true');
    if (anonKey) xhr.setRequestHeader('apikey', anonKey);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const percent = Math.max(1, Math.min(95, Math.round((event.loaded / event.total) * 95)));
      onProgress(percent);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(95);
        resolve();
        return;
      }

      reject(new Error(getUploadErrorMessage(xhr.status, xhr.responseText)));
    };

    xhr.onerror = () => reject(new Error('Network/CORS error while uploading to Supabase Storage.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Check the self-hosted Supabase Storage service and proxy upload limits.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));

    xhr.send(formData);
  });
};