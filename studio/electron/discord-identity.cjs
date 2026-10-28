// Public application identifier registered for CHUD Studio. This is not a
// credential; bot tokens and client secrets must never be bundled with Studio.
const APPLICATION_ID = "1564819192656437389";

function applicationIdFor(settings) {
  const custom =
    settings.useCustomApplication ?? Boolean(settings.applicationId);
  return custom ? settings.applicationId : APPLICATION_ID;
}

module.exports = { APPLICATION_ID, applicationIdFor };
