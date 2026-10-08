const FAQS = [
  {
    question: "What is Implingz?",
    answer: (
      <p>
        Implingz is a collection of <strong>2,222 unique PFPs</strong> launched on Robinhood Chain, originally
        released as a free mint on OpenSea. Each Imp is built with unique traits and is designed to unlock a
        growing range of <strong>gamified experiences, utilities and future adventures</strong>.
      </p>
    ),
  },
  {
    question: "What makes Implingz stand out?",
    answer: (
      <p>
        <strong>Impz are built to evolve.</strong> From new art and collectibles to games, Web3 experiences and
        metaverse integrations, we&apos;re constantly expanding what your Imp can do. The goal is simple:{" "}
        <strong>give holders more reasons to use, play and be part of the Impz ecosystem.</strong>
      </p>
    ),
  },
  {
    question: "What is the collection supply?",
    answer: (
      <p>
        There are <strong>2,222 unique Impz</strong>, each featuring a combination of traits with different
        rarities. No two Impz are exactly alike.
      </p>
    ),
  },
  {
    question: "Where can I get an Imp?",
    answer: (
      <p>
        Impz are available to trade on the{" "}
        <strong>
          <a href="https://opensea.io/collection/implingz" target="_blank" rel="noopener noreferrer">
            OpenSea
          </a>{" "}
          secondary market
        </strong>. Find an Imp you like, grab it, and join the adventure.
      </p>
    ),
  },
  {
    question: "Will there be royalties?",
    answer: (
      <>
        <p>
          Royalties and holder rewards are something we&apos;re continuously evolving. Chapter 1 introduced
          rewards through <strong>free Implingz Keeps and $DERP drops</strong> for Adventurers, alongside{" "}
          <strong>Chapter 1 Staking</strong>, which introduced IMP Coins with future utility.
        </p>
        <p>
          We&apos;re focused on creating <strong>new and engaging reward systems</strong> that evolve alongside
          the Web3 space and give the community more ways to benefit from holding and participating.
        </p>
      </>
    ),
  },
  {
    question: "Where can I stay updated?",
    answer: (
      <>
        <p>
          The best place to stay connected is our{" "}
          <strong>
            <a href="https://discord.gg/dPfutyc55" target="_blank" rel="noopener noreferrer">
              Discord
            </a>
          </strong>, where we share regular updates, development news and community discussions.
        </p>
        <p>
          For bigger announcements and project updates, follow us on{" "}
          <strong>
            <a href="https://x.com/j00ba_j00ba" target="_blank" rel="noopener noreferrer">
              X
            </a>
          </strong>{" "}
          and keep up with the latest from Implingz.
        </p>
      </>
    ),
  },
];

export default function Faqs() {
  return (
    <main className="faq-page">
      <h1>FAQs</h1>
      <div className="faq-list">
        {FAQS.map((item) => (
          <article className="faq-item" key={item.question}>
            <h2>{item.question}</h2>
            {item.answer}
          </article>
        ))}
      </div>
    </main>
  );
}
