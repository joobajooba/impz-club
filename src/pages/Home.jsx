import { useRef } from "react";

export default function Home() {
  const teamRef = useRef(null);

  function openTeam() {
    teamRef.current?.showModal();
  }

  function closeTeam() {
    teamRef.current?.close();
  }

  return (
    <>
      <main>
        <section className="copy">
          <h2>
            Small Impz.
            <br />
            <span>Big Community</span>
          </h2>
          <p>
            Club Impz is the home of the Implingz community, a social virtual world where Impz and
            future Impz can come together, chat, play, and explore. From community activities to
            Web3 experiences, there’s always something new to discover and get involved in.
          </p>
          <div className="actions">
            <div id="connect-wallet">
              <button type="button" className="fill">
                Connect Wallet
              </button>
            </div>
            <a href="https://opensea.io/collection/implingz" target="_blank" rel="noopener">
              Buy an Imp
            </a>
            <a href="https://discord.gg/yvDXXbucQ3" target="_blank" rel="noopener">
              Chat with us
            </a>
            <button type="button" onClick={openTeam}>
              The Team
            </button>
          </div>
        </section>
        <div className="box">
          <img src="/sneakpeek.gif" alt="Sneak peek" />
        </div>
      </main>

      <dialog
        className="site-dialog"
        ref={teamRef}
        onClick={(event) => {
          if (event.target === teamRef.current) closeTeam();
        }}
      >
        <div className="team-head">
          <h3>The Team</h3>
          <button type="button" className="team-close" aria-label="Close" onClick={closeTeam}>
            x
          </button>
        </div>
        <div className="team-grid">
          <article className="team-card">
            <img src="/jooba.png" alt="J00BA" />
            <p className="role">Founder</p>
            <p className="name">J00BA</p>
          </article>
          <article className="team-card">
            <img src="/jonnyd.png" alt="jonnyD" />
            <p className="role">Community Manager</p>
            <p className="name">jonnyD</p>
          </article>
        </div>
      </dialog>
    </>
  );
}
