import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-3 rounded-sm"
      aria-label="Shopify CRO Fixer home"
    >
      <span
        className={`flex size-10 items-center justify-center rounded-xl shadow-sm ${
          inverse ? "bg-white text-accent" : "bg-accent text-white"
        }`}
      >
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <path d="M3 18V6" />
          <path d="M3 18h18" />
          <path d="m6.5 14 4-4 3 2.5L20 6" />
          <path d="M15.5 6H20v4.5" />
        </svg>
      </span>
      <span
        className={`text-[0.95rem] font-bold leading-tight tracking-tight sm:text-base ${
          inverse ? "text-white" : "text-ink"
        }`}
      >
        Shopify CRO Fixer
      </span>
    </Link>
  );
}
