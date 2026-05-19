"use client";

import { useRef } from "react";

type AutoSubmitFormProps = {
  action: string;
  className?: string;
  children: React.ReactNode;
};

export default function AutoSubmitForm({
  action,
  className,
  children,
}: AutoSubmitFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function submitNow() {
    if (timerRef.current) clearTimeout(timerRef.current);
    formRef.current?.requestSubmit();
  }

  function submitSoon() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 450);
  }

  return (
    <form
      ref={formRef}
      action={action}
      className={className}
      onChange={submitNow}
      onInput={submitSoon}
    >
      {children}
    </form>
  );
}
