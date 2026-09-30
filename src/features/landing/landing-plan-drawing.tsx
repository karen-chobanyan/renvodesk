import type { PointerEventHandler } from "react";
import type { PlanDrawingCopy, PlanLayer } from "./landing-plans-copy";

// Illustrative ground floor drawn in plan units: 1 unit = 10 mm. The interior
// spans 840 × 520 units (8.4 × 5.2 m); PLAN_ORIGIN places it in the viewBox.
export const PLAN_ORIGIN = 160;
export const PLAN_HEIGHT = 520;

type Box = { x: number; y: number; w: number; h: number };

const windows: Box[] = [
  { x: 110, y: -30, w: 140, h: 30 },
  { x: 480, y: -30, w: 240, h: 30 },
  { x: 840, y: 140, w: 30, h: 240 },
  { x: -30, y: 380, w: 30, h: 70 },
];
const doorGaps: Box[] = [
  { x: 560, y: 520, w: 90, h: 30 },
  { x: 340, y: 400, w: 10, h: 80 },
];
const innerWalls: Box[] = [
  { x: 0, y: 300, w: 340, h: 10 },
  { x: 340, y: 0, w: 10, h: 110 },
  { x: 340, y: 300, w: 10, h: 100 },
  { x: 340, y: 480, w: 10, h: 40 },
];
const axes = [
  { label: "A", x: -15 },
  { label: "B", x: 345 },
  { label: "C", x: 855 },
];
const rows = [
  { label: "1", y: -15 },
  { label: "2", y: 305 },
  { label: "3", y: 535 },
];
const widths = [
  { from: 0, to: 340, at: -60, label: "3 400" },
  { from: 350, to: 840, at: -60, label: "4 900" },
  { from: 0, to: 840, at: -95, label: "8 400" },
];
const heights = [
  { from: 0, to: 300, at: -60, label: "3 000" },
  { from: 310, to: 520, at: -60, label: "2 100" },
  { from: 0, to: 520, at: -95, label: "5 200" },
];

const tick = (x: number, y: number) => `M${x - 5} ${y + 5}L${x + 5} ${y - 5}`;

// Revision cloud: clockwise semicircular bumps around a rectangle.
function cloud({ x, y, w, h }: Box, bump = 12) {
  const nx = Math.max(2, Math.round(w / (2 * bump)));
  const ny = Math.max(2, Math.round(h / (2 * bump)));
  const arc = (r: number, px: number, py: number) =>
    `A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${px.toFixed(1)} ${py.toFixed(1)}`;
  const sides = [
    ...Array.from({ length: nx }, (_, i) =>
      arc(w / nx / 2, x + (w * (i + 1)) / nx, y),
    ),
    ...Array.from({ length: ny }, (_, i) =>
      arc(h / ny / 2, x + w, y + (h * (i + 1)) / ny),
    ),
    ...Array.from({ length: nx }, (_, i) =>
      arc(w / nx / 2, x + w - (w * (i + 1)) / nx, y + h),
    ),
    ...Array.from({ length: ny }, (_, i) =>
      arc(h / ny / 2, x, y + h - (h * (i + 1)) / ny),
    ),
  ];
  return `M${x} ${y}${sides.join("")}Z`;
}

export function PlanDrawing({
  copy,
  layers,
  label,
  onPointerMove,
  onPointerLeave,
}: {
  copy: PlanDrawingCopy;
  layers: Record<PlanLayer, boolean>;
  label: string;
  onPointerMove: PointerEventHandler<SVGSVGElement>;
  onPointerLeave: PointerEventHandler<SVGSVGElement>;
}) {
  return (
    <svg
      className="plan-drawing"
      viewBox="0 0 1080 840"
      role="img"
      aria-label={label}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <defs>
        <pattern
          id="plan-hatch"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" />
        </pattern>
        <marker
          id="plan-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="9"
          markerHeight="9"
          orient="auto"
        >
          <path d="M0 1 9 5 0 9" />
        </marker>
      </defs>
      <g transform={`translate(${PLAN_ORIGIN} ${PLAN_ORIGIN})`}>
        <PlanGrid />
        <PlanStructure copy={copy} />
        <g className="plan-furniture" data-visible={layers.furniture}>
          <PlanFurniture />
        </g>
        <g className="plan-dimensions" data-visible={layers.dimensions}>
          <PlanDimensions />
        </g>
        <g className="plan-notes" data-visible={layers.notes}>
          <PlanNotes copy={copy} />
        </g>
        <PlanSheet copy={copy} />
      </g>
    </svg>
  );
}

function PlanGrid() {
  return (
    <g className="plan-axes">
      {axes.map((axis) => (
        <g key={axis.label}>
          <path d={`M${axis.x} -112V585`} />
          <circle cx={axis.x} cy={-125} r={13} />
          <text x={axis.x} y={-121}>
            {axis.label}
          </text>
        </g>
      ))}
      {rows.map((row) => (
        <g key={row.label}>
          <path d={`M-112 ${row.y}H900`} />
          <circle cx={-125} cy={row.y} r={13} />
          <text x={-125} y={row.y + 4}>
            {row.label}
          </text>
        </g>
      ))}
    </g>
  );
}

function PlanStructure({ copy }: { copy: PlanDrawingCopy }) {
  return (
    <g>
      <path
        className="plan-wall"
        fillRule="evenodd"
        d="M-30 -30H870V550H-30ZM0 0V520H840V0Z"
      />
      {innerWalls.map((wall) => (
        <rect
          key={`${wall.x}-${wall.y}`}
          className="plan-wall"
          {...box(wall)}
        />
      ))}
      {[...windows, ...doorGaps].map((gap) => (
        <rect key={`${gap.x}-${gap.y}`} className="plan-gap" {...box(gap)} />
      ))}
      {windows.map((item) => (
        <g className="plan-window" key={`${item.x}-${item.y}`}>
          <rect {...box(item)} />
          <path
            d={
              item.w > item.h
                ? `M${item.x} ${item.y + 12}H${item.x + item.w}M${item.x} ${item.y + 18}H${item.x + item.w}`
                : `M${item.x + 12} ${item.y}V${item.y + item.h}M${item.x + 18} ${item.y}V${item.y + item.h}`
            }
          />
        </g>
      ))}
      <g className="plan-door">
        <path d="M650 520V430" />
        <path className="plan-swing" d="M650 430A90 90 0 0 0 560 520" />
        <path d="M350 400H430" />
        <path className="plan-swing" d="M430 400A80 80 0 0 1 350 480" />
      </g>
      <g className="plan-rooms">
        <text x={205} y={118}>
          {copy.rooms.kitchen}
        </text>
        <text x={735} y={308}>
          {copy.rooms.living}
        </text>
        <text x={165} y={404}>
          {copy.rooms.utility}
        </text>
      </g>
    </g>
  );
}

function PlanFurniture() {
  return (
    <>
      <path d="M0 0H340V60H60V240H0Z" />
      <rect x={140} y={9} width={34} height={42} rx={5} />
      <rect x={178} y={9} width={34} height={42} rx={5} />
      <rect x={6} y={104} width={48} height={64} rx={3} />
      {[18, 42].flatMap((cx) =>
        [122, 150].map((cy) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={9} />
        )),
      )}
      <rect x={0} y={245} width={60} height={55} />
      <path d="M0 245 60 300" />
      <rect x={130} y={150} width={150} height={80} rx={2} />
      {[165, 205, 245].map((cx) => (
        <circle key={cx} cx={cx} cy={247} r={10} />
      ))}
      <rect x={430} y={70} width={200} height={90} rx={2} />
      {[450, 500, 550, 600].flatMap((x) =>
        [52, 164].map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={30} height={14} rx={3} />
        )),
      )}
      <rect x={470} y={320} width={60} height={160} rx={6} />
      <path d="M484 320V480M484 373H530M484 427H530" />
      <rect x={565} y={345} width={70} height={70} rx={4} />
      <rect x={10} y={320} width={40} height={190} />
      <path d="M10 368H50M10 416H50M10 464H50" />
      <rect x={270} y={445} width={60} height={60} rx={3} />
      <circle cx={300} cy={475} r={20} />
    </>
  );
}

function PlanDimensions() {
  return (
    <>
      <path
        className="plan-extension"
        d="M0 -36V-103M340 -36V-68M350 -36V-68M840 -36V-103M-36 0H-103M-36 300H-68M-36 310H-68M-36 520H-103"
      />
      {widths.map((dim) => (
        <g key={`${dim.from}-${dim.at}`}>
          <path
            d={`M${dim.from} ${dim.at}H${dim.to}${tick(dim.from, dim.at)}${tick(dim.to, dim.at)}`}
          />
          <text x={(dim.from + dim.to) / 2} y={dim.at - 6}>
            {dim.label}
          </text>
        </g>
      ))}
      {heights.map((dim) => {
        const mid = (dim.from + dim.to) / 2;
        return (
          <g key={`${dim.from}-${dim.at}`}>
            <path
              d={`M${dim.at} ${dim.from}V${dim.to}${tick(dim.at, dim.from)}${tick(dim.at, dim.to)}`}
            />
            <text
              x={dim.at - 6}
              y={mid}
              transform={`rotate(-90 ${dim.at - 6} ${mid})`}
            >
              {dim.label}
            </text>
          </g>
        );
      })}
    </>
  );
}

function PlanNotes({ copy }: { copy: PlanDrawingCopy }) {
  return (
    <>
      <path d={cloud({ x: 130, y: 0, w: 92, h: 60 }, 7)} />
      <ellipse cx={205} cy={200} rx={100} ry={66} strokeDasharray="7 5" />
      <path className="plan-leader" d="M372 208 230 64" />
      <path className="plan-leader" d="M372 256 306 214" />
      <circle cx={820} cy={260} r={11} />
      <circle cx={820} cy={260} r={4} />
      <text x={378} y={214}>
        {copy.notes[0]}
      </text>
      <text x={378} y={262}>
        {copy.notes[1]}
      </text>
      <text x={800} y={244} textAnchor="end">
        {copy.notes[2]}
      </text>
    </>
  );
}

function PlanSheet({ copy }: { copy: PlanDrawingCopy }) {
  return (
    <g className="plan-sheet">
      <rect x={0} y={606} width={100} height={8} className="plan-solid" />
      <rect x={100} y={606} width={100} height={8} />
      <rect x={200} y={606} width={300} height={8} className="plan-solid" />
      {[
        [0, "0"],
        [100, "1"],
        [200, "2"],
        [500, "5 m"],
      ].map(([x, text]) => (
        <text key={text} x={x} y={634}>
          {text}
        </text>
      ))}
      <circle cx={-80} cy={612} r={18} />
      <path className="plan-solid" d="M-80 596 -71 620-80 614-89 620Z" />
      <text x={-80} y={652}>
        N
      </text>
      <rect x={560} y={580} width={310} height={80} />
      <path d="M560 610H870M560 635H870M760 610V660" />
      <text className="plan-sheet-title" x={572} y={600}>
        {copy.title}
      </text>
      <text x={572} y={627}>
        {copy.sheet}
      </text>
      <text x={772} y={627}>
        {copy.scale}
      </text>
      <text x={572} y={652}>
        RENVODESK
      </text>
      <text x={772} y={652}>
        {copy.revision}
      </text>
    </g>
  );
}

function box({ x, y, w, h }: Box) {
  return { x, y, width: w, height: h };
}
