import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '~/lib/api';

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

/**
 * Video upload, hoisted out of the button that starts it. The picker now lives
 * in a sheet that closes as soon as you choose a file, so progress has to
 * survive its trigger — the page owns this state and renders the strip.
 */
export function useVideoUpload(date: string) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('video/')) {
      setError('Please choose a video file.');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError('That video is larger than 500MB.');
      return;
    }
    const ext = file.name.split('.').pop() || 'mp4';
    try {
      setProgress(0);
      const { uploadUrl, path } = await api.entries.videoUploadUrl(date, file.type, ext);

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

      await api.entries.addVideo(date, { path, contentType: file.type, size: file.size });
      qc.invalidateQueries({ queryKey: ['entry', date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="video/*"
      className="hidden"
      disabled={busy}
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) upload(file);
      }}
    />
  );

  return { progress, error, busy, choose: () => inputRef.current?.click(), input };
}

export function VideoUploadStatus({
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
          <div className="h-1 flex-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-gray-900 transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-gray-400">Uploading {progress}%</span>
        </div>
      )}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
