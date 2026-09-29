import { describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

describe("API configuration", () => {
  it("accepts a publishable key and loopback development origin", () => {
    expect(
      readConfig({
        API_SUPABASE_URL: "http://127.0.0.1:54321",
        API_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
        API_PORT: "3001",
      }),
    ).toEqual({
      supabaseUrl: "http://127.0.0.1:54321",
      supabasePublishableKey: "sb_publishable_test",
      port: 3001,
      openaiApiOrigin: "https://api.openai.com",
      aiModels: {
        transcriptionModel: "gpt-transcribe",
        proposalModel: "gpt-6-luna",
      },
      aiMaxConcurrentJobs: 4,
    });
  });

  it("rejects remote HTTP, secret keys, and invalid ports", () => {
    const valid = {
      API_SUPABASE_URL: "https://example.supabase.co",
      API_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      API_PORT: "3001",
    };
    expect(() =>
      readConfig({ ...valid, API_SUPABASE_URL: "http://example.com" }),
    ).toThrow();
    expect(() =>
      readConfig({ ...valid, API_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test" }),
    ).toThrow();
    expect(() => readConfig({ ...valid, API_PORT: "0" })).toThrow();
    expect(() =>
      readConfig({ ...valid, OPENAI_API_ORIGIN: "https://example.com" }),
    ).toThrow();
    expect(() =>
      readConfig({ ...valid, AI_PROPOSAL_MODEL: "unreviewed-model" }),
    ).toThrow();
    expect(() =>
      readConfig({ ...valid, AI_TRANSCRIPTION_MODEL: "gpt-6-luna" }),
    ).toThrow();
    for (const value of ["0", "17", "2.5", "x"])
      expect(() =>
        readConfig({ ...valid, AI_MAX_CONCURRENT_JOBS: value }),
      ).toThrow();
    expect(
      readConfig({ ...valid, AI_MAX_CONCURRENT_JOBS: "2" }).aiMaxConcurrentJobs,
    ).toBe(2);
  });
});
