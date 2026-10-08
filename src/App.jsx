import { lazy, Suspense, useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import ConnectWallet from "./components/ConnectWallet.jsx";
import ProfileButton from "./components/ProfileButton.jsx";
import Community from "./pages/Community.jsx";
import Merchant from "./pages/Merchant.jsx";
import Team from "./pages/Team.jsx";

const ImpViewer = lazy(() => import("./components/ImpViewer.jsx"));
const Collection = lazy(() => import("./pages/Collection.jsx"));

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

const NAV = [
  {
    label: "Imp Tools",
    icon: (
      <Icon>
        <path
          fill="currentColor"
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a4 4 0 0 1-5.3 5.3l-6.9 6.9a2 2 0 1 1-2.8-2.8l6.9-6.9a4 4 0 0 1 5.3-5.3l-3.8 3.8a1 1 0 0 0 0 1.4z"
        />
      </Icon>
    ),
    items: [
      { to: "/imp-viewer", label: "Imp Viewer" },
      { to: "/collection", label: "Collection" },
      { to: "/merchant", label: "Merchant" },
    ],
  },
  {
    label: "Information",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <path fill="currentColor" d="M11 10h2v7h-2zm0-3h2v2h-2z" />
      </Icon>
    ),
    items: [
      { to: "/roadmap", label: "Roadmap" },
      { to: "/official-links", label: "Official Links" },
      { to: "/team", label: "The Team" },
      { to: "/faqs", label: "FAQs" },
    ],
  },
  {
    label: "Community",
    icon: (
      <Icon>
        <path
          fill="currentColor"
          d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 19a5 5 0 0 1 10 0v1H3zm11 .5c.2-2.4 1.8-4.4 4-5.1A4.5 4.5 0 0 1 21 18.5V20h-7z"
        />
      </Icon>
    ),
    items: [
      { to: "/community", label: "Community List" },
      { to: "/hall-of-fame", label: "Hall of Fame" },
    ],
  },
];

const OFFICIAL_LINKS = [
  {
    href: "https://discord.gg/dPfutyc55",
    label: "Discord",
    icon: (
      <Icon>
        <path
          fill="currentColor"
          d="M19.3 5.3A17 17 0 0 0 15 4l-.2.4a15 15 0 0 0-4.6 0L10 4a17 17 0 0 0-4.3 1.3C2.7 9 2 12.6 2.3 16.2A17 17 0 0 0 7.5 19l.6-1c-.4-.2-.8-.4-1.2-.6l.3-.2a12 12 0 0 0 10.6 0l.3.2c-.4.2-.8.4-1.2.6l.6 1a17 17 0 0 0 5.2-2.8c.4-4.1-.7-7.7-3.4-10.9zM8.7 14.3c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7zm6.6 0c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7z"
        />
      </Icon>
    ),
  },
  {
    href: "https://x.com/j00ba_j00ba",
    label: "X",
    icon: (
      <Icon>
        <path
          fill="currentColor"
          d="M14.6 10.4 22 2h-1.8l-6.4 7.3L8.8 2H2.2l7.8 11.1L2.2 22H4l7-8 5.6 8h6.6l-8.6-11.6zm-2.5 2.8-.8-1.1L4.7 3.5h2.8l5.2 7.3.8 1.1 6.7 9.4h-2.8l-5.3-7.1z"
        />
      </Icon>
    ),
  },
  {
    href: "https://opensea.io/collection/implingz",
    label: "OpenSea",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <path fill="currentColor" d="M12 6.2c.6 1.7 1.6 3.1 2.6 4.3 1 1.3 1.6 2.6 1.6 4a4.2 4.2 0 0 1-8.4 0c0-1.4.6-2.7 1.6-4A12 12 0 0 0 12 6.2z" />
      </Icon>
    ),
  },
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

function OfficialLinks() {
  return (
    <main className="links-page">
      <h1>Official Links</h1>
      <div className="link-list">
        {OFFICIAL_LINKS.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
            {link.icon}
            {link.label}
          </a>
        ))}
      </div>
    </main>
  );
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
          <ProfileButton />
        </div>
      </header>
      {open ? <button type="button" className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
      <aside id="site-nav" className={open ? "sidebar open" : "sidebar"}>
        <button type="button" className="sidebar-close" aria-label="Close navigation" onClick={() => setOpen(false)}>
          <span />
          <span />
        </button>
        <nav>
          <NavLink to="/" end onClick={() => setOpen(false)}>
            Hub
          </NavLink>
          {NAV.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>
                {group.icon}
                {group.label}
              </p>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/team" element={<Team />} />
        <Route
          path="/imp-viewer"
          element={
            <Suspense fallback={<main className="viewer-page"><h1>Imp Viewer</h1></main>}>
              <ImpViewer />
            </Suspense>
          }
        />
        <Route
          path="/collection"
          element={
            <Suspense fallback={<main className="browse"><h1>Collection</h1></main>}>
              <Collection />
            </Suspense>
          }
        />
        <Route path="/merchant" element={<Merchant />} />
        <Route path="/imp-merchant" element={<Merchant />} />
        <Route path="/roadmap" element={<BlankPage />} />
        <Route path="/official-links" element={<OfficialLinks />} />
        <Route path="/faqs" element={<BlankPage />} />
        <Route path="/community" element={<Community />} />
        <Route path="/hall-of-fame" element={<BlankPage />} />
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
