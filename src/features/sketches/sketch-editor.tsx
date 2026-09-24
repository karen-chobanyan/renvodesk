import { Download, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SketchCanvas from "./sketch-canvas";
import { sketchCopy } from "./sketch-copy";
import { prepareSave, type SaveAttempt } from "./sketch-export";
import {
  downloadScene,
  MAX_SCENE_BYTES,
  normalizeScene,
  type Scene,
} from "./sketch-model";
export function SketchEditor({
  initial,
  title: originalTitle,
  revision,
  readOnly,
  locale,
  restored = false,
  persist,
  cancelPending,
  onSaved,
  reload,
  back,
  registerCloseGuard,
}: {
  initial: Scene;
  title: string;
  revision: number;
  readOnly: boolean;
  locale: "fr" | "en";
  restored?: boolean;
  persist: (attempt: SaveAttempt) => Promise<number>;
  cancelPending: (attempt: SaveAttempt) => Promise<void>;
  onSaved: (version: number) => void;
  reload: () => void;
  back: string;
  registerCloseGuard?: (guard: (() => boolean) | null) => void;
}) {
  const c = sketchCopy[locale];
  const [title, setTitle] = useState(originalTitle),
    [canvasScene, setCanvasScene] = useState(initial),
    [canvasKey, setCanvasKey] = useState(0),
    [dirty, setDirty] = useState(restored),
    [generation, setGeneration] = useState(0),
    [status, setStatus] = useState<
      | "idle"
      | "saving"
      | "failed"
      | "conflict"
      | "invalid"
      | "quotaAccount"
      | "quotaWorkspace"
    >("idle");
  const lastCanvasSignature = useRef("");
  const importInput = useRef<HTMLInputElement>(null);
  const forceSave = useRef(restored || revision === 0);
  const current = useRef({ scene: initial, title: originalTitle }),
    base = useRef(revision),
    pending = useRef<SaveAttempt | null>(null),
    running = useRef(false),
    mounted = useRef(true),
    initialized = useRef(false),
    savedSignature = useRef(
      JSON.stringify([originalTitle, JSON.stringify(initial)]),
    ),
    hasUnsaved = useRef(restored);
  const signature = () =>
    JSON.stringify([
      current.current.title,
      JSON.stringify(current.current.scene),
    ]);
  const change = useCallback(
    (value: unknown) => {
      try {
        const scene = normalizeScene(value);
        const canvasSignature = JSON.stringify(scene);
        if (canvasSignature === lastCanvasSignature.current) return;
        lastCanvasSignature.current = canvasSignature;
        current.current.scene = scene;
        const sig = JSON.stringify([
          current.current.title,
          JSON.stringify(scene),
        ]);
        if (!initialized.current) {
          initialized.current = true;
          if (!restored)
            savedSignature.current = JSON.stringify([
              originalTitle,
              JSON.stringify(scene),
            ]);
        }
        const changed =
          !readOnly && (forceSave.current || sig !== savedSignature.current);
        hasUnsaved.current = changed;
        setDirty(changed);
        setGeneration((n) => n + 1);
        setStatus((old) => (old === "invalid" ? "idle" : old));
      } catch {
        setStatus("invalid");
        hasUnsaved.current = true;
        setDirty(true);
      }
    },
    [originalTitle, restored, readOnly],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (hasUnsaved.current || running.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  useEffect(() => {
    registerCloseGuard?.(
      () =>
        !running.current && (!hasUnsaved.current || window.confirm(c.leave)),
    );
    return () => registerCloseGuard?.(null);
  }, [registerCloseGuard, c.leave]);
  const saveRef = useRef<() => void>(() => {});
  async function save() {
    if (
      readOnly ||
      running.current ||
      !current.current.title.trim() ||
      current.current.title.trim().length > 120 ||
      status === "conflict" ||
      status === "invalid"
    )
      return;
    running.current = true;
    setStatus("saving");
    try {
      if (!pending.current)
        pending.current = await prepareSave(
          current.current.scene,
          current.current.title,
          base.current,
        );
      const attempt = pending.current;
      const version = await persist(attempt);
      base.current = version;
      savedSignature.current = attempt.signature;
      pending.current = null;
      forceSave.current = false;
      if (mounted.current) {
        onSaved(version);
        setStatus("idle");
        const changed = signature() !== savedSignature.current;
        hasUnsaved.current = changed;
        setDirty(changed);
        setGeneration((n) => n + 1);
      }
    } catch (error) {
      if (mounted.current) {
        const code = (error as { code?: string })?.code;
        if (code === "PZ101" || code === "PZ102") pending.current = null;
        setStatus(
          code === "40001"
            ? "conflict"
            : code === "PZ101"
              ? "quotaAccount"
              : code === "PZ102"
                ? "quotaWorkspace"
                : "failed",
        );
      }
    } finally {
      running.current = false;
    }
  }
  async function releaseIncompleteSave() {
    const attempt = pending.current;
    if (!attempt || running.current) return;
    running.current = true;
    setStatus("saving");
    try {
      await cancelPending(attempt);
      pending.current = null;
      if (mounted.current) setStatus("failed");
    } catch {
      if (mounted.current) setStatus("failed");
    } finally {
      running.current = false;
    }
  }
  saveRef.current = () => {
    void save();
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: each drawing change resets the autosave delay
  useEffect(() => {
    if (!dirty || readOnly || status !== "idle" || !title.trim()) return;
    const timer = setTimeout(() => saveRef.current(), 2500);
    return () => clearTimeout(timer);
  }, [dirty, generation, readOnly, status, title]);
  function reloadCurrent() {
    if (!hasUnsaved.current || window.confirm(c.leave)) reload();
  }
  async function importFile(file: File) {
    try {
      if (file.size > MAX_SCENE_BYTES) throw new Error("large");
      const scene = normalizeScene(JSON.parse(await file.text()));
      if (hasUnsaved.current && !window.confirm(c.leave)) return;
      current.current.scene = scene;
      initialized.current = true;
      setCanvasScene(scene);
      setCanvasKey((n) => n + 1);
      setDirty(true);
      hasUnsaved.current = true;
      setGeneration((n) => n + 1);
    } catch {
      setStatus("invalid");
    }
  }
  return (
    <>
      <header className="sketch-toolbar">
        <a className="back-link" href={back}>
          {c.back}
        </a>
        <label className="field" htmlFor="sketch-title">
          <span className="sketch-title-label">{c.name}</span>
          <Input
            id="sketch-title"
            value={title}
            maxLength={120}
            required
            readOnly={readOnly}
            onChange={(e) => {
              setTitle(e.target.value);
              current.current.title = e.target.value;
              hasUnsaved.current = signature() !== savedSignature.current;
              setDirty(hasUnsaved.current);
              setGeneration((n) => n + 1);
            }}
          />
        </label>
        <div className="task-actions">
          <span role="status">
            {readOnly
              ? c.readOnly
              : status === "saving"
                ? c.saving
                : dirty
                  ? c.dirty
                  : c.saved}
          </span>
          {!readOnly && (
            <Button
              disabled={
                status === "saving" ||
                status === "conflict" ||
                status === "invalid" ||
                !title.trim() ||
                (!dirty && !pending.current)
              }
              onClick={() => void save()}
            >
              {status === "failed" ||
              status === "quotaAccount" ||
              status === "quotaWorkspace"
                ? c.retry
                : c.save}
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            title={c.download}
            aria-label={c.download}
            onClick={() => downloadScene(current.current.scene, title)}
          >
            <Download size={18} aria-hidden="true" />
          </Button>
          {!readOnly && (
            <Button
              variant="outline"
              size="icon"
              title={c.import}
              aria-label={c.import}
              disabled={status === "saving" || !!pending.current}
              onClick={() => importInput.current?.click()}
            >
              <Upload size={18} aria-hidden="true" />
            </Button>
          )}
        </div>
        {!readOnly && (
          <span className="sketch-import">
            <input
              ref={importInput}
              type="file"
              aria-label={c.import}
              accept=".excalidraw,application/json"
              disabled={status === "saving" || !!pending.current}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
                e.target.value = "";
              }}
            />
          </span>
        )}
      </header>
      <p className="helper-text">{readOnly ? c.hint : c.autosave}</p>
      {restored && <p>{c.restoring}</p>}
      {[
        "failed",
        "conflict",
        "invalid",
        "quotaAccount",
        "quotaWorkspace",
      ].includes(status) && (
        <div className="sketch-notice" role="alert">
          <p>
            {
              c[
                status as
                  | "failed"
                  | "conflict"
                  | "invalid"
                  | "quotaAccount"
                  | "quotaWorkspace"
              ]
            }
          </p>
          {pending.current &&
            (status === "failed" || status === "conflict") && (
              <Button
                variant="outline"
                onClick={() => void releaseIncompleteSave()}
              >
                {c.releaseIncomplete}
              </Button>
            )}
          <Button variant="outline" onClick={reloadCurrent}>
            {c.reload}
          </Button>
        </div>
      )}
      <SketchCanvas
        key={canvasKey}
        scene={canvasScene}
        readOnly={readOnly}
        locale={locale}
        onChange={change}
      />
    </>
  );
}
