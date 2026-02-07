import { useEffect, useRef } from "react";

interface MouseRevealConfig {
  radius?: number;
  opacity?: number;
  smoothing?: number;
}

export default function useMouseReveal<T extends HTMLElement = HTMLDivElement>({
  radius = 250,
  opacity = 0.7,
  smoothing = 1,
}: MouseRevealConfig = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.willChange = "mask-image, opacity";
    el.style.transition = "opacity 0.3s ease";
    el.style.opacity = "0";

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let hasMouseEntered = false;
    let animId = 0;

    const applyMask = (x: number, y: number) => {
      const gradient = `radial-gradient(circle ${radius}px at ${x}px ${y}px, black 0%, transparent 100%)`;
      el.style.maskImage = gradient;
      el.style.webkitMaskImage = gradient;
    };

    const tick = () => {
      currentX += (targetX - currentX) * smoothing;
      currentY += (targetY - currentY) * smoothing;
      applyMask(currentX, currentY);
      animId = requestAnimationFrame(tick);
    };

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX - el.offsetLeft;
      targetY = e.clientY - el.offsetTop;

      if (!hasMouseEntered) {
        hasMouseEntered = true;
        currentX = targetX;
        currentY = targetY;
        applyMask(currentX, currentY);
        el.style.opacity = String(opacity);
        animId = requestAnimationFrame(tick);
      }
    };

    const onMouseLeave = () => {
      el.style.opacity = "0";
      hasMouseEntered = false;
      cancelAnimationFrame(animId);
    };

    const onMouseEnter = () => {
      if (hasMouseEntered) {
        el.style.opacity = String(opacity);
        animId = requestAnimationFrame(tick);
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);
    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      el.style.willChange = "";
      el.style.transition = "";
      el.style.maskImage = "";
      el.style.webkitMaskImage = "";
      el.style.opacity = "";
    };
  }, [radius, opacity, smoothing]);

  return ref;
}
