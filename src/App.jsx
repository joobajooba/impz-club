import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import ConnectWallet from "./components/ConnectWallet.jsx";

const NAV = [
  { to: "/", label: "Hub", end: true },
  { to: "/team", label: "The Team" },
  { to: "/imp-viewer", label: "Imp Viewer" },
  { to: "/collection", label: "Collection" },
  { to: "/imp-merchant", label: "Imp Merchant" },
  { to: "/roadmap", label: "Roadmap" },
  { to: "/official-links", label: "Official Links" },
  { to: "/faqs", label: "FAQs" },
  { to: "/community", label: "Community" },
];

function Stars() {
  return (
    <>
      <div className="stars" aria-hidden="true" />
      <div className="stars2" aria-hidden="true" />
      <div className="stars3" aria-hidden="true" />
    </>
  );
}

function Hub() {
  return (
    <main className="stage">
      <h1>
        <span>Club</span>
        <span>Impz</span>
      </h1>
      <img src="/imp.png" alt="" />
    </main>
  );
}

function BlankPage() {
  return <main className="page" />;
}

function Shell() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="topbar">
        <button
          type="button"
          className="menu-button"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="topbar-right">
          <ConnectWallet className="wallet-button" />
          <div className="wallet-slot" />
        </div>
      </header>
      {open ? <button type="button" className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
      <aside id="site-nav" className={open ? "sidebar open" : "sidebar"}>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/team" element={<BlankPage />} />
        <Route path="/imp-viewer" element={<BlankPage />} />
        <Route path="/collection" element={<BlankPage />} />
        <Route path="/imp-merchant" element={<BlankPage />} />
        <Route path="/roadmap" element={<BlankPage />} />
        <Route path="/official-links" element={<BlankPage />} />
        <Route path="/faqs" element={<BlankPage />} />
        <Route path="/community" element={<BlankPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <>
      <Stars />
      <Shell />
    </>
  );
}
