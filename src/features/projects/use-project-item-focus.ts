import { useEffect } from "react";
/** Focus a resolved project row once its tab/data is ready; do not scroll hidden panels. */
export function useProjectItemFocus(
  id: string | null,
  ready: boolean,
  prefix: string,
) {
  useEffect(() => {
    if (!id || !ready) return;
    const frame = requestAnimationFrame(() => {
      const row = document.getElementById(`${prefix}-${id}`);
      if (!row || row.closest("[hidden]")) return;
      row.focus({ preventScroll: true });
      row.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [id, ready, prefix]);
}
