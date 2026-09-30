import { Crosshair, FileText } from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";
import type { LandingLocale } from "./landing-copy";
import { PLAN_HEIGHT, PLAN_ORIGIN, PlanDrawing } from "./landing-plan-drawing";
import { landingPlansCopy, type PlanLayer } from "./landing-plans-copy";

const LAYERS: readonly PlanLayer[] = ["furniture", "dimensions", "notes"];
const EMPTY_READOUT = "X — · Y —";

export function LandingPlans({ locale }: { locale: LandingLocale }) {
  const c = landingPlansCopy[locale];
  const [layers, setLayers] = useState<Record<PlanLayer, boolean>>({
    furniture: true,
    dimensions: true,
    notes: true,
  });
  const readout = useRef<HTMLSpanElement>(null);
  const millimetres = new Intl.NumberFormat(
    locale === "fr" ? "fr-BE" : "en-IE",
  );
  // Writes straight to the DOM so pointer movement never re-renders the plan.
  function trackCursor(event: PointerEvent<SVGSVGElement>) {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix || !readout.current) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    const x = Math.round((point.x - PLAN_ORIGIN) * 10);
    const y = Math.round((PLAN_ORIGIN + PLAN_HEIGHT - point.y) * 10);
    readout.current.textContent = `X ${millimetres.format(x)} · Y ${millimetres.format(y)}`;
  }
  function clearCursor() {
    if (readout.current) readout.current.textContent = EMPTY_READOUT;
  }
  return (
    <section className="landing-plans" id="plans" aria-labelledby="plans-title">
      <div className="landing-plans-inner">
        <div className="landing-section-heading">
          <div>
            <p className="landing-eyebrow">{c.eyebrow}</p>
            <h2 id="plans-title">{c.title}</h2>
          </div>
          <p>{c.intro}</p>
        </div>
        <figure className="plan-viewer">
          <div className="plan-toolbar">
            <span className="plan-file">
              <FileText size={14} aria-hidden="true" />
              {c.viewer.file}
            </span>
            <fieldset className="plan-layers">
              <legend className="landing-sr-only">{c.viewer.layers}</legend>
              {LAYERS.map((layer) => (
                <button
                  key={layer}
                  type="button"
                  aria-pressed={layers[layer]}
                  onClick={() =>
                    setLayers((current) => ({
                      ...current,
                      [layer]: !current[layer],
                    }))
                  }
                >
                  <span className="plan-swatch" data-layer={layer} />
                  {c.viewer.layerNames[layer]}
                </button>
              ))}
            </fieldset>
            <span className="plan-cursor" title={c.viewer.cursor}>
              <Crosshair size={14} aria-hidden="true" />
              <span ref={readout} aria-hidden="true">
                {EMPTY_READOUT}
              </span>
            </span>
          </div>
          <div className="plan-canvas">
            <PlanDrawing
              copy={c.drawing}
              layers={layers}
              label={c.viewer.label}
              onPointerMove={trackCursor}
              onPointerLeave={clearCursor}
            />
          </div>
          <figcaption>
            <span>{c.viewer.scale}</span>
            <span>{c.viewer.caption}</span>
          </figcaption>
        </figure>
        <ul className="landing-plans-points">
          {c.points.map((point, index) => (
            <li key={point.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
