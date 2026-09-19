import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '~/lib/api';

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_IMAGE_BYTES = 30 * 1024 * 1024;

type Kind = 'image' | 'video';

/**
 * Photo and video upload, hoisted out of whatever starts it — the picker often
 * lives in a sheet that closes the moment you choose a file, so progress has to
 * outlive its trigger.
 *
 * Both go up the same way: ask the backend for a signed URL, PUT straight to
 * Storage, then register the object against the entry.
 */
export function useMediaUpload(date: string) {
  const qc = useQueryClient();
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (kind: Kind, file: File) => {
    setError(null);
    if (!file.type.startsWith(`${kind}/`)) {
      setError(`Please choose a ${kind} file.`);
      return;
    }
    const cap = kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > cap) {
      setError(`That ${kind} is larger than ${Math.round(cap / 1024 / 1024)}MB.`);
      return;
    }
    const ext = file.name.split('.').pop() || (kind === 'video' ? 'mp4' : 'jpg');

    try {
      setProgress(0);
      const { uploadUrl, path } =
        kind === 'video'
          ? await api.entries.videoUploadUrl(date, file.type, ext)
          : await api.entries.imageUploadUrl(date, file.type, ext);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(file);
      });

      if (kind === 'video') {
        await api.entries.addVideo(date, { path, contentType: file.type, size: file.size });
      } else {
        await api.entries.addImage(date, { path, contentType: file.type });
      }
      qc.invalidateQueries({ queryKey: ['entry', date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;

  const field = (kind: Kind, ref: React.RefObject<HTMLInputElement | null>) => (
    <input
      key={kind}
      ref={ref}
      type="file"
      accept={`${kind}/*`}
      className="hidden"
      disabled={busy}
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) upload(kind, file);
      }}
    />
  );

  return {
    progress,
    error,
    busy,
    chooseImage: () => imageInput.current?.click(),
    chooseVideo: () => videoInput.current?.click(),
    inputs: (
      <>
        {field('image', imageInput)}
        {field('video', videoInput)}
      </>
    ),
  };
}

export function UploadStatus({
  progress,
  error,
}: {
  progress: number | null;
  error: string | null;
}) {
  if (progress === null && !error) return null;
  return (
    <div className="mb-3 animate-fade-up">
      {progress !== null && (
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#241F2E] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-[#71717D]">Uploading {progress}%</span>
        </div>
      )}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
