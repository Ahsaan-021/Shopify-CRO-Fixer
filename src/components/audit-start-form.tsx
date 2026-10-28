"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { validateAuditUrl } from "@/lib/audit/validation";

type AuditStartFormProps = {
  defaultValue?: string;
};

export function AuditStartForm({ defaultValue = "" }: AuditStartFormProps) {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [url, setUrl] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateAuditUrl(url);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setError(null);
    router.push(`/audit?url=${encodeURIComponent(result.url)}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-semibold text-ink"
      >
        Store or product page URL
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <span
            className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted"
            aria-hidden="true"
          >
            <Icon name="search" size={18} />
          </span>
          <input
            id={inputId}
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            placeholder="your-store.com/products/your-product"
            className={`h-12 w-full rounded-full border bg-white py-3 pl-11 pr-4 text-base text-ink shadow-sm outline-none transition-colors placeholder:text-muted/70 focus:border-accent ${
              error ? "border-danger" : "border-line-strong"
            }`}
          />
        </div>
        <Button type="submit" size="lg" className="shrink-0">
          Analyze store
          <Icon name="arrow-right" size={18} />
        </Button>
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-sm font-medium text-danger"
        >
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : (
        <p className="mt-2 text-sm leading-5 text-muted">
          Free public-page audit. No account or Shopify admin access needed.
        </p>
      )}
    </form>
  );
}
