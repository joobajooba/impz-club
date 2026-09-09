const LINKS = [
  {
    href: "https://opensea.io/collection/implingz?status=listed",
    label: "OpenSea",
    detail: "Buy an Imp",
  },
  {
    href: "https://discord.gg/Uhz6esdEAf",
    label: "Discord",
    detail: "Chat with us",
  },
  {
    href: "https://x.com/StudioImpz",
    label: "X",
    detail: "Studio Impz",
  },
];

export default function Portal() {
  return (
    <main className="portal">
      <section className="copy">
        <h2>
          Official
          <br />
          <span>Links</span>
        </h2>
        <p>Join the Club Impz community and find Impz on these official pages.</p>
      </section>
      <div className="portal-links">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
            <span className="portal-label">{link.label}</span>
            <span className="portal-detail">{link.detail}</span>
          </a>
        ))}
      </div>
    </main>
  );
}
