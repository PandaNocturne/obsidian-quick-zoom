import { StateEffect } from "@codemirror/state";

export interface ZoomInRange {
  from: number;
  to: number;
}

export type ZoomInStateEffect = StateEffect<ZoomInRange>;

export const zoomInEffect = StateEffect.define<ZoomInRange>();

export const zoomOutEffect = StateEffect.define<void>();

export function isZoomInEffect(
  e: StateEffect<unknown>
): e is ZoomInStateEffect {
  return e.is(zoomInEffect);
}
