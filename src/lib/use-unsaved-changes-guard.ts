import { useEffect } from "react";

/** Native navigation cancellation keeps BrowserRouter and the document on the
 * same entry, including Back/Forward. Older browsers retain link/unload guards. */
export function useUnsavedChangesGuard(dirty: boolean, message: string) {
  useEffect(() => {
    if (!dirty) return;
    function unload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    function navigate(event: NavigateEvent) {
      // Cross-document exits/reloads use the browser's beforeunload dialog.
      if (
        !event.destination.sameDocument ||
        event.navigationType === "reload" ||
        event.hashChange ||
        !event.cancelable
      )
        return;
      if (event.destination.url === window.location.href) return;
      if (!window.confirm(message)) event.preventDefault();
    }
    function linkClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.download ||
        (link.target && link.target !== "_self")
      )
        return;
      const next = new URL(link.href);
      if (
        next.origin !== location.origin ||
        (next.pathname === location.pathname && next.search === location.search)
      )
        return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", unload);
    if (window.navigation)
      window.navigation.addEventListener("navigate", navigate);
    else document.addEventListener("click", linkClick, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      if (window.navigation)
        window.navigation.removeEventListener("navigate", navigate);
      else document.removeEventListener("click", linkClick, true);
    };
  }, [dirty, message]);
}
