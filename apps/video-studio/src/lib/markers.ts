/**
 * VEX-08: operações puras sobre os marcadores da régua. Ordenados por frame;
 * adicionar num frame que já tem marcador (dentro da tolerância) é no-op —
 * pressionar M de novo perto remove (toggle). Persistidos com a timeline.
 */
import type { Marker } from "./timeline";

/** Alterna um marcador no frame: adiciona se não houver perto; remove se houver. */
export function toggleMarker(markers: Marker[] | undefined, frame: number, tol = 2, color?: string): Marker[] {
  const list = markers ?? [];
  const near = list.find((m) => Math.abs(m.frame - frame) <= tol);
  if (near) return list.filter((m) => m !== near);
  return [...list, { frame, ...(color ? { color } : {}) }].sort((a, b) => a.frame - b.frame);
}

/** Remove o marcador mais próximo do frame dentro da tolerância (clique). */
export function removeMarkerNear(markers: Marker[] | undefined, frame: number, tol = 2): Marker[] {
  const list = markers ?? [];
  const near = list.find((m) => Math.abs(m.frame - frame) <= tol);
  return near ? list.filter((m) => m !== near) : list;
}

/** Próximo marcador estritamente depois de `frame` (ou null). */
export function nextMarkerFrame(markers: Marker[] | undefined, frame: number): number | null {
  const cand = (markers ?? []).map((m) => m.frame).filter((f) => f > frame).sort((a, b) => a - b);
  return cand.length ? cand[0] : null;
}

/** Marcador anterior, estritamente antes de `frame` (ou null). */
export function prevMarkerFrame(markers: Marker[] | undefined, frame: number): number | null {
  const cand = (markers ?? []).map((m) => m.frame).filter((f) => f < frame).sort((a, b) => b - a);
  return cand.length ? cand[0] : null;
}
