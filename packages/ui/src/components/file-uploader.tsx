'use client';

import { FileVideo, ImagePlus, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { cn } from '../lib/cn';
import { formatFileSize } from '../lib/format';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  previewUrl?: string;
  kind: 'photo' | 'video';
  status: 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  /** Moderation state once uploaded (SPEC media.moderation_status). */
  review?: 'pending' | 'approved' | 'rejected';
}

export interface FileUploaderProps {
  label: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  maxFiles?: number;
  /**
   * Does the upload. Call `onProgress(0..1)` as bytes go out. Resolve when
   * done, reject with an Error whose message the person can act on.
   */
  upload?: (file: File, onProgress: (p: number) => void) => Promise<void>;
  /** Items already uploaded (edit later). */
  initial?: UploadItem[];
  onChange?: (items: UploadItem[]) => void;
  className?: string;
}

let seq = 0;

export function FileUploader({
  label,
  hint = 'JPG, PNG or MP4. Up to 10 MB each.',
  accept = 'image/jpeg,image/png,image/webp,video/mp4',
  multiple = true,
  maxSizeMb = 10,
  maxFiles = 12,
  upload,
  initial = [],
  onChange,
  className,
}: FileUploaderProps) {
  const [items, setItems] = useState<UploadItem[]>(initial);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const files = useRef(new Map<string, File>());
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  useEffect(() => {
    onChange?.(items);
  }, [items, onChange]);

  useEffect(
    () => () => {
      // Free preview URLs on unmount.
      items.forEach((i) => i.previewUrl?.startsWith('blob:') && URL.revokeObjectURL(i.previewUrl));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const patch = (id: string, p: Partial<UploadItem>) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const start = useCallback(
    async (id: string, file: File) => {
      if (!upload) {
        patch(id, { status: 'done', progress: 1, review: 'pending' });
        return;
      }
      patch(id, { status: 'uploading', progress: 0, error: undefined });
      try {
        await upload(file, (p) => patch(id, { progress: Math.max(0, Math.min(1, p)) }));
        patch(id, { status: 'done', progress: 1, review: 'pending' });
      } catch (e) {
        patch(id, {
          status: 'error',
          error: e instanceof Error ? e.message : 'Upload failed. Try again.',
        });
      }
    },
    [upload],
  );

  const add = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const room = maxFiles - items.length;
    const rejected: string[] = [];
    const accepted: UploadItem[] = [];
    for (const file of incoming.slice(0, Math.max(0, room))) {
      if (file.size > maxSizeMb * 1024 * 1024) {
        rejected.push(`${file.name} is over ${maxSizeMb} MB`);
        continue;
      }
      const kind = file.type.startsWith('video/') ? 'video' : 'photo';
      const id = `up-${++seq}`;
      files.current.set(id, file);
      accepted.push({
        id,
        name: file.name,
        size: file.size,
        kind,
        previewUrl:
          kind === 'photo' && typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(file)
            : undefined,
        status: 'uploading',
        progress: 0,
      });
    }
    if (incoming.length > room) rejected.push(`Only ${maxFiles} files allowed`);
    setNotice(rejected.length ? rejected.join('. ') + '.' : null);
    setItems((l) => [...l, ...accepted]);
    accepted.forEach((a) => void start(a.id, files.current.get(a.id)!));
  };

  const remove = (id: string) => {
    setItems((list) => {
      const it = list.find((i) => i.id === id);
      if (it?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(it.previewUrl);
      return list.filter((i) => i.id !== id);
    });
    files.current.delete(id);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) add(e.dataTransfer.files);
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
          dragging
            ? 'border-pitch bg-action/15 dark:border-action'
            : 'border-line-strong bg-surface',
        )}
      >
        <ImagePlus className="size-8 text-ink-muted" aria-hidden />
        <p className="text-base text-ink">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="min-h-11 font-semibold text-link underline underline-offset-4"
          >
            Choose files
          </button>{' '}
          <span className="hidden sm:inline">or drag them here</span>
        </p>
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          aria-describedby={hintId}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {notice ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {notice}
        </p>
      ) : null}
      {items.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Files">
          {items.map((it) => (
            <li key={it.id} className="overflow-hidden rounded-md border border-line bg-surface">
              <div className="relative aspect-square bg-sunken">
                {it.previewUrl ? (
                  <img src={it.previewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span
                    className="flex size-full items-center justify-center text-ink-muted"
                    aria-hidden
                  >
                    <FileVideo className="size-8" />
                  </span>
                )}
                {it.status === 'uploading' ? (
                  <div className="absolute inset-x-2 bottom-2">
                    <div
                      role="progressbar"
                      aria-label={`Uploading ${it.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(it.progress * 100)}
                      className="h-1.5 overflow-hidden rounded-full bg-white/70"
                    >
                      <div
                        className="h-full bg-pitch transition-[width]"
                        style={{ width: `${it.progress * 100}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex items-start gap-1 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{it.name}</p>
                  <p
                    className={cn(
                      'text-xs',
                      it.status === 'error' ? 'font-medium text-danger' : 'text-ink-muted',
                    )}
                  >
                    {it.status === 'error'
                      ? it.error
                      : it.status === 'uploading'
                        ? `Uploading ${Math.round(it.progress * 100)}%`
                        : it.review === 'pending'
                          ? 'Pending review'
                          : it.review === 'rejected'
                            ? 'Not approved'
                            : formatFileSize(it.size)}
                  </p>
                </div>
                {it.status === 'error' && files.current.has(it.id) ? (
                  <button
                    type="button"
                    aria-label={`Retry ${it.name}`}
                    onClick={() => void start(it.id, files.current.get(it.id)!)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-sunken"
                  >
                    <RotateCcw className="size-4" aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label={`Remove ${it.name}`}
                  onClick={() => remove(it.id)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-sunken hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
