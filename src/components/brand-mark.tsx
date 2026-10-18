/** Decorative beside the RenvoDesk wordmark; also used as the browser favicon. */
export function BrandMark({
  className = "brand-mark",
}: {
  className?: string;
}) {
  return (
    <img
      className={className}
      src="/favicon.svg?v=architectural-r"
      width={32}
      height={32}
      alt=""
      aria-hidden="true"
    />
  );
}
