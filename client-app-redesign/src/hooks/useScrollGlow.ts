import { useEffect, useRef, useState } from 'react';

export interface ScrollGlowTargetConfig {
  id: string;
  side: 'left' | 'right';
}

interface TargetPoint {
  s: number; // Trigger scroll position (scrollY)
  x: number; // Target absolute page X coordinate
  y: number; // Target absolute page Y coordinate
}

/**
 * Catmull-Rom spline interpolation function.
 * Ensures C1 continuity (perfectly smooth tangents with zero sharp corners).
 */
function interpolateCatmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
  );
}

/**
 * Evaluates the Catmull-Rom spline for a given scroll position across the targets array.
 */
function getSplinePoint(targets: TargetPoint[], scrollTop: number): { x: number; y: number } {
  if (targets.length === 0) return { x: 0, y: 0 };
  if (targets.length === 1) return { x: targets[0].x, y: targets[0].y };

  // Find active segment
  let i = 0;
  for (let k = 0; k < targets.length - 1; k++) {
    if (scrollTop >= targets[k].s && scrollTop <= targets[k + 1].s) {
      i = k;
      break;
    }
    if (k === targets.length - 2) {
      i = k; // fallback to last segment if out of bounds
    }
  }

  const p1 = targets[i];
  const p2 = targets[i + 1];
  const p0 = i > 0 ? targets[i - 1] : p1;
  const p3 = i < targets.length - 2 ? targets[i + 2] : p2;

  const segmentDistance = p2.s - p1.s;
  const t = segmentDistance > 0 ? (scrollTop - p1.s) / segmentDistance : 0;

  const x = interpolateCatmullRom(p0.x, p1.x, p2.x, p3.x, t);
  const y = interpolateCatmullRom(p0.y, p1.y, p2.y, p3.y, t);

  return { x, y };
}

/**
 * Custom hook that dynamically calculates viewport coordinates for a glowing dot
 * and generates a matching smooth SVG path representing its trajectory.
 * Uses a Catmull-Rom spline to ensure beautiful, wide, sweeping turns.
 */
export function useScrollGlow(configs: ScrollGlowTargetConfig[]) {
  const dotRef = useRef<HTMLDivElement>(null);
  const [svgPath, setSvgPath] = useState<string>('');

  const configsSerialized = JSON.stringify(configs);

  useEffect(() => {
    const calculateTargets = (): TargetPoint[] => {
      const scrollTop = window.scrollY;
      const scrollLeft = window.scrollX;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight - viewportHeight;

      // Helper to get element dimensions in absolute page coordinates
      const getElData = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          top: scrollTop + rect.top,
          left: scrollLeft + rect.left,
          right: scrollLeft + rect.right,
          height: rect.height,
        };
      };

      const targets: TargetPoint[] = [
        // 1. Waypoint 0: Start (top-left)
        { s: 0, x: viewportWidth * 0.1, y: viewportHeight * 0.15 },
      ];

      // Retrieve elements
      const elDataMap: Record<string, ReturnType<typeof getElData>> = {};
      configs.forEach((cfg) => {
        elDataMap[cfg.id] = getElData(cfg.id);
      });

      // 2. Build multi-point trajectory waypoints for S-curves and vertical runs
      configs.forEach((cfg) => {
        const data = elDataMap[cfg.id];
        if (!data) return;

        const isRight = cfg.side === 'right';
        const targetX = isRight ? data.right - 24 : data.left + 24;

        // Vertical offset for the section middle inside the viewport
        const viewportCenterOffset = 80 + data.height / 2;

        // Swing Point: Swing horizontally to the target side in the gap above the section
        const swingScrollTrigger = Math.max(data.top - 160, 50);
        const swingAbsoluteY = swingScrollTrigger + viewportCenterOffset;

        targets.push({
          s: swingScrollTrigger,
          x: targetX,
          y: swingAbsoluteY,
        });

        // Run End Point: Stay on the target side and run vertically to the bottom of the section
        const runScrollTrigger = Math.max(data.top + data.height - 240, data.top);
        const runAbsoluteY = runScrollTrigger + viewportCenterOffset;

        targets.push({
          s: runScrollTrigger,
          x: targetX,
          y: runAbsoluteY,
        });
      });

      // 3. Waypoint End: Center Bottom
      targets.push({
        s: Math.max(docHeight, 0),
        x: viewportWidth * 0.5,
        y: Math.max(docHeight, 0) + viewportHeight * 0.92,
      });

      // Sort targets to ensure chronological scroll order
      targets.sort((a, b) => a.s - b.s);
      return targets;
    };

    const updateLayout = () => {
      const targets = calculateTargets();
      if (targets.length < 2) return;

      // Generate SVG path string with smooth Catmull-Rom interpolation
      let pathStr = '';
      for (let i = 0; i < targets.length - 1; i++) {
        const start = targets[i];
        const end = targets[i + 1];
        const steps = 30; // 30 steps per segment for maximum smoothness

        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          // Calculate the scroll position representing this step
          const currentS = start.s + (end.s - start.s) * t;

          // Get spline point at this scroll position
          const pt = getSplinePoint(targets, currentS);

          if (i === 0 && j === 0) {
            pathStr += `M ${pt.x} ${pt.y}`;
          } else {
            pathStr += ` L ${pt.x} ${pt.y}`;
          }
        }
      }
      setSvgPath(pathStr);
    };

    const cachedTargetsRef = { current: [] as TargetPoint[] };

    const updateLayoutAndCache = () => {
      updateLayout();
      cachedTargetsRef.current = calculateTargets();
    };

    let rAFId: number | null = null;
    const handleScroll = () => {
      if (rAFId) return;

      rAFId = requestAnimationFrame(() => {
        rAFId = null;
        if (!dotRef.current) return;

        const scrollTop = window.scrollY;
        const scrollLeft = window.scrollX;
        const targets = cachedTargetsRef.current;
        if (targets.length < 2) return;

        // Evaluate the Catmull-Rom spline at the current scroll position
        const pt = getSplinePoint(targets, scrollTop);

        // Convert absolute page coordinates to viewport-relative
        const viewportX = pt.x - scrollLeft;
        const viewportY = pt.y - scrollTop;

        dotRef.current.style.setProperty('--glow-dot-x', `${viewportX}px`);
        dotRef.current.style.setProperty('--glow-dot-y', `${viewportY}px`);
      });
    };

    updateLayoutAndCache();
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateLayoutAndCache, { passive: true });

    // Safety timeout to wait for fonts & layout settling
    const timer = setTimeout(updateLayoutAndCache, 300);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateLayoutAndCache);
      clearTimeout(timer);
      if (rAFId) cancelAnimationFrame(rAFId);
    };
  }, [configsSerialized]);

  return { dotRef, svgPath };
}
