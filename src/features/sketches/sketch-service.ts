import { requireSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { track } from "@/lib/telemetry/runtime";
import type { SaveAttempt } from "./sketch-export";
import { emptyScene, hashBlob, normalizeScene } from "./sketch-model";
export type Sketch = Database["public"]["Tables"]["project_sketches"]["Row"];
export type SketchSave = Database["public"]["Tables"]["sketch_saves"]["Row"];
const bucket = () => requireSupabase().storage.from("project-sketches");
export async function listSketches(org: string, project: string, offset = 0) {
  const { data, error } = await requireSupabase()
    .from("project_sketches")
    .select("*")
    .eq("organization_id", org)
    .eq("project_id", project)
    .order("updated_at", { ascending: false })
    .order("id")
    .range(offset, offset + 19);
  if (error) throw error;
  return data;
}
export async function getSketch(org: string, project: string, id: string) {
  const { data, error } = await requireSupabase()
    .from("project_sketches")
    .select("*")
    .eq("organization_id", org)
    .eq("project_id", project)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
export async function createSketch(
  org: string,
  project: string,
  id: string,
  title: string,
) {
  const { data, error } = await requireSupabase()
    .from("project_sketches")
    .insert({
      organization_id: org,
      project_id: project,
      id,
      title: title.trim(),
    })
    .select("*")
    .single();
  if (!error) return data;
  if (error.code === "23505") return getSketch(org, project, id);
  throw error;
}
export async function history(sk: Sketch, offset = 0) {
  const { data, error } = await requireSupabase()
    .from("sketch_saves")
    .select("*")
    .eq("organization_id", sk.organization_id)
    .eq("project_id", sk.project_id)
    .eq("sketch_id", sk.id)
    .not("revision", "is", null)
    .order("revision", { ascending: false })
    .range(offset, offset + 19);
  if (error) throw error;
  return data;
}
export async function getSave(sk: Sketch, id: string) {
  const { data, error } = await requireSupabase()
    .from("sketch_saves")
    .select("*")
    .eq("organization_id", sk.organization_id)
    .eq("project_id", sk.project_id)
    .eq("sketch_id", sk.id)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
async function checkedDownload(key: string | null, size: number, hash: string) {
  if (!key) throw new Error("Missing object");
  const { data, error } = await bucket().download(key);
  if (error) throw error;
  if (data.size !== size || (await hashBlob(data)) !== hash)
    throw new Error("Invalid object");
  return data;
}
export async function loadScene(save: SketchSave | null) {
  if (!save) return emptyScene();
  return normalizeScene(
    JSON.parse(
      await (
        await checkedDownload(save.scene_key, save.scene_bytes, save.scene_hash)
      ).text(),
    ),
  );
}
export async function loadPreview(save: SketchSave) {
  return checkedDownload(
    save.preview_key,
    save.preview_bytes,
    save.preview_hash,
  );
}
async function upload(key: string | null, body: Blob, hash: string) {
  if (!key) throw new Error("Missing object");
  const { error } = await bucket().upload(key, body, {
    contentType: body.type,
    upsert: false,
  });
  if (error) {
    // A lost upload response is recovered only if the immutable bytes match exactly.
    try {
      await checkedDownload(key, body.size, hash);
    } catch {
      throw error;
    }
  }
}
export async function persistSketch(sk: Sketch, a: SaveAttempt) {
  const row = {
    organization_id: sk.organization_id,
    project_id: sk.project_id,
    sketch_id: sk.id,
    id: a.id,
    base_revision: a.base,
    title: a.title,
    scene_bytes: a.scene.size,
    preview_bytes: a.preview.size,
    scene_hash: a.sceneHash,
    preview_hash: a.previewHash,
  };
  const result = await requireSupabase()
    .from("sketch_saves")
    .insert(row)
    .select("*")
    .single();
  if (result.error && result.error.code !== "23505") throw result.error;
  const saved = result.data ?? (await getSave(sk, a.id));
  if (
    Object.entries(row).some(
      ([key, value]) => saved[key as keyof SketchSave] !== value,
    )
  )
    throw new Error("Save identity mismatch");
  if (saved.canceled_at) throw new Error("Save was canceled");
  if (!saved.committed_at) {
    await upload(saved.scene_key, a.scene, a.sceneHash);
    await upload(saved.preview_key, a.preview, a.previewHash);
  }
  const { data, error } = await requireSupabase().rpc("publish_sketch", {
    p_org: sk.organization_id,
    p_sketch: sk.id,
    p_save: a.id,
  });
  if (error) throw error;
  if (data) track("sketch_published", a.id);
  return data;
}

export async function cancelPendingSketchSave(sk: Sketch, id: string) {
  const client = requireSupabase();
  const result = await client
    .from("sketch_saves")
    .select("*")
    .eq("organization_id", sk.organization_id)
    .eq("sketch_id", sk.id)
    .eq("id", id)
    .maybeSingle();
  if (result.error) throw result.error;
  const save = result.data;
  if (!save) return;
  if (save.committed_at) throw new Error("Committed saves cannot be canceled");
  const cancel = await client.rpc("cancel_sketch_save", {
    p_org: sk.organization_id,
    p_save: id,
  });
  if (cancel.error) throw cancel.error;
  const keys = [save.scene_key, save.preview_key].filter(
    (key): key is string => !!key,
  );
  const removed = await bucket().remove(keys);
  if (removed.error) throw removed.error;
  const finalized = await client.rpc("finalize_sketch_cancellation", {
    p_org: sk.organization_id,
    p_save: id,
  });
  if (finalized.error) throw finalized.error;
}
