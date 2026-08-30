export default function Profile() {
  return (
    <main className="profile">
      <div id="profile-app">
        <div className="profile-grid">
          <button type="button" className="profile-box profile-pic">
            <span>profile picture</span>
          </button>
          <div className="profile-stats">
            <div className="profile-box">User Rank</div>
            <div className="profile-box">Total Impz</div>
            <div className="profile-box">Total imp coins</div>
          </div>
          <div className="profile-under">
            <input
              className="profile-box"
              type="text"
              maxLength={24}
              placeholder="username"
              aria-label="Username"
              readOnly
            />
            <button type="button" className="profile-box profile-wallet">
              Connect Wallet
            </button>
          </div>
          <div className="profile-box profile-age">account age (days)</div>
        </div>
      </div>
    </main>
  );
}
