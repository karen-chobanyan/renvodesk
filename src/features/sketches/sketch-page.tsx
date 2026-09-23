import { useNavigate, useParams } from "react-router";
import { SavedProjectPage } from "@/features/projects/saved-project-page";
import { SketchModal } from "./sketch-modal";

// Existing sketch URLs remain usable as direct links. Project links open in place.
export function SketchPage() {
  const { organizationId = "", id = "", sketchId = "" } = useParams();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  return (
    <>
      <SavedProjectPage />
      <SketchModal
        key={`${organizationId}:${id}:${sketchId}`}
        org={organizationId}
        project={id}
        id={sketchId}
        initialRevision={params.get("revision")}
        initialRestore={params.get("restore") === "1"}
        onClose={() =>
          void navigate(
            `/workspace/${organizationId}/projects/${id}#project-sketches`,
          )
        }
      />
    </>
  );
}
