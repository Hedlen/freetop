FROM mcr.microsoft.com/playwright:v1.45.0-jammy

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    coreutils \
    procps \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Node global tools
RUN npm config set fund false && \
    npm i -g eslint http-server

# Python tools
RUN python3 -m pip install --no-cache-dir --upgrade pip && \
    python3 -m pip install --no-cache-dir pylint playwright pytest

# Install Playwright browsers for Python
RUN python3 -m playwright install --with-deps chromium

RUN useradd -m sandbox
USER sandbox
WORKDIR /work

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

CMD ["sleep", "infinity"]
