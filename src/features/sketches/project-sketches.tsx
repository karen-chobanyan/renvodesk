import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { sketchCopy } from "./sketch-copy";
import {
  createSketch,
  getSave,
  listSketches,
  loadPreview,
  type Sketch,
} from "./sketch-service";

function Preview({ sk }: { sk: Sketch }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true,
      object = "";
    if (sk.current_save_id)
      void getSave(sk, sk.current_save_id)
        .then(loadPreview)
        .then((blob) => {
          if (active) {
            object = URL.createObjectURL(blob);
            setUrl(object);
          }
        })
        .catch(() => {});
    return () => {
      active = false;
      if (object) URL.revokeObjectURL(object);
    };
  }, [sk]);
  return url ? <img className="sketch-preview" src={url} alt="" /> : null;
}
export function ProjectSketches({
  org,
  project,
  owner,
}: {
  org: string;
  project: string;
  owner: boolean;
}) {
  const { locale } = useLocale(),
    c = sketchCopy[locale];
  const [items, setItems] = useState<Sketch[]>([]),
    [title, setTitle] = useState(""),
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false),
    [more, setMore] = useState(false),
    [loaded, setLoaded] = useState(false);
  const request = useRef<{ id: string; title: string } | null>(null);
  async function load(offset = 0) {
    setBusy(true);
    setFailed(false);
    try {
      const rows = await listSketches(org, project, offset);
      setItems((old) => (offset ? [...old, ...rows] : rows));
      setMore(rows.length === 20);
      setLoaded(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: project identity owns the list
  useEffect(() => {
    void load();
  }, [org, project]);
  async function create() {
    setBusy(true);
    setFailed(false);
    request.current ??= { id: crypto.randomUUID(), title: title.trim() };
    try {
      const sk = await createSketch(
        org,
        project,
        request.current.id,
        request.current.title,
      );
      window.location.assign(
        `/workspace/${org}/projects/${project}/sketches/${sk.id}`,
      );
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }
  return (
    <section id="project-sketches" className="company-form">
      <h2>{c.title}</h2>
      <p>{c.hint}</p>
      {owner && (
        <form
          className="sketch-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <label className="field" htmlFor="new-sketch">
            {c.name}
            <Input
              id="new-sketch"
              required
              maxLength={120}
              value={title}
              disabled={busy || !!request.current}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <Button disabled={busy || !title.trim()}>
            {request.current ? c.retry : c.create}
          </Button>
        </form>
      )}
      {failed && (
        <p role="alert">
          {c.error}{" "}
          <Button variant="outline" disabled={busy} onClick={() => void load()}>
            {c.refresh}
          </Button>
        </p>
      )}
      {!loaded && !failed && <p role="status">{c.loading}</p>}
      {loaded && !items.length && <p>{c.empty}</p>}
      {items.map((sk) => (
        <a
          className="sketch-list-row"
          key={sk.id}
          href={`/workspace/${org}/projects/${project}/sketches/${sk.id}`}
        >
          <Preview sk={sk} />
          <span>
            <strong>{sk.title}</strong>
            <small>
              {sk.revision ? `${c.revision} ${sk.revision}` : c.unsaved}
            </small>
          </span>
          <span>{c.open} ↗</span>
        </a>
      ))}
      {more && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void load(items.length)}
        >
          {c.more}
        </Button>
      )}
    </section>
  );
}
