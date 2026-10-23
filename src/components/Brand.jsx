export default function Brand({ light = false, compact = false }) {
  return (
    <span className={`brand ${light ? "brand-light" : ""}`} aria-label="SerFit">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M28 8H16L10 20h16l-4 12H9M31 8l-5 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        ser<span className="brand-fit">fit</span>
        <span className="brand-period">.</span>
      </span>
      {!compact && <span className="brand-caption">ACADEMIA</span>}
    </span>
  );
}
