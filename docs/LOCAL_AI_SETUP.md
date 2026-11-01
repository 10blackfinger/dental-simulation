# Local dental education assistant

The browser UI connects directly to an Ollama server configured in the AI panel. The default model is Qwen3.5 4B. This is an open-weight general model with a dental-focused system prompt and a small in-app source index; it is not a dental-specialist model and has not been fine-tuned or clinically validated.

## 1. Install Ollama

Install Ollama on the same computer that is running the browser. Keep the Ollama service bound to the local machine; do not expose port 11434 to the public internet.

Official downloads and documentation: https://ollama.com/download and https://docs.ollama.com/

## 2. Download a model

Recommended starter model:

    ollama pull qwen3.5:4b

Optional larger models, if the computer has sufficient memory:

    ollama pull qwen3.5:9b
    ollama pull qwen3.5:27b

The current Ollama library lists approximate disk ranges of 3.3–4.0 GB for 4B, 6.6–7.6 GB for 9B and 17–20 GB for 27B. Actual memory/latency depends on quantization, context length and hardware.

Model library: https://ollama.com/library/qwen3.5
Model card and Apache-2.0 licence: https://huggingface.co/Qwen/Qwen3.5-4B

## 3. Allow the exact browser origin

Because GitHub Pages is served from HTTPS, the browser may require Ollama to permit that exact origin. Set OLLAMA_ORIGINS to the site origin and, for local development, the local Vite origin. Restart Ollama after changing the environment variable.

Windows PowerShell example:

    [Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS','https://10blackfinger.github.io,http://localhost:5173','User')

macOS/Linux shell example for a foreground Ollama process:

    export OLLAMA_ORIGINS='https://10blackfinger.github.io,http://localhost:5173'
    ollama serve

Follow the current Ollama documentation for configuring environment variables when Ollama runs as a background service. Do not use a wildcard origin on a computer with sensitive data.

Ollama API overview: https://github.com/ollama/ollama/blob/main/docs/api/introduction.mdx

## 4. Connect from the application

1. Open the Dental Simulation AI assistant panel.
2. Keep the default server address as http://localhost:11434 unless Ollama is listening elsewhere.
3. Choose the model you installed.
4. Press Test connection. If Ollama responds but the model is missing, run the corresponding pull command and test again.
5. Ask a general educational question about anatomy, instruments, materials or a learning pathway.

## Troubleshooting

- **Connection refused:** Ollama may not be running, or it may be listening on a different port.
- **CORS / Failed to fetch:** allow the exact site origin with OLLAMA_ORIGINS and restart Ollama.
- **Model not found:** run the matching ollama pull command and ensure the model name matches the UI selection.
- **Slow answers:** use the 4B option, close other memory-heavy applications and keep the prompt concise.
- **HTTPS / localhost browser restrictions:** try the local development site at http://localhost:5173, configure the allowed local origin, and use the browser's explicit local-network permission prompt if one is shown.

## Privacy and clinical safety

With a local Ollama endpoint, prompts are sent from the browser to the local computer's Ollama service. The application does not send those prompts to a third-party inference API. This does not make it appropriate to enter identifiable patient data: keep all patient details synthetic or de-identified.

The AI assistant is not a dental-specific fine-tuned model, diagnostic system, prescription engine or clinical decision-support device. The source index is a navigation aid, not a full-text guideline database or verified retrieval-augmented generation system. The model can hallucinate facts and references. Verify every important statement in the linked source and with a qualified dental supervisor.