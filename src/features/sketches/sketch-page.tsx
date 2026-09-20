import { lazy, Suspense, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { useCompanyAccess } from "@/features/team/company-access";
import { useLocale } from "@/lib/i18n";
import { sketchCopy } from "./sketch-copy";
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
export function SketchPage() {
  const { organizationId = "", id = "", sketchId = "" } = useParams();
  return (
    <Page
      key={`${organizationId}:${id}:${sketchId}`}
      org={organizationId}
      project={id}
      id={sketchId}
    />
  );
}
function Page({
  org,
  project,
  id,
}: {
  org: string;
  project: string;
  id: string;
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
  const back = `/workspace/${org}/projects/${project}#project-sketches`;
  const params = new URLSearchParams(window.location.search),
    selected = params.get("revision"),
    restored = params.get("restore") === "1";
  useEffect(() => {
    let active = true;
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
  }, [org, project, id, selected]);
  if (failed)
    return (
      <section className="sketch-workspace">
        <a href={back}>{c.back}</a>
        <p role="alert">{c.error}</p>
        <Button onClick={() => window.location.reload()}>{c.retry}</Button>
      </section>
    );
  if (!data || access.loading) return <p role="status">{c.loading}</p>;
  const old = !!selected,
    base = window.location.pathname;
  return (
    <main className="sketch-workspace">
      <Suspense fallback={<p>{c.loading}</p>}>
        <Editor
          initial={data.scene}
          title={data.save?.title ?? data.sk.title}
          revision={data.sk.revision}
          readOnly={!access.owner || (old && !restored)}
          restored={restored && access.owner}
          locale={locale}
          persist={(a) => persistSketch(data.sk, a)}
          onSaved={(value) => {
            if (restored) window.history.replaceState(null, "", base);
            setVersion(value);
          }}
          reload={() => window.location.assign(base)}
          back={back}
        />
      </Suspense>
      <section className="company-form">
        {historyFailed && <p role="alert">{c.error}</p>}
        <h2>
          {c.history} · {c.revision} {version}
        </h2>
        {old && (
          <p>
            {c.historyHint} <a href={base}>{c.current}</a>
          </p>
        )}
        {old && access.owner && !restored && (
          <Button asChild>
            <a href={`${base}?revision=${selected}&restore=1`}>{c.restore}</a>
          </Button>
        )}
        <Button
          variant="outline"
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
        {rows.map((row) => (
          <p key={row.id}>
            <a href={`${base}?revision=${row.id}`}>
              {c.revision} {row.revision} · {row.title}
            </a>
          </p>
        ))}
        {more && (
          <Button
            variant="outline"
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
      </section>
    </main>
  );
}
