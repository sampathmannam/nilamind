import { useId } from "react";

// Nila's visual identity — the glowing orb from the app icon, drawn as a reusable inline SVG so it can
// sit on the talk button as "Nila's face", scale crisply, and brighten while she's listening. Inline SVG
// (not the PNG) avoids the icon's dark-square crop and stays theme-safe + animatable. Decorative only.
export default function NilaOrb({
  size = 44,
  active = false,
  className = "",
}: {
  size?: number;
  active?: boolean;
  className?: string;
}) {
  const uid = useId(); // unique gradient id per instance — avoids SVG <defs> id collisions when >1 orb renders
  const grad = `nila-orb-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={grad} cx="42%" cy="36%" r="64%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="28%" stopColor="#ffd9ee" />
          <stop offset="62%" stopColor={active ? "#f93cab" : "#f56cb0"} />
          <stop offset="100%" stopColor={active ? "#db2777" : "#cf3f86"} />
        </radialGradient>
      </defs>
      {/* soft glow halo (brighter while listening) */}
      <circle cx="50" cy="50" r="42" fill="#ec4899" opacity={active ? 0.24 : 0.12} />
      <circle cx="50" cy="50" r="35" fill="#ec4899" opacity={active ? 0.36 : 0.2} />
      {/* the orb */}
      <circle cx="50" cy="50" r="29" fill={`url(#${grad})`} />
      {/* specular highlight */}
      <ellipse cx="40" cy="34" rx="9" ry="6.5" fill="#ffffff" opacity="0.55" />
    </svg>
  );
}
