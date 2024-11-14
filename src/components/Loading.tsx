import React from 'react';

export function Loading() {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        <p className="text-slate-800 font-medium">Carregando arquivo...</p>
      </div>
    </div>
  );
}
