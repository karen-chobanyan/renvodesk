import { BrandMark } from "../../components/brand-mark";

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <span className={`landing-brand${footer ? " landing-brand-footer" : ""}`}>
      <BrandMark className="landing-brand-mark" />
      RenvoDesk
    </span>
  );
}
