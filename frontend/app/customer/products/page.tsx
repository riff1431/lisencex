'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerProductsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/products');
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
