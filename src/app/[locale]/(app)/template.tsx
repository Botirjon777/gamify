/** Re-mounted on every navigation → each page fades in smoothly. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
