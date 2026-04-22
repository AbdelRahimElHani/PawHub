type BrandLogoProps = {
  /** e.g. auth hero vs compact nav */
  variant?: "hero" | "nav" | "hub";
  className?: string;
};

const variantClass: Record<NonNullable<BrandLogoProps["variant"]>, string> = {
  hero: "ph-brand-logo ph-brand-logo--hero",
  nav: "ph-brand-logo ph-brand-logo--nav",
  hub: "ph-brand-logo ph-brand-logo--hub",
};

/**
 * Official PawHub wordmark (served from {@code /pawhub-logo.png} in {@code frontend/public}).
 */
export function BrandLogo({ variant = "nav", className }: BrandLogoProps) {
  const cls = [variantClass[variant], className].filter(Boolean).join(" ");
  return (
    <img
      src="/pawhub-logo.png"
      alt="PawHub"
      className={cls}
      width={320}
      height={76}
      decoding="async"
    />
  );
}
