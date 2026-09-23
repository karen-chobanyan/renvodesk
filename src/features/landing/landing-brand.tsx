export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <span className={`landing-brand${footer ? " landing-brand-footer" : ""}`}>
      <span className="landing-brand-mark">
        r<span>.</span>
      </span>
      RenvoDesk
    </span>
  );
}
