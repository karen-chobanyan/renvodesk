import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { useLocale } from "@/lib/i18n";
import { NewSketchDialog } from "./new-sketch-dialog";
import { sketchCopy } from "./sketch-copy";
import {
  createSketch,
  getSave,
  listSketches,
  loadPreview,
  type Sketch,
} from "./sketch-service";

export function SketchPreview({ sk }: { sk: Sketch }) {
  const [url, setUrl] = useState(""),
    [failed, setFailed] = useState(false);
  const { locale } = useLocale();
  useEffect(() => {
    setUrl("");
    setFailed(false);
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
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
      if (object) URL.revokeObjectURL(object);
    };
  }, [sk]);
  return url ? (
    <img className="sketch-preview" src={url} alt="" />
  ) : failed ? (
    <span className="sketch-preview-error">
      {sketchCopy[locale].previewError}
    </span>
  ) : null;
}
export function ProjectSketches({
  org,
  project,
  owner,
  onOpenSketch,
  refreshKey,
  active = true,
}: {
  org: string;
  project: string;
  owner: boolean;
  onOpenSketch: (id: string) => void;
  refreshKey: number;
  active?: boolean;
}) {
  const { locale } = useLocale(),
    c = sketchCopy[locale];
  const { session } = useAuth();
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
    return () => {
      activeRef.current = false;
    };
  }, [active]);
  const query = useInfiniteQuery({
    queryKey: ["workspace", session?.user.id, org, "project-sketches", project],
    queryFn: ({ pageParam }) => listSketches(org, project, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.length === 20 ? pages.length * 20 : undefined,
    enabled: active,
    staleTime: 0,
    retry: false,
  });
  const items = Array.from(
    new Map(
      (query.data?.pages.flat() ?? []).map((row) => [row.id, row]),
    ).values(),
  );
  const [creating, setCreating] = useState(false);
  const [search] = useSearchParams();
  const wantsNew =
    active &&
    owner &&
    search.get("tab") === "documents" &&
    search.get("new") === "sketch";
  useEffect(() => {
    if (wantsNew) setCreating(true);
  }, [wantsNew]);
  useEffect(() => {
    if (!active) setCreating(false);
  }, [active]);
  const refetch = query.refetch;
  const lastRefresh = useRef(refreshKey);
  useEffect(() => {
    if (lastRefresh.current !== refreshKey) {
      lastRefresh.current = refreshKey;
      void refetch();
    }
  }, [refreshKey, refetch]);
  useEffect(() => {
    const focus = () => {
      if (active) void refetch({ cancelRefetch: false });
    };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [active, refetch]);
  return (
    <section id="project-sketches" className="company-form">
      <header className="document-section-heading">
        <div>
          <h2>{c.title}</h2>
          <p className="helper-text">{c.hint}</p>
        </div>
        {owner && (
          <Button variant="outline" onClick={() => setCreating(true)}>
            {c.new}
          </Button>
        )}
      </header>
      {creating && (
        <NewSketchDialog
          close={() => {
            setCreating(false);
            void refetch();
          }}
          create={async (title, id) => {
            const sk = await createSketch(org, project, id, title);
            setCreating(false);
            void refetch();
            if (activeRef.current) onOpenSketch(sk.id);
          }}
        />
      )}
      {query.isError && !query.isFetchNextPageError && (
        <div role="alert">
          <p>{c.error}</p>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void refetch()}
          >
            {c.retry}
          </Button>
        </div>
      )}
      {query.isPending && !query.isError && <p role="status">{c.loading}</p>}
      {!query.isPending && !query.isError && !items.length && (
        <div className="document-empty">
          <strong>{c.empty}</strong>
          {owner && <p className="helper-text">{c.emptyHint}</p>}
        </div>
      )}
      <div className="document-sketch-gallery">
        {items.map((sk) => (
          <button
            className="sketch-list-row"
            key={sk.id}
            type="button"
            onClick={() => onOpenSketch(sk.id)}
          >
            <div className="document-sketch-canvas">
              <svg
                className="document-sketch-placeholder"
                viewBox="0 0 64 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                aria-hidden="true"
              >
                <path d="M10 8h44v32H10zM10 25h20V8m0 32V25h24M38 25v15" />
                <path d="m22 35 22-22 4 4-22 22-6 2z" />
              </svg>
              <SketchPreview sk={sk} />
            </div>
            <span>
              <strong>{sk.title}</strong>
              <small>
                {sk.revision ? `${c.revision} ${sk.revision}` : c.unsaved}
              </small>
            </span>
            <span className="document-sketch-open">
              {c.open}
              <span aria-hidden="true">↗</span>
            </span>
          </button>
        ))}
      </div>
      {query.isFetchNextPageError && <p role="alert">{c.moreError}</p>}
      {query.hasNextPage && (
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.fetchNextPage({ cancelRefetch: false })}
        >
          {query.isFetchingNextPage
            ? c.loading
            : query.isFetchNextPageError
              ? c.retry
              : c.more}
        </Button>
      )}
    </section>
  );
}
