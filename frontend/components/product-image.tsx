'use client';

import React, { useState } from 'react';
import { Box, Layers, Image as ImageIcon, Sparkles, Terminal, Code2, Globe2 } from 'lucide-react';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  productType?: string;
  variant?: 'thumbnail' | 'icon' | 'banner' | 'screenshot' | 'general';
  className?: string;
  width?: number | string;
  height?: number | string;
}

export function ProductImage({
  src,
  alt,
  productType,
  variant = 'general',
  className = '',
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  // Normalize API backend media URLs (e.g. /api/v1/public/media/xyz to full backend url if needed or relative)
  const normalizedSrc = React.useMemo(() => {
    if (!src) return null;
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src;
    }
    if (src.startsWith('/api/v1/')) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      return `${baseUrl.replace(/\/api\/v1$/, '')}${src}`;
    }
    return src;
  }, [src]);

  const getGradient = () => {
    switch (productType) {
      case 'wordpress_plugin':
      case 'wordpress_theme':
        return 'from-blue-600 to-indigo-800';
      case 'nextjs_app':
      case 'nextjs_theme':
      case 'nextjs_plugin':
        return 'from-slate-900 via-indigo-950 to-slate-900';
      case 'saas':
        return 'from-purple-600 to-pink-600';
      case 'php_script':
        return 'from-violet-700 to-purple-900';
      case 'api':
        return 'from-emerald-600 to-teal-800';
      default:
        return 'from-indigo-600 to-violet-800';
    }
  };

  const getIcon = () => {
    switch (productType) {
      case 'nextjs_app':
      case 'nextjs_theme':
      case 'nextjs_plugin':
        return <Terminal className="h-1/2 w-1/2 text-white/80" />;
      case 'api':
        return <Code2 className="h-1/2 w-1/2 text-white/80" />;
      case 'saas':
        return <Globe2 className="h-1/2 w-1/2 text-white/80" />;
      default:
        return <Box className="h-1/2 w-1/2 text-white/80" />;
    }
  };

  if (!normalizedSrc || hasError) {
    if (variant === 'icon') {
      return (
        <div
          className={`flex items-center justify-center bg-gradient-to-br ${getGradient()} text-white font-black shrink-0 select-none shadow-xs ${className}`}
        >
          {alt ? (
            <span className="text-xs uppercase tracking-wider">
              {alt.slice(0, 2)}
            </span>
          ) : (
            getIcon()
          )}
        </div>
      );
    }

    if (variant === 'banner') {
      return (
        <div
          className={`flex flex-col items-center justify-center bg-gradient-to-r ${getGradient()} p-8 text-center text-white/90 relative overflow-hidden select-none ${className}`}
        >
          <div className="absolute inset-0 bg-radial from-white/10 to-transparent pointer-events-none" />
          <ImageIcon className="h-12 w-12 text-white/40 mb-2" />
          <span className="font-black text-lg tracking-tight">{alt}</span>
          <span className="text-xs text-white/60 capitalize mt-0.5">
            {productType?.replace('_', ' ') || 'Software Product'}
          </span>
        </div>
      );
    }

    // Default Thumbnail / General Fallback
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br ${getGradient()} p-4 text-center text-white/90 relative overflow-hidden select-none ${className}`}
      >
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs mb-2 shadow-xs">
          {getIcon()}
        </div>
        <span className="font-bold text-xs text-white/90 truncate max-w-[90%]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      onError={() => setHasError(true)}
      className={`object-cover transition-opacity duration-300 ${className}`}
      loading="lazy"
    />
  );
}
