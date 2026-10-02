/** Picture questions are black on white — they keep a white card in the dark theme too. */
export function IqImage({ src, className = "" }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- served from the media store, already small
    <img src={src} alt="" draggable={false} className={`border border-border bg-white object-contain ${className}`} />
  );
}

/** One answer cut out of the answers picture: cell `index` of a columns × rows grid of equal squares. */
export function IqOptionCell({ sheet, index, className = "" }: { sheet: { src: string; columns: number; rows: number }; index: number; className?: string }) {
  const at = (n: number, of: number) => (of > 1 ? (n / (of - 1)) * 100 : 0);
  return (
    <span
      aria-hidden
      className={`block aspect-square bg-white bg-no-repeat ${className}`}
      style={{
        backgroundImage: `url(${sheet.src})`,
        backgroundSize: `${sheet.columns * 100}% ${sheet.rows * 100}%`,
        backgroundPosition: `${at(index % sheet.columns, sheet.columns)}% ${at(Math.floor(index / sheet.columns), sheet.rows)}%`,
      }}
    />
  );
}
