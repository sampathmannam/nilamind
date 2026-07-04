import { useId } from "react";

// Nila's visual identity — the glowing orb from the app icon, drawn as a reusable inline SVG so it can
// sit on the talk button as "Nila's face", scale crisply, and brighten while she's listening. Inline SVG
// (not the PNG) avoids the icon's dark-square crop and stays theme-safe + animatable. Decorative only.
//
// Bold redesign: a more alive orb — a layered core (white → warm-pink → magenta) wrapped in a lavender
// rim that ties it to the app's aurora, a wider multi-stop halo, and a drifting inner light. Listening
// brightens the core and the halo. Still one calm presence mark, not a busy avatar.
export default function NilaOrb({
  size = 44,
  active = false,
  className = "",
}: {
  size?: number;
  active?: boolean;
  className?: string;
}) {
  const uid = useId(); // unique gradient ids per instance — avoids SVG <defs> id collisions when >1 orb renders
  const core = `nila-core-${uid}`;
  const rim = `nila-rim-${uid}`;
  const halo = `nila-halo-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        {/* core: bright specular top-left falling to a deep magenta */}
        <radialGradient id={core} cx="40%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="24%" stopColor="#ffe0f1" />
          <stop offset="56%" stopColor={active ? "#f93cab" : "#f56cb0"} />
          <stop offset="86%" stopColor={active ? "#c81e73" : "#c23f83"} />
          <stop offset="100%" stopColor="#8b3a72" />
        </radialGradient>
        {/* rim: a lavender edge light (ties the orb to the aurora atmosphere) */}
        <radialGradient id={rim} cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="transparent" />
          <stop offset="92%" stopColor="rgba(190,164,208,0.55)" />
          <stop offset="100%" stopColor="rgba(172,143,194,0)" />
        </radialGradient>
        {/* halo: soft outward bloom */}
        <radialGradient id={halo} cx="50%" cy="50%" r="50%">
          <stop offset="40%" stopColor={active ? "rgba(236,72,153,0.42)" : "rgba(236,72,153,0.26)"} />
          <stop offset="72%" stopColor="rgba(172,143,194,0.16)" />
          <stop offset="100%" stopColor="rgba(172,143,194,0)" />
        </radialGradient>
      </defs>
      {/* outward bloom */}
      <circle cx="50" cy="50" r="48" fill={`url(#${halo})`} className={active ? "" : "orb-aura"} style={{ transformOrigin: "50px 50px" }} />
      {/* the orb body */}
      <circle cx="50" cy="50" r="30" fill={`url(#${core})`} />
      {/* lavender rim light */}
      <circle cx="50" cy="50" r="30" fill={`url(#${rim})`} />
      {/* crisp specular highlight */}
      <ellipse cx="39" cy="33" rx="9.5" ry="6.5" fill="#ffffff" opacity="0.6" />
      {/* faint lower-right bounce light for volume */}
      <ellipse cx="60" cy="64" rx="7" ry="5" fill="#ffd9ee" opacity="0.18" />
    </svg>
  );
}
