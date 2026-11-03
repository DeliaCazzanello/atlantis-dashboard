// Muestra carga o error de useAsync; con datos listos llama a children(data).
export default function AsyncView({ state, children }) {
  if (state.error) return <p className="o-muted" role="alert">No se pudieron cargar los datos. Intenta de nuevo.</p>;
  if (state.loading) return <p className="o-muted">Cargando…</p>;
  return children(state.data);
}
