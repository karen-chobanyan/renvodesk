export const MAX_DXF_BYTES = 10 * 1024 * 1024;
// Bounded text DXF only; binary DXF and DWG are not supported.
export function validDxfText(text: string) {
  return (
    text.length <= MAX_DXF_BYTES &&
    /(?:^|\n)\s*0\s*\r?\nSECTION\s*\r?\n/.test(text) &&
    /(?:^|\n)\s*2\s*\r?\nENTITIES\s*\r?\n/.test(text) &&
    /\n\s*0\s*\r?\nEOF\s*$/.test(text)
  );
}
export type Layer = {
  name: string;
  isOn: boolean;
  isFrozen: boolean;
  color: string;
};
export type ViewerCommand =
  | { type: "fit" }
  | { type: "zoom"; factor: 0.8 | 1.25 }
  | { type: "layer"; name: string; visible: boolean };
