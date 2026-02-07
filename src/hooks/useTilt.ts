import { useEffect, useRef } from "react";

interface TiltConfig {
  maxTilt?: number;
  perspective?: number;
  proximity?: number;
  transitionSpeed?: number;
  multiplier?: number;
  includePerspective?: boolean;
}

export default function useTilt<T extends HTMLElement = HTMLDivElement>({
  maxTilt = 1,
  perspective = 800,
  proximity = 800,
  transitionSpeed = 200,
  multiplier = 1,
  includePerspective = true,
}: TiltConfig = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.willChange = "transform";
    el.style.transition = `transform ${transitionSpeed}ms ease-out`;

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const halfW = rect.width / 2;
      const halfH = rect.height / 2;

      // Distance from element edge (0 when inside)
      const edgeDistX = Math.max(0, Math.abs(dx) - halfW);
      const edgeDistY = Math.max(0, Math.abs(dy) - halfH);
      const edgeDist = Math.sqrt(edgeDistX * edgeDistX + edgeDistY * edgeDistY);

      if (edgeDist > proximity) {
        el.style.transform = "";
        return;
      }

      // Fade from 1 (at/inside edge) to 0 (at proximity distance)
      const intensity = edgeDist > 0 ? 1 - edgeDist / proximity : 1;

      // Normalize by element size so tilt is independent of div dimensions
      const normX = Math.max(-1, Math.min(1, dx / halfW));
      const normY = Math.max(-1, Math.min(1, dy / halfH));

      const rotateY = normX * maxTilt * intensity * multiplier;
      const rotateX = -normY * maxTilt * intensity * multiplier;

      el.style.transform = includePerspective
        ? `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
        : `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    document.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      el.style.willChange = "";
      el.style.transition = "";
      el.style.transform = "";
    };
  }, [maxTilt, perspective, proximity, transitionSpeed, multiplier, includePerspective]);

  return ref;
}
