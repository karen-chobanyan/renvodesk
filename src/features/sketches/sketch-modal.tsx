import { History, Info, PanelLeftClose } from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCompanyAccess } from "@/features/team/company-access";
import { useLocale } from "@/lib/i18n";
import { sketchCopy } from "./sketch-copy";
import "./sketch-modal.css";
import type { Scene } from "./sketch-model";
import {
  getSave,
  getSketch,
  history,
  loadScene,
  persistSketch,
  type Sketch,
  type SketchSave,
} from "./sketch-service";

const Editor = lazy(() =>
  import("./sketch-editor").then((m) => ({ default: m.SketchEditor })),
);
export function SketchModal({
  org,
  project,
  id,
  initialRevision = null,
  initialRestore = false,
  onClose,
}: {
  org: string;
  project: string;
  id: string;
  initialRevision?: string | null;
  initialRestore?: boolean;
  onClose: () => void;
}) {
  const { locale } = useLocale(),
    c = sketchCopy[locale],
    access = useCompanyAccess(org);
  const [data, setData] = useState<{
      sk: Sketch;
      scene: Scene;
      save: SketchSave | null;
    } | null>(null),
    [failed, setFailed] = useState(false),
    [rows, setRows] = useState<SketchSave[]>([]),
    [more, setMore] = useState(false);
  const [version, setVersion] = useState(0);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [selection, setSelection] = useState({
    revision: initialRevision,
    restore: initialRestore,
  });
  const [reload, setReload] = useState(0);
  const closeGuard = useRef<(() => boolean) | null>(null);
  const registerCloseGuard = useCallback((guard: (() => boolean) | null) => {
    closeGuard.current = guard;
  }, []);
  const [showHistory, setShowHistory] = useState(
    () => window.matchMedia("(min-width: 701px)").matches,
  );
  const [showInfo, setShowInfo] = useState(false);
  const back = `/workspace/${org}/projects/${project}#project-sketches`;
  const selected = selection.revision,
    restored = selection.restore;
  function showRevision(revision: string | null, restore = false) {
    if (closeGuard.current && !closeGuard.current()) return;
    setSelection({ revision, restore });
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload explicitly retries the sketch query
  useEffect(() => {
    let active = true;
    setData(null);
    setFailed(false);
    void getSketch(org, project, id)
      .then(async (sk) => {
        const save = selected
          ? await getSave(sk, selected)
          : sk.current_save_id
            ? await getSave(sk, sk.current_save_id)
            : null;
        if (selected && !save?.committed_at) throw new Error("Not published");
        const scene = await loadScene(save);
        const h = await history(sk);
        if (active) {
          setData({ sk, scene, save });
          setVersion(sk.revision);
          setRows(h);
          setMore(h.length === 20);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [org, project, id, selected, reload]);
  const old = !!selected;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && (closeGuard.current?.() ?? true)) onClose();
      }}
    >
      <DialogContent
        className="sketch-dialog"
        title={data?.save?.title ?? data?.sk.title ?? c.title}
        description={c.hint}
        closeLabel={c.back}
      >
        {failed ? (
          <div className="sketch-dialog-message">
            <p role="alert">{c.error}</p>
            <Button onClick={() => setReload((value) => value + 1)}>
              {c.retry}
            </Button>
          </div>
        ) : !data ||
          access.loading ||
          (selected
            ? data.save?.id !== selected
            : (data.save?.id ?? null) !== data.sk.current_save_id) ? (
          <p className="sketch-dialog-message" role="status">
            {c.loading}
          </p>
        ) : (
          <div className={`sketch-viewer${showHistory ? " has-history" : ""}`}>
            {showHistory && (
              <aside
                className="sketch-history"
                id="sketch-history"
                aria-label={c.history}
              >
                <header>
                  <strong>
                    {c.history} · {c.revision} {version}
                  </strong>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={c.history}
                    aria-label={c.history}
                    onClick={() => setShowHistory(false)}
                  >
                    <PanelLeftClose size={16} aria-hidden="true" />
                  </Button>
                </header>
                <div className="sketch-history-body">
                  {historyFailed && <p role="alert">{c.error}</p>}
                  {old && (
                    <p>
                      {c.historyHint}{" "}
                      <button
                        type="button"
                        className="sketch-history-link"
                        onClick={() => showRevision(null)}
                      >
                        {c.current}
                      </button>
                    </p>
                  )}
                  {old && access.owner && !restored && (
                    <Button onClick={() => showRevision(selected, true)}>
                      {c.restore}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void history(data.sk)
                        .then((h) => {
                          setHistoryFailed(false);
                          setRows(h);
                          setMore(h.length === 20);
                        })
                        .catch(() => setHistoryFailed(true));
                    }}
                  >
                    {c.refresh}
                  </Button>
                  <nav aria-label={c.history}>
                    {rows.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => showRevision(row.id)}
                      >
                        {c.revision} {row.revision} · {row.title}
                      </button>
                    ))}
                  </nav>
                  {more && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        void history(data.sk, rows.length)
                          .then((h) => {
                            setRows((old) => [...old, ...h]);
                            setMore(h.length === 20);
                          })
                          .catch(() => setHistoryFailed(true));
                      }}
                    >
                      {c.more}
                    </Button>
                  )}
                </div>
              </aside>
            )}
            <div className="sketch-viewer-stage">
              <Suspense fallback={<p role="status">{c.loading}</p>}>
                <Editor
                  key={`${selected ?? "current"}:${restored ? "restore" : "view"}:${reload}`}
                  initial={data.scene}
                  title={data.save?.title ?? data.sk.title}
                  revision={data.sk.revision}
                  readOnly={!access.owner || (old && !restored)}
                  restored={restored && access.owner}
                  locale={locale}
                  persist={(a) => persistSketch(data.sk, a)}
                  onSaved={(value) => {
                    setVersion(value);
                    if (restored)
                      setSelection({ revision: null, restore: false });
                  }}
                  reload={() => {
                    setSelection({ revision: null, restore: false });
                    setReload((value) => value + 1);
                  }}
                  back={back}
                  registerCloseGuard={registerCloseGuard}
                />
              </Suspense>
            </div>
            <fieldset className="sketch-viewer-controls" aria-label={c.title}>
              <Button
                variant="ghost"
                size="icon"
                title={c.history}
                aria-label={c.history}
                aria-expanded={showHistory}
                aria-controls="sketch-history"
                onClick={() => setShowHistory((value) => !value)}
              >
                <History size={18} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={c.hint}
                aria-label={c.hint}
                aria-expanded={showInfo}
                aria-controls="sketch-information"
                onClick={() => setShowInfo((value) => !value)}
              >
                <Info size={18} aria-hidden="true" />
              </Button>
            </fieldset>
            {showInfo && (
              <aside className="sketch-information" id="sketch-information">
                <strong>{c.title}</strong>
                <p>{access.owner ? c.autosave : c.readOnly}</p>
              </aside>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
