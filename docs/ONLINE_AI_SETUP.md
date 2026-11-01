# Online dental AI assistant

The default provider is OpenRouter. The application calls the OpenAI-compatible API directly from the browser using a personal Bring Your Own Key credential.

## Enable the online assistant

1. Open [OpenRouter API Keys](https://openrouter.ai/keys) and create a personal API key.
2. Open the Dental Simulation site over HTTPS.
3. In the dental tutor panel, paste the key in the password field and press **Test connection**.
4. Choose **openrouter/free** to let the router pick a currently available free model, or choose a listed model whose ID ends in `:free`.
5. Ask a general educational question. The assistant sends the request to the selected model over HTTPS.

The model list is fetched at connection time because free variants, their availability and their rate limits change.

## Key handling and deployment model

- The key is kept in a JavaScript variable and the password input for the current page only.
- It is not written to localStorage, sessionStorage, cookies, source files, the model manifest or the GitHub repository.
- The app clears the key when the page is closed or refreshed, and provides a **Clear key** control.
- The key is still present in the browser session while requests are sent. Do not use a shared institutional key in a public static website.
- Create a restricted key and configure a low spending/usage limit on the provider account.
- For a university deployment with many students, deploy a server-side API gateway/proxy. Store the provider key in a hosting secret manager, authenticate users, apply per-user and per-course rate limits, monitor spend, and define a data-retention policy. The static GitHub Pages front-end is not an institutional secret-management layer.

## Free model constraints

OpenRouter documents `openrouter/free` as a router that chooses a compatible free model. Named free variants use IDs ending in `:free`. The free model pool changes. The provider documents 20 requests per minute and 50 requests per day for free variants on accounts below its purchased-credit threshold; larger daily limits may apply after the threshold is reached. Limits can change and failed requests can count against the quota. Free access is useful for testing and personal learning, but is not a service-level guarantee for a class or production platform.

## Educational and clinical boundaries

The assistant receives a curated index of primary professional resources (ADA, AAE, EFP, IADT, SDCEP, AAPD and FDA) as prompt context. It does not retrieve the complete full-text guidelines, and its selected model may produce inaccurate or outdated answers. Open primary sources and ask a qualified supervisor before patient care. UK SDCEP and US AAPD recommendations do not automatically replace Egyptian law, local formulary guidance or institutional protocols.

Do not submit patient names, identifiers, photographs or identifiable records. The assistant is a learning aid, not a diagnostic device, prescribing system, emergency triage service or a substitute for clinical supervision.

## Optional local providers

The provider picker also retains:
- Qwen3.5 through Ollama for local inference.
- PALL-Text through a local vLLM server. PALL-Text is English-first and uses the Llama 3.1 Community License.

See [LOCAL_AI_SETUP.md](LOCAL_AI_SETUP.md) for local setup instructions.
