// Public application identifier registered for CHUD Studio. This is not a
// credential; bot tokens and client secrets must never be bundled with Studio.
const APPLICATION_ID = "1564819192656437389";
// Pinned public artwork: Discord resolves this HTTPS image through its media
// proxy. It works with Studio's default identity and custom application IDs.
const LOGO_URL =
  "https://raw.githubusercontent.com/ASTRA228b/CHUD/d1a96f932a80ee703bb3536be7b03baf2e103760/studio/assets/chud-discord.png";

function applicationIdFor(settings) {
  const custom =
    settings.useCustomApplication ?? Boolean(settings.applicationId);
  return custom ? settings.applicationId : APPLICATION_ID;
}

module.exports = { APPLICATION_ID, LOGO_URL, applicationIdFor };
