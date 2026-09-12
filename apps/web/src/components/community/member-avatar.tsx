export function MemberAvatar({ name, src, size = 32 }: { name?: string | null; src?: string | null; size?: number }) {
  const dim = { width: size, height: size };
  if (src) {
    return <img src={src} alt={name || ''} style={dim} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span style={{ ...dim, fontSize: Math.round(size * 0.42) }} className="flex shrink-0 items-center justify-center rounded-full bg-forest-100 font-bold text-forest-800">
      {(name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}
