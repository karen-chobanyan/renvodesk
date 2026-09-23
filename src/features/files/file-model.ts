export const PREVIEW_URL_SECONDS = 60 * 60;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const fileTypes: Record<string, string> = {
  webm: "audio/webm",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  dxf: "application/dxf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
export function validateFile(
  file: Pick<File, "name" | "size" | "type">,
): "heic" | "invalid" | null {
  const ext = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  if (["heic", "heif"].includes(ext) || /image\/hei[cf]/.test(file.type))
    return "heic";
  if (
    !fileTypes[ext] ||
    !file.size ||
    file.size > MAX_FILE_BYTES ||
    file.name.length > 255 ||
    (file.type &&
      file.type !== fileTypes[ext] &&
      !(
        ext === "dxf" &&
        [
          "application/x-dxf",
          "image/vnd.dxf",
          "image/x-dxf",
          "application/octet-stream",
          "text/plain",
        ].includes(file.type)
      ))
  )
    return "invalid";
  return null;
}
export function fileMime(name: string) {
  return fileTypes[name.split(".").at(-1)?.toLowerCase() ?? ""];
}
export function canPreview(mime: string) {
  return [
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/dxf",
  ].includes(mime);
}
