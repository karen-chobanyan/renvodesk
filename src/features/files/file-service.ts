import { requireSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { track } from "@/lib/telemetry/runtime";
import { fileMime, validateFile } from "./file-model";
export type ProjectFile = Database["public"]["Tables"]["project_files"]["Row"];
const bucket = "project-files";
function objectKey(file: ProjectFile) {
  if (!file.object_key) throw new Error("Missing object key");
  return file.object_key;
}
export async function listFiles(org: string, project: string, offset = 0) {
  const { data, error } = await requireSupabase()
    .from("project_files")
    .select("*")
    .eq("organization_id", org)
    .eq("project_id", project)
    .neq("state", "deleted")
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + 19);
  if (error) throw error;
  return data;
}
export async function reserveFile(
  org: string,
  project: string,
  id: string,
  file: File,
) {
  if (validateFile(file)) throw new Error("Invalid file");
  const client = requireSupabase();
  const result = await client
    .from("project_files")
    .insert({
      organization_id: org,
      project_id: project,
      id,
      original_name: file.name,
      mime_type: fileMime(file.name),
      size_bytes: file.size,
    })
    .select("*")
    .single();
  if (!result.error) return result.data;
  if (result.error.code === "23505") {
    const { data, error } = await client
      .from("project_files")
      .select("*")
      .eq("organization_id", org)
      .eq("project_id", project)
      .eq("id", id)
      .single();
    if (
      !error &&
      data.original_name === file.name &&
      data.size_bytes === file.size &&
      data.mime_type === fileMime(file.name)
    )
      return data;
  }
  throw result.error;
}
async function state(file: ProjectFile, next: string) {
  const { data, error } = await requireSupabase()
    .from("project_files")
    .update({ state: next })
    .eq("organization_id", file.organization_id)
    .eq("project_id", file.project_id)
    .eq("id", file.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
export async function confirmUpload(file: ProjectFile) {
  const saved = await state(file, "ready");
  if (saved) track("file_uploaded", file.id);
  return saved;
}
export async function uploadFile(
  file: ProjectFile,
  body: File,
  progress: (percent: number) => void,
  signal: AbortSignal,
) {
  if (file.state === "ready") return;
  if (file.state !== "pending") throw new Error("Upload unavailable");
  const client = requireSupabase(),
    { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error("Sign in required");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucket}/${objectKey(file)}`,
    );
    xhr.setRequestHeader(
      "Authorization",
      `Bearer ${data.session?.access_token}`,
    );
    xhr.setRequestHeader(
      "apikey",
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    );
    xhr.setRequestHeader("Content-Type", file.mime_type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        progress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new Error("Upload canceled"));
    xhr.onloadend = () => signal.removeEventListener("abort", abort);
    if (signal.aborted) {
      reject(new Error("Upload canceled"));
      return;
    }
    xhr.send(body);
  });
  await confirmUpload(file);
  progress(100);
}
export async function deleteFile(file: ProjectFile) {
  if (file.state === "deleted") return;
  const deleting = await state(file, "deleting");
  const { error } = await requireSupabase()
    .storage.from(bucket)
    .remove([objectKey(deleting)]);
  if (error) throw error;
  await state(deleting, "deleted");
}
export async function previewUrl(file: ProjectFile) {
  const { data, error } = await requireSupabase()
    .storage.from(bucket)
    .createSignedUrl(objectKey(file), 60);
  if (error) throw error;
  return data.signedUrl;
}
export async function downloadFile(file: ProjectFile) {
  const { data, error } = await requireSupabase()
    .storage.from(bucket)
    .download(objectKey(file));
  if (error) throw error;
  const url = URL.createObjectURL(data),
    a = document.createElement("a");
  a.href = url;
  a.download = file.original_name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function recentFiles(org: string, project: string) {
  const { data, error } = await requireSupabase()
    .from("project_files")
    .select("*")
    .eq("organization_id", org)
    .eq("project_id", project)
    .eq("state", "ready")
    .order("created_at", { ascending: false })
    .order("id")
    .limit(3);
  if (error) throw error;
  return data;
}
