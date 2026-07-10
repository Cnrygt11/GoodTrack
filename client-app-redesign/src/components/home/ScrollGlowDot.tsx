import { useScrollGlow, ScrollGlowTargetConfig } from '../../hooks/useScrollGlow';

const LANDING_GLOW_TARGETS: ScrollGlowTargetConfig[] = [
  { id: 'features', side: 'right' }, // "Özellikler" -> Right
  { id: 'how-it-works', side: 'left' }, // "Nasıl Çalışır" -> Left
  { id: 'roles', side: 'right' }, // "Kimler İçin" -> Right
];

/**
 * ScrollGlowDot component renders a high-performance glowing point
 * and drawing the visible dotted trajectory line of the path.
 */
export default function ScrollGlowDot() {
  const { dotRef, svgPath } = useScrollGlow(LANDING_GLOW_TARGETS);

  return (
    <>
      <svg className="scroll-glow-path-svg" aria-hidden="true">
        {svgPath && <path d={svgPath} />}
      </svg>
      <div ref={dotRef} className="scroll-glow-dot" aria-hidden="true" />
    </>
  );
}
