# AI Model Selection and Optimization Strategy

## Overview

BaseLayer provides interactive AI tutoring, structured course generation, mental model diagram evaluation, and iterative code feedback. Because these features rely on structured JSON outputs, strict instruction following, and accurate code synthesis, selecting the right default model for each provider directly impacts platform quality, latency, and cost.

Default configurations have been updated to the latest generation models providing the lowest cost per token while maintaining high accuracy for coding and tutoring workflows.

This document details the updated default model strategy and suggested alternatives across all supported providers based on verified official provider documentation and live API catalogs.

---

## Provider Defaults and Suggested Models

### 1. Google Gemini
- **Default Model**: `gemini-3.5-flash-lite`
- **Suggested Models**:
  - `gemini-3.5-flash-lite`: Recommended default. The fastest and most cost-effective Gemini 3 generation model ($0.30/M prompt, $2.50/M completion, with free tier on Google AI Studio).
  - `gemini-3.8-flash`: Google's most intelligent Flash model, engineered for long-horizon software engineering, autonomous agents, and complex enterprise workflows.
  - `gemini-3.1-flash-lite`: Frontier-class performance at low cost for high-throughput execution.
- **Why it improves BaseLayer**: Minimizes latency and costs on standard tutoring queries and code checks while offering seamless upgrade paths to `gemini-3.8-flash` for multi-step curriculum synthesis.

### 2. Groq
- **Default Model**: `openai/gpt-oss-20b`
- **Suggested Models**:
  - `openai/gpt-oss-20b`: Recommended default. Open weights model on Groq running at 1,000 tokens/second at only $0.075/M input and $0.30/M output.
  - `llama-3.3-70b-versatile`: 70B parameter model delivering GPT-4-class reasoning on Groq LPUs at 280 tokens/second.
  - `qwen/qwen3.8-27b`: High-capability 27B model running at 450 tokens/second.
  - `llama-3.1-8b-instant`: Ultra-fast lightweight model running at 560 tokens/second.
- **Why it improves BaseLayer**: Provides instantaneous code completion and exercise feedback at the lowest cost point on Groq's high-speed LPU infrastructure.

### 3. OpenAI
- **Default Model**: `gpt-5.6-luna`
- **Suggested Models**:
  - `gpt-5.6-luna`: Recommended default. Official low-cost model in OpenAI's latest GPT-5.6 lineup ($0.20/M prompt, $1.20/M output), designed specifically for cost-sensitive, high-volume workloads with full vision and tool support.
  - `gpt-5-mini`: Lightweight foundational model ($0.25/M prompt, $2.00/M completion).
  - `gpt-5.6-terra`: Balanced model for higher reasoning depth.
  - `gpt-6-astra`: Frontier flagship model for complex coding and architectural tasks.
- **Why it improves BaseLayer**: Replaces outdated legacy mini models with OpenAI's latest architecture, cutting error rates on structured output and Python/Rust parsing while keeping operating costs low.

### 4. OpenRouter
- **Default Model**: `openai/gpt-5.6-luna`
- **Suggested Models**:
  - `openai/gpt-5.6-luna`: Recommended default for consistent instruction following and low cost.
  - `google/gemini-3.5-flash-lite`: High-speed multimodal analysis via OpenRouter routing.
  - `meta-llama/llama-4-scout`: Highly efficient open weights model ($0.100/M prompt, $0.300/M completion).
  - `deepseek/deepseek-v4-flash-latest`: Ultra-low cost inference ($0.045/M prompt, $0.090/M completion).
- **Why it improves BaseLayer**: Gives OpenRouter users access to the latest frontier lightweight models with transparent pricing alternatives directly in the UI.

### 5. Ollama (Local)
- **Default Model**: `llama3.2`
- **Suggested Models**:
  - `llama3.2`: Recommended default for laptops and consumer CPUs/GPUs without large VRAM requirements.
  - `qwen2.5-coder:7b`: Highly recommended for local coding tasks and programming courses.
  - `llama3.3`: 70B flagship model for high-end local workstations equipped with dedicated GPUs.
- **Why it improves BaseLayer**: Maintains compatibility with resource-constrained local environments while offering immediate visibility into code-specialized local models (`qwen2.5-coder:7b`).

### 6. LM Studio (Local)
- **Default Model**: `local-model`
- **Suggested Models**:
  - `local-model`: Maps directly to whichever model is loaded in the LM Studio local server.

### 7. Custom Endpoints
- **Default Model**: `gpt-5.6-luna`
- **Suggested Models**:
  - `gpt-5.6-luna`: Standard fallback identifier compatible with OpenAI-compatible proxies.

---

## User Interface Improvements

The Local Studio AI Settings panel (`LocalWelcome.tsx`) provides:
1. **Clear Default Recommendation**: Displays the default model with an explicit "(recommended best value)" indicator.
2. **Interactive Suggested Models**: Renders quick-pick buttons for the provider's suggested models, tagging the primary option with a "Best Value" indicator.
3. **Seamless Provider Switching**: Switching providers automatically populates the input with the provider's recommended best value model while preserving custom user overrides.

---

## Summary of Changes

- `backend/llm.py`: Added `suggested_models` to `ProviderSpec` and set default models to the latest lowest-cost options.
- `backend/routers/ai.py`: Exposed `suggested_models` in `ProviderInfo` schema.
- `backend/agentic_workflow.py`: Updated fallback model resolution to prioritize current provider defaults.
- `frontend/src/services/aiService.ts`: Added `suggested_models` to frontend provider interface.
- `frontend/src/components/auth/LocalWelcome.tsx`: Updated provider defaults, initial state, and added model recommendation pills.
