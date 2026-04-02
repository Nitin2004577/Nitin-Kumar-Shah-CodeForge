interface ProxyAvatarProps {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
  fallback?: string; // single letter fallback
}

// Wraps external avatar URLs through /api/avatar to bypass COEP restrictions
export function ProxyAvatar({
  src,
  alt,
  size = 32,
  className = "",
  fallback,
}: ProxyAvatarProps) {
  const proxied = src ? `/api/avatar?url=${encodeURIComponent(src)}` : null;

  if (!proxied) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0 ${className}`}
      >
        {fallback ?? "?"}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={proxied}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover shrink-0 ${className}`}
    />
  );
}
