import { IMAGE_TIPS } from './importErrors';

/* "How the image should be" — shown with image/reading problems. */
export default function ImageTips({ open = false }) {
  return (
    <details className="group text-xs text-zinc-300" open={open}>
      <summary className="cursor-pointer font-bold text-lime-300 hover:text-lime-200 select-none">Cómo debe ser la imagen para que funcione</summary>
      <ul className="mt-1.5 list-disc pl-5 space-y-1 text-zinc-400">
        {IMAGE_TIPS.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </details>
  );
}
