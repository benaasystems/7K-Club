import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { uploadImage } from '../lib/utils';
import { Spinner } from './ui';

/** Admin image picker: uploads to the public `media` bucket and returns the URL. */
export function ImageUpload({
  value,
  onChange,
  folder,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange(await uploadImage('media', folder, file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <span className="label">{t('f.image')}</span>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/[0.03]">
          {busy ? <Spinner /> : value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-white/30" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? t('f.uploading') : t('f.upload')}
          </button>
          {value && (
            <button type="button" className="btn-danger btn-sm" onClick={() => onChange(null)}>
              <Trash2 className="h-3.5 w-3.5" /> {t('f.remove')}
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}
