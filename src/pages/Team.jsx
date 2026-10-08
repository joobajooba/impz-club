const MEMBERS = [
  { name: "J00BA", role: "Project Founder", src: "/team/j00ba.png" },
  { name: "jonnyD", role: "Community Manager", src: "/team/jonnyd.png" },
  { name: "CHA", role: "Modelling", src: "/team/cha.png" },
];

export default function Team() {
  return (
    <main className="team-page">
      <h1>The Team</h1>
      <div className="team-grid">
        {MEMBERS.map((member) => (
          <article className="team-card" key={member.name}>
            <img src={member.src} alt="" />
            <h2>{member.name}</h2>
            <p>{member.role}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
