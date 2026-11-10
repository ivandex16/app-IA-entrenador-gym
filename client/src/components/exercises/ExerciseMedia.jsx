import { memo, useEffect, useState } from 'react';
import { LuDumbbell, LuPlay, LuImageOff } from 'react-icons/lu';
import { youtubeThumb } from './exerciseImages';

/*
 * Exercise picture with lazy loading and a clean placeholder: no broken image
 * when there is no URL or it fails to load.
 */
export const ExerciseThumb = memo(function ExerciseThumb({ src, alt, className = '', fit = 'cover', label = true, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]); // a new picture gets a new chance
  if (!src || failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-zinc-900 text-zinc-600 ${className}`} role="img" aria-label={`${alt}: sin imagen disponible`}>
        <LuDumbbell className={size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'} aria-hidden="true" />
        {label && size !== 'sm' && <span className="text-[10px] font-semibold">Sin imagen</span>}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${fit === 'contain' ? 'object-contain bg-white' : 'object-cover'} ${className}`}
    />
  );
});

/*
 * YouTube video loaded only when the user presses play (a facade): before that
 * it is just a thumbnail, so pages and lists stay light and nothing is sent to
 * YouTube. Uses the privacy-enhanced youtube-nocookie domain.
 */
export function YouTubeVideo({ id, title }) {
  const [playing, setPlaying] = useState(false);
  if (!id) return null;
  if (playing) {
    return (
      <div className="aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block w-full aspect-video rounded-xl overflow-hidden bg-black"
      aria-label={`Reproducir vídeo: ${title}`}
    >
      <img src={youtubeThumb(id)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-16 h-16 rounded-full bg-red-600 group-hover:bg-red-500 shadow-xl flex items-center justify-center transition">
          <LuPlay className="w-7 h-7 text-white fill-white ml-1" />
        </span>
      </span>
      <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-white/90 bg-black/60 rounded-md px-2 py-0.5">Vídeo de YouTube · se carga al reproducir</span>
    </button>
  );
}

export function NoMedia({ className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 bg-zinc-900 text-zinc-500 ${className}`}>
      <LuImageOff className="w-7 h-7" aria-hidden="true" />
      <span className="text-xs font-semibold">Sin imagen ni vídeo disponibles</span>
    </div>
  );
}
