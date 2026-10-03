const SLIDES = [
  {
    word: "Impz",
    lines: ["Small", "Impz", "Club"],
    note: "The home of the Implingz community, where Impz come together.",
  },
  {
    word: "Club",
    lines: ["Chat", "Play", "Stay"],
    note: "A social virtual world for Impz and future Impz.",
  },
  {
    word: "Play",
    lines: ["Jump", "In", "Now"],
    note: "Community, games, and Web3 in one place.",
  },
];

export default function App() {
  return (
    <>
      <div className="orbs" aria-hidden="true">
        <span>.</span>
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
      <main className="hero">
        {SLIDES.map((slide, index) => (
          <section className="hero-slide" key={slide.word}>
            <p className="hero-index">
              <span>0{index + 1}</span>
              <span>03</span>
            </p>
            <div className="hero-board">
              <h1 className="hero-word">{slide.word}</h1>
              <div className="hero-lower">
                <p className="hero-stack">
                  {slide.lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </p>
                <div className="hero-copy">
                  <p className="hero-note">{slide.note}</p>
                  <p className="hero-explore">Explore →</p>
                </div>
              </div>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
