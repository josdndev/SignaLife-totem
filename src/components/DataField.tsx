import React from 'react';

interface DataFieldProps {
  label: string;
  value: string;
}

export function DataField({ label, value }: DataFieldProps) {
  return (
    <div className="flex flex-col mb-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
      <span className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">{label}</span>
      <span className="text-gray-900 font-medium text-lg">{value || '—'}</span>
    </div>
  );
}
