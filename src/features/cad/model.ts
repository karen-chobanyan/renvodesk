export const MAX_DXF_BYTES = 10 * 1024 * 1024;
export function validDxfFile(file: Pick<File, "name" | "size">) {
  return (
    /\.dxf$/i.test(file.name) && file.size > 0 && file.size <= MAX_DXF_BYTES
  );
}
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
  | { type: "open"; content: string }
  | { type: "fit" }
  | { type: "zoom"; factor: number }
  | { type: "layer"; name: string; visible: boolean };
export type ViewerEvent =
  | { type: "ready" }
  | { type: "loaded"; layers: Layer[]; entities: number }
  | { type: "error" };
