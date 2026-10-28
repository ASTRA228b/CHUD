# ChudGPT integration

Contracts were checked against the [published API guide](https://chudgpt-landing.vercel.app/api-guide) and the existing repository's API implementation. All four model info routes returned HTTP 200 during initial validation. No live generation claim follows from that result; generation is owner-hosted and can be unavailable.

| Model              | Default route prefix                                      | Request                   |
| ------------------ | --------------------------------------------------------- | ------------------------- |
| ChudGPT-Code       | https://chudgpt-xi.vercel.app/api/models/code             | message + session_id      |
| ChudGPT-Plato      | https://chudgpt-xi.vercel.app/api/plato/models/plato      | messages + max_new_tokens |
| ChudGPT-Plato-Mini | https://chudgpt-xi.vercel.app/api/plato/models/plato-mini | messages + max_new_tokens |
| ChudGPT-Public     | https://chudgpt-public.vercel.app/api/models/public       | message + session_id      |

Chat appends `/chat`; model status reads the prefix itself. Public/Main clear appends `/clear` with the model's session ID. Plato is stateless and has no clear endpoint. Studio keeps separate conversations and sessions by model. Public endpoints require no API key; no credentials are stored or logged. API base URLs can be configured, with HTTP restricted to loopback hosts.

Plato sends at most 12 messages / 4,000 characters and requests 128 tokens. Older turns are dropped from a request when necessary. Public and Code send the latest message to an independent server session. Message plus context is limited to 4,000 characters; explicitly attached file/selection/diagnostic context is limited to 3,000. Context defaults to None. Studio never collects a whole project for upload.

The adapter validates response content type, non-empty reply, selected model and Plato's neural source. HTTP failures, malformed/empty responses, timeouts and cancellation are surfaced. Stop aborts the local request; the remote server may continue inference. No offline canned replies exist.

Markdown code blocks can be copied or proposed as an entire current-file replacement. The diff must be approved in Studio before the buffer is changed. Generated commands are never executed automatically. Chat history is in memory for this milestone. Regenerate resubmits the latest user turn; Public/Main may retain that previous turn in their server session. Persistent history, streaming and multi-file patching remain future work.
