import React from 'react';

export default function Spinner({ size = 'md', className = '' }) {
  const sz = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-2', lg: 'h-12 w-12 border-4' }[size];
  return (
    <div className={`${className} flex items-center justify-center`}>
      <div className={`${sz} animate-spin rounded-full border-primary-600 border-t-transparent`} />
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <Spinner size="lg" />
    </div>
  );
}
