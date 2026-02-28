FROM python:3.11-slim

# Install system dependencies if typically needed, but for now just rustc
# Use noninteractive frontend to avoid debconf warnings when building in Docker
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y rustc

# We can add numpy/pandas later if courses require them
# Use CPU-only PyTorch to minimize image size (~200MB vs 1GB+ for GPU)
# suppress root-user pip warning and other cache issues
ENV PIP_ROOT_USER_ACTION=ignore PIP_NO_CACHE_DIR=off
RUN pip install numpy "torch==2.0.1" --index-url https://download.pytorch.org/whl/cpu
CMD ["python3", "main.py"]
