import { Component } from 'react';
import { LuTriangleAlert, LuRotateCcw } from 'react-icons/lu';

/*
 * Catches an error while rendering a page so the rest of the app (menu,
 * navigation) keeps working instead of the whole screen going blank.
 * App.jsx gives it key={pathname}: going to another page clears the error.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[pantalla con error]', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div role="alert" className="max-w-md w-full text-center bg-zinc-900/70 border border-white/10 rounded-2xl p-6 space-y-3">
          <LuTriangleAlert className="w-8 h-8 text-amber-300 mx-auto" />
          <h1 className="text-lg font-black text-white">Esta pantalla tuvo un problema</h1>
          <p className="text-sm text-zinc-400">Tus datos están guardados. Prueba a recargar; si se repite, usa el menú para ir a otra sección.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 text-sm font-black"
          >
            <LuRotateCcw className="w-4 h-4" /> Recargar
          </button>
        </div>
      </div>
    );
  }
}
