// Development-only Storage API smoke test. Supply a disposable, verified account
// and its owned organization/project through environment variables. The script
// creates synthetic text objects and removes them through the Storage API.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const required = [
  "RENVO_QUOTA_TEST_EMAIL",
  "RENVO_QUOTA_TEST_PASSWORD",
  "RENVO_QUOTA_TEST_ORG",
  "RENVO_QUOTA_TEST_PROJECT",
];
for (const name of required)
  if (!process.env[name]) throw new Error(`${name} is required`);
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const at = line.indexOf("=");
      return [
        line.slice(0, at),
        line
          .slice(at + 1)
          .trim()
          .replace(/^["']|["']$/g, ""),
      ];
    }),
);
const client = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
const org = process.env.RENVO_QUOTA_TEST_ORG;
const project = process.env.RENVO_QUOTA_TEST_PROJECT;
const bucket = client.storage.from("project-files");
const created = [];

async function reserve(size, name) {
  const { data, error } = await client
    .from("project_files")
    .insert({
      organization_id: org,
      project_id: project,
      id: randomUUID(),
      original_name: name,
      mime_type: "text/plain",
      size_bytes: size,
    })
    .select("*")
    .single();
  if (error) throw error;
  created.push(data);
  return data;
}

async function remove(file) {
  const start = await client
    .from("project_files")
    .update({ state: "deleting" })
    .eq("organization_id", org)
    .eq("id", file.id);
  if (start.error) throw start.error;
  const removed = await bucket.remove([file.object_key]);
  if (removed.error) throw removed.error;
  const finish = await client
    .from("project_files")
    .update({ state: "deleted" })
    .eq("organization_id", org)
    .eq("id", file.id);
  if (finish.error) throw finish.error;
}

try {
  const login = await client.auth.signInWithPassword({
    email: process.env.RENVO_QUOTA_TEST_EMAIL,
    password: process.env.RENVO_QUOTA_TEST_PASSWORD,
  });
  if (login.error) throw login.error;
  const valid = await reserve(2, "quota-valid.txt");
  const uploaded = await bucket.upload(
    valid.object_key,
    new Blob(["ok"], { type: "text/plain" }),
    { contentType: "text/plain", upsert: false },
  );
  if (uploaded.error)
    throw new Error(`Valid Storage upload failed: ${uploaded.error.message}`);
  const finalized = await client
    .from("project_files")
    .update({ state: "ready" })
    .eq("organization_id", org)
    .eq("id", valid.id);
  if (finalized.error) throw finalized.error;

  const mismatched = await reserve(1, "quota-mismatched.txt");
  const rejected = await bucket.upload(
    mismatched.object_key,
    new Blob(["xx"], { type: "text/plain" }),
    { contentType: "text/plain", upsert: false },
  );
  if (!rejected.error)
    throw new Error("Storage accepted an upload larger than its reservation");

  console.log(
    JSON.stringify({
      validUpload: true,
      mismatchedUploadRejected: true,
      errorCode: rejected.error.code,
    }),
  );
} finally {
  for (const file of created.reverse()) {
    try {
      await remove(file);
    } catch (error) {
      console.error(
        `Cleanup failed for synthetic file ${file.id}: ${String(error)}`,
      );
      process.exitCode = 1;
    }
  }
  await client.auth.signOut();
}
