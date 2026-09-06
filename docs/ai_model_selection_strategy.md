# AI Model Selection and Optimization Strategy

## Overview

BaseLayer provides interactive AI tutoring, structured course generation, mental model diagram evaluation, and iterative code feedback. Because these features rely on structured JSON outputs, strict instruction following, and accurate code synthesis, selecting the right default model for each provider directly impacts platform quality, latency, and cost.

Previously, default configurations pointed to legacy baseline models (such as `gemini-2.0-flash` and `gpt-4o-mini`). While functional, these models have been superseded by more capable, cost-efficient, and instruction-resilient models.

This document details the updated default model strategy and suggested alternatives across all supported providers.

---

## Provider Defaults and Suggested Models

### 1. Google Gemini
- **Default Model**: `gemini-2.5-flash`
- **Suggested Models**:
  - `gemini-2.5-flash`: Recommended default workhorse. Provides state-of-the-art reasoning, code generation, and multimodal visual analysis while remaining fast and cost-effective (free tier on Google AI Studio).
  - `gemini-2.5-flash-lite`: Ultra-fast and lightweight for high-throughput tutoring queries and budget-constrained environments.
  - `gemini-2.5-pro`: Deep reasoning model for complex architectural design and intensive curriculum generation.
- **Why it improves BaseLayer**: BaseLayer uses multimodal evaluation for visual architecture sketches (such as drawing neural network layers) and complex multi-step course authoring. `gemini-2.5-flash` significantly improves diagram grading fidelity and Python/Rust test generation compared to older iterations.

### 2. Groq
- **Default Model**: `llama-3.3-70b-versatile`
- **Suggested Models**:
  - `llama-3.3-70b-versatile`: Recommended default. Delivers GPT-4-class reasoning and robust structured JSON compliance on Groq LPUs at hundreds of tokens per second within free/low-cost tiers.
  - `llama-3.1-8b-instant`: Ultra-low latency 8B model for fast chat interactions where complex reasoning is not required.
- **Why it improves BaseLayer**: The previous default (`llama-3.1-8b-instant`) often failed at strict JSON schema constraints for curriculum generation and complex Rust syntax. Upgrading to `llama-3.3-70b-versatile` provides high-tier reasoning and code synthesis while maintaining instantaneous response times.

### 3. OpenAI
- **Default Model**: `gpt-4.1-mini`
- **Suggested Models**:
  - `gpt-4.1-mini`: Recommended default. Succeeds `gpt-4o-mini` with improved coding benchmarks, higher instruction-following reliability, and strong tool-use performance at mini-tier pricing.
  - `gpt-4.1-nano`: Fastest, lowest-cost model for lightweight completions.
  - `gpt-4o-mini`: Legacy mini option for backward compatibility.
  - `gpt-4.1`: Flagship reasoning model for advanced coding tasks.
- **Why it improves BaseLayer**: Reduces JSON extraction errors in `agentic_workflow.py` and produces higher-quality unit test suites and starter code.

### 4. OpenRouter
- **Default Model**: `openai/gpt-4.1-mini`
- **Suggested Models**:
  - `openai/gpt-4.1-mini`: Recommended best balance of performance and pricing for general users.
  - `google/gemini-2.5-flash`: High-speed multimodal analysis via OpenRouter routing.
  - `deepseek/deepseek-chat`: Cost-effective open weights model with strong algorithmic capabilities.
- **Why it improves BaseLayer**: Users using OpenRouter get a current, robust model default instead of an older iteration, with clear suggestions available directly in the user interface.

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
- **Default Model**: `gpt-4.1-mini`
- **Suggested Models**:
  - `gpt-4.1-mini`: Standard fallback identifier compatible with OpenAI-compatible proxies (vLLM, LiteLLM, FastChat).

---

## User Interface Improvements

The Local Studio AI Settings panel (`LocalWelcome.tsx`) provides:
1. **Clear Default Recommendation**: Displays the default model with an explicit "(recommended best value)" indicator.
2. **Interactive Suggested Models**: Renders quick-pick buttons for the provider's suggested models, tagging the primary option with a "Best Value" indicator.
3. **Seamless Provider Switching**: Switching providers automatically populates the input with the provider's recommended best value model while preserving custom user overrides.

---

## Summary of Changes

- `backend/llm.py`: Added `suggested_models` to `ProviderSpec` and updated default models to modern best-value options.
- `backend/routers/ai.py`: Exposed `suggested_models` in `ProviderInfo` schema.
- `backend/agentic_workflow.py`: Updated fallback model resolution to prioritize current provider defaults.
- `frontend/src/services/aiService.ts`: Added `suggested_models` to frontend provider interface.
- `frontend/src/components/auth/LocalWelcome.tsx`: Updated provider defaults, initial state, and added model recommendation pills.
