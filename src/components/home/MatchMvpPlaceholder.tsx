export function MatchMvpPlaceholder({
  message = 'Aguardando término do mapa para definir o Destaque',
}: {
  message?: string;
} = {}) {
  return (
    <section
      aria-label="Destaque indisponível"
      className="min-h-[172px] border border-outline-variant/30 bg-surface-container p-4 flex flex-col items-center justify-center gap-3 text-on-surface-variant"
    >
      <svg
        aria-hidden="true"
        className="h-6 w-6 opacity-60"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <p className="text-sm text-center opacity-70">{message}</p>
    </section>
  );
}
