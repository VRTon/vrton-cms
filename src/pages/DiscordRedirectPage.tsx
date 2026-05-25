import React, { useEffect } from 'react';

const DISCORD_URL = 'https://discord.gg/AR72D2nfpp';

function DiscordRedirectPage() {
  useEffect(() => {
    window.location.replace(DISCORD_URL);
  }, []);

  return (
    <main className="error-page">
      <div className="container">
        <div className="error-content">
          <h1 className="error-title">Redirigiendo a Discord...</h1>
          <a href={DISCORD_URL} className="btn btn-primary">Haz clic aquí si no eres redirigido automáticamente</a>
        </div>
      </div>
    </main>
  );
}

export default DiscordRedirectPage;