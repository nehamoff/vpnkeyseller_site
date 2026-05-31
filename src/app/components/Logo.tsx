type LogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-10 h-10",
  lg: "w-16 h-16",
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Кофемания VPN"
      className={`${sizeClasses[size]} rounded-xl object-cover shadow-lg ${className}`}
    />
  );
}
