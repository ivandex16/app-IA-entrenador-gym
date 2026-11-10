import { useEffect } from 'react';

/*
 * While `active`, asks before leaving the page:
 *  - closing/reloading the tab (browser's own dialog),
 *  - clicking an in-app link (navbar, cards…).
 * The app uses <BrowserRouter> (no route blockers), so links are intercepted in
 * the capture phase, before React Router handles them. The back button isn't
 * blocked: the draft is also kept in localStorage and comes back when the user
 * opens "Nueva rutina" again.
 */
export default function useUnsavedChangesGuard(active, message = 'Tienes cambios sin guardar. ¿Seguro que quieres salir?') {
  useEffect(() => {
    if (!active) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active, message]);
}
