import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/", title: "Home", src: "/nav-home.png", alt: "Home" },
  { to: "/account", title: "Profile", src: "/nav-profile.png", alt: "Profile" },
  { to: "/community", title: "Club", src: "/nav-club.png", alt: "Club" },
  { to: "/official-links", title: "Portal", src: "/nav-portal.png", alt: "Portal" },
  { to: "/collection", title: "Collection", src: "/nav-collection.png", alt: "Collection" },
];

export default function Layout() {
  const settingsRef = useRef(null);
  const [font, setFont] = useState("pixel");
  const [sound, setSound] = useState("on");

  useEffect(() => {
    document.documentElement.classList.toggle("font-arial", font === "arial");
  }, [font]);

  function openSettings() {
    settingsRef.current?.showModal();
  }

  function closeSettings() {
    settingsRef.current?.close();
  }

  return (
    <>
      <header>
        <img src="/logo.gif" alt="Implingz" />
        <h1>Club Impz</h1>
      </header>

      <Outlet context={{ openSettings }} />

      <nav>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} title={item.title} end={item.to === "/"}>
            <img src={item.src} alt={item.alt} />
          </NavLink>
        ))}
        <button type="button" title="Page Settings" onClick={openSettings}>
          <img src="/nav-settings.png" alt="Page Settings" />
        </button>
      </nav>

      <dialog
        className="site-dialog"
        ref={settingsRef}
        onClick={(event) => {
          if (event.target === settingsRef.current) closeSettings();
        }}
      >
        <div className="team-head">
          <h3>Page Settings</h3>
          <button type="button" className="team-close" aria-label="Close" onClick={closeSettings}>
            x
          </button>
        </div>
        <section className="setting">
          <h4>Accessibility</h4>
          <p>Font</p>
          <div className="setting-row">
            <button type="button" className={font === "pixel" ? "fill" : ""} onClick={() => setFont("pixel")}>
              Pixel
            </button>
            <button type="button" className={font === "arial" ? "fill" : ""} onClick={() => setFont("arial")}>
              Arial
            </button>
          </div>
        </section>
        <section className="setting">
          <h4>Sound</h4>
          <div className="setting-row">
            <button type="button" className={sound === "on" ? "fill" : ""} onClick={() => setSound("on")}>
              On
            </button>
            <button type="button" className={sound === "off" ? "fill" : ""} onClick={() => setSound("off")}>
              Off
            </button>
          </div>
        </section>
      </dialog>
    </>
  );
}
