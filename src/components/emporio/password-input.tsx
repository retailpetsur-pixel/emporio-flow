"use client";

import { useState } from "react";

export default function PasswordInput() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        name="password"
        type={visible ? "text" : "password"}
        required
        className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm text-slate-900 outline-none focus:border-emerald-400"
        placeholder="••••••••"
      />
      <button
        type="button"
        onClick={() => setVisible((actual) => !actual)}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 hover:text-slate-900"
        aria-label={visible ? "Ocultar contraseña" : "Ver contraseña"}
      >
        {visible ? (
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
            <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 9 4.5 10 8a11.8 11.8 0 0 1-3 4.6" />
            <path d="M6.1 6.1A12.1 12.1 0 0 0 2 12c1 3.5 5 8 10 8a10.8 10.8 0 0 0 5-1.2" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
