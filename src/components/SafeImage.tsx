import { useState } from 'react';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function SafeImage({ src, alt, className = '', fallbackLabel }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const initials = (fallbackLabel || alt || 'SS')
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');
    return (
      <div
        className={`flex items-center justify-center bg-[#f0eee8] text-[#715b33] font-serif font-semibold text-xs border border-[#d1c4bc]/50 ${className}`}
        aria-label={alt}
      >
        {initials || 'SS'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
