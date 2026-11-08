import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const DURATION_MS = 1800;

/*
 * Brief glow around the edges of the screen when a rest ends. It never covers
 * the content (transparent centre, pointer-events: none) and removes itself
 * once the animation finishes. Rendered in a portal so no transformed or
 * blurred ancestor can clip the fixed positioning.
 *
 * Remount it (change its `key`) to play it again.
 */
export default function RestDoneFlash({ type }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setVisible(false), DURATION_MS);
    return () => clearTimeout(id);
  }, []);

  if (!visible) return null;
  const color = type === 'exercise' ? '34, 211, 238' : '163, 230, 53'; // cyan-400 / lime-400

  return createPortal(
    <div
      className="rest-done-flash fixed inset-0 z-[60] pointer-events-none"
      style={{ '--flash-rgb': color }}
      aria-hidden="true"
    />,
    document.body
  );
}
