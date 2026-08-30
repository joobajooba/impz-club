import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Profile from "./pages/Profile.jsx";
import Community from "./pages/Community.jsx";
import Portal from "./pages/Portal.jsx";
import Collection from "./pages/Collection.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/account" element={<Profile />} />
        <Route path="/community" element={<Community />} />
        <Route path="/official-links" element={<Portal />} />
        <Route path="/collection" element={<Collection />} />
      </Route>
    </Routes>
  );
}
