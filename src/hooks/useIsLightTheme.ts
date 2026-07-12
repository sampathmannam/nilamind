import { useEffect, useState } from "react";

/** Reactive hook: true when the app is in its light/cream theme.
 *  Watches <html class="theme-light"> via MutationObserver so it catches manual theme toggles
 *  from AppearanceSection without requiring a React re-render cascade. */
export function useIsLightTheme(): boolean {
  const [isLight, setIsLight] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("theme-light")
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsLight(el.classList.contains("theme-light"));
    });
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isLight;
}
