import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

function classes(variant: Variant, size: Size, className?: string) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none",
    size === "sm" && "min-h-9 px-4 text-sm",
    size === "md" && "min-h-11 px-5 text-sm",
    size === "lg" && "min-h-12 px-6 text-base",
    variant === "primary" &&
      "border-accent bg-accent text-white shadow-sm hover:border-accent-dark hover:bg-accent-dark",
    variant === "secondary" &&
      "border-line-strong bg-white text-ink hover:border-accent/50 hover:bg-accent-soft",
    variant === "ghost" &&
      "border-transparent bg-transparent text-ink hover:bg-accent-soft",
    variant === "inverse" &&
      "border-white bg-white text-ink hover:border-accent-soft hover:bg-accent-soft",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  onClick?: () => void;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  onClick,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={classes(variant, size, className)}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classes(variant, size, className)}
      {...props}
    />
  );
}
