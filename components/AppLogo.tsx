const BRAND = {
  teal: "#247C74",
  tealDark: "#165C55",
  ink: "#1F2A37",
  eel: "#1C1C1E",
  wolf: "#6B6B6B",
};

export function AppLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim =
    size === "lg"
      ? "h-14 w-14 rounded-3xl text-xl"
      : size === "sm"
        ? "h-9 w-9 rounded-xl text-sm"
        : "h-11 w-11 rounded-2xl text-base";
  return (
    <span
      className={`grid ${dim} flex-none place-items-center font-black text-white`}
      style={{
        background: `linear-gradient(145deg, ${BRAND.teal}, ${BRAND.ink})`,
        boxShadow: `0 3px 0 ${BRAND.tealDark}`,
      }}
    >
      D
    </span>
  );
}

export function BrandLockup({
  subtitle,
  theme = "light",
  size = "md",
}: {
  subtitle?: string;
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}) {
  const titleColor = theme === "dark" ? "#FFFFFF" : BRAND.eel;
  const subColor = theme === "dark" ? "rgba(255,255,255,0.55)" : BRAND.wolf;
  const titleSize =
    size === "lg" ? "text-xl md:text-2xl" : size === "sm" ? "text-base" : "text-lg md:text-xl";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <AppLogo size={size === "lg" ? "lg" : size === "sm" ? "sm" : "md"} />
      <div className="min-w-0">
        <p className={`truncate font-black leading-tight ${titleSize}`} style={{ color: titleColor }}>
          DrKard
        </p>
        {subtitle && (
          <p
            className="truncate text-xs font-extrabold uppercase tracking-wide"
            style={{ color: subColor }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
