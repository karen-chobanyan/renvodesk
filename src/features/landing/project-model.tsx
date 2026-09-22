import { Layers2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type LandingLocale, landingCopy } from "./landing-copy";

export function ProjectModel({ locale }: { locale: LandingLocale }) {
  const c = landingCopy[locale];
  const [expanded, setExpanded] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const motion = useRef(false);
  useEffect(() => {
    const query = window.matchMedia(
      "(prefers-reduced-motion: no-preference) and (pointer: fine)",
    );
    const change = () => {
      motion.current = query.matches;
    };
    change();
    query.addEventListener("change", change);
    return () => {
      query.removeEventListener("change", change);
      cancelAnimationFrame(frame.current);
    };
  }, []);
  function reset() {
    cancelAnimationFrame(frame.current);
    surface.current?.style.setProperty("--tilt-x", "0deg");
    surface.current?.style.setProperty("--tilt-y", "0deg");
  }
  return (
    <figure className="landing-model landing-cad">
      <div
        ref={surface}
        className={`cad-surface ${expanded ? "model-expanded" : ""}`}
        onPointerMove={(event) => {
          if (!motion.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          cancelAnimationFrame(frame.current);
          frame.current = requestAnimationFrame(() => {
            surface.current?.style.setProperty("--tilt-x", `${-y * 7}deg`);
            surface.current?.style.setProperty("--tilt-y", `${x * 9}deg`);
          });
        }}
        onPointerLeave={reset}
        aria-hidden="true"
      >
        <div className="cad-toolbar">
          <span>RENVO / A—01</span>
          <span>{locale === "fr" ? "AXONOMÉTRIE" : "AXONOMETRIC"} · 1:50</span>
        </div>
        <svg
          className="cad-drawing"
          viewBox="0 0 540 400"
          fill="none"
          aria-hidden="true"
        >
          <g className="cad-guides">
            <path d="M30 260 280 135 510 250M30 290 280 165 510 280M280 40V360M40 350 490 125" />
            <path d="M80 270V335M320 150V215M450 215V280M90 323 320 208M326 208 455 273" />
            <path d="m84 319 12 8m218-123 12 8m-5-9 10 10m119 55 10 10" />
          </g>
          <g className="cad-slab">
            <path d="M70 250 310 130 460 205 220 325Z" />
            <path d="M70 250v12l150 75 240-120v-12M220 325v12" />
          </g>
          <g className="cad-walls">
            <path d="M70 250V145L310 25V130M70 145 220 220 460 100V205M310 25 460 100" />
            <path d="M80 245v-95L310 35 450 105v95M80 150 220 220M310 35v95" />
            <path d="m120 225 65-32v-65l-65 32Zm5-9 55-27v-51l-55 27Zm27-68v54" />
            <path d="m337 142 73 36v-51l-73-36Zm36-33v49" />
            <path d="m240 240 55-28v-80l-55 28Zm55-28 45 23v-80l-45-23" />
          </g>
          <g className="cad-plan" transform="matrix(1 .5 -1 .5 310 130)">
            <path d="M-220 0H0V130H-220ZM-210 12h70v25h-70ZM-130 12h25v65h-25ZM-75 80h60v35h-60Z" />
            <path d="M-205 60h55v50h-55ZM-200 65h45v12h-45ZM-200 92h45v12h-45ZM-115 90h25v20h-25Z" />
            <circle cx="-43" cy="40" r="19" />
            <path d="M-220 130h70m35 0H0M-150 130v-35a35 35 0 0 1 35 35" />
          </g>
          <g className="cad-roof model-roof">
            <path d="M70 134 310 14 460 89 220 209Z" />
            <path d="m110 114 150 75m-110-95 150 75m-110-95 150 75m-110-95 150 75m-110-95 150 75" />
          </g>
          <g className="cad-labels" fill="currentColor" stroke="none">
            <text x="175" y="294" transform="rotate(-26.565 175 294)">
              8 400
            </text>
            <text x="373" y="235" transform="rotate(26.565 373 235)">
              5 200
            </text>
            <text x="33" y="380">
              {locale === "fr"
                ? "RÉNOVATION / NIVEAU 00"
                : "RENOVATION / LEVEL 00"}
            </text>
            <text x="405" y="380">
              01 — 03
            </text>
          </g>
          <g className="cad-axis">
            <path d="M475 340v-35m0 35 28 14m-28-14-28 14" />
            <text x="472" y="297">
              Z
            </text>
            <text x="510" y="362">
              X
            </text>
            <text x="432" y="362">
              Y
            </text>
          </g>
        </svg>
      </div>
      <figcaption>
        <span>{c.modelCaption}</span>
        <button
          type="button"
          className="landing-model-toggle"
          aria-pressed={expanded}
          onClick={() => {
            reset();
            setExpanded(!expanded);
          }}
        >
          {expanded ? <RotateCcw size={15} /> : <Layers2 size={15} />}
          {expanded ? c.assemble : c.explode}
        </button>
      </figcaption>
      <span className="landing-sr-only">{c.heroModel}</span>
    </figure>
  );
}
