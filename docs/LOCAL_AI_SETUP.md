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

## Optional dental-specialized model: PALL-Text 8B

The application now has a second provider option, **PALL-Text 8B**, served by a local vLLM OpenAI-compatible endpoint.

- Model: https://huggingface.co/Harisundar/PALL-Text
- Model card: dental-domain Llama 3.1 8B, trained through continued pretraining, supervised fine-tuning and preference optimization. The author reports an English dental-knowledge corpus and datasets for instruction and preference tuning.
- Language: English-first. It is not a validated Arabic dental assistant.
- Licence: Llama 3.1 Community License, not Apache-2.0. Review the terms, attribution and commercial-use obligations before any investor or commercial deployment.
- Performance: the model card reports its own benchmark results. Those results are self-reported and are not a substitute for independent clinical validation.

### Start PALL-Text locally

Use a Linux environment with a compatible NVIDIA GPU and a supported PyTorch/vLLM installation. The 8B BF16 model can require substantial GPU memory. Quantization may reduce memory requirements but changes deployment characteristics and needs its own validation.

Install a vLLM release that includes the CORS security fix (0.32.0 or newer):

    pip install "vllm>=0.32.0"

Start the service bound only to localhost and allow only the two expected browser origins:

    vllm serve Harisundar/PALL-Text --host 127.0.0.1 --port 8000 --allowed-origins https://10blackfinger.github.io http://localhost:5173 --allowed-methods GET POST OPTIONS --allowed-headers Content-Type

In the application's AI panel choose **PALL-Text 8B via vLLM**. The endpoint should be http://localhost:8000. Then test the connection and confirm that the model is listed.

Do not bind the model server to 0.0.0.0 or expose port 8000 to a network. Do not change the CORS list to '*'. A 20 October 2026 vLLM security advisory documents a cross-origin risk when a web page can reach a localhost vLLM server with permissive CORS; use a patched version and a narrow origin allowlist. See https://github.com/vllm-project/vllm/security/advisories/GHSA-vvpg-rrww-wpmh and the official vLLM CLI reference at https://docs.vllm.ai/en/v0.26.0/cli/serve/.

## Other dental-specific model candidates researched but not enabled

- **Wildstash/DentalGPT adapter:** a gated Hugging Face PEFT adapter for the gpt-oss-20b base, listing Apache-2.0 and reporting 2,494 synthetic dental cases reviewed by dentists. The model page requires an access agreement / contact-information sharing before files can be downloaded. It is English-only and large; access and base-model deployment need to be approved by the user/operator before it can be integrated. Model page: https://huggingface.co/Wildstash/DentalGPT.
- **FreedomIntelligence/DentalGPT:** a multimodal dental model repository describing a Qwen2.5-VL-7B backbone and dental image reasoning. Its public repository README alone does not establish a redistributable model artifact/license suitable for bundling in this project. Review model-weight availability, dataset terms and intended-use conditions first: https://github.com/FreedomIntelligence/DentalGPT.

These are research candidates, not clinically approved products. The app keeps Qwen3.5 as its default Arabic-friendly lightweight path and exposes PALL-Text as an optional English-first dental-specific model; no claim of autonomous diagnosis is made.
