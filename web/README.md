# FreeTop Web UI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Come From Open Source, Back to Open Source

**The default Web UI for [FreeTop](https://github.com/Hedlen/freetop).**

FreeTop is a community-driven AI automation framework that builds upon the incredible work of the open source community. Our goal is to combine language models with specialized tools for tasks like web search, crawling, and Python code execution, while giving back to the community that made this possible.

## Demo Video

- [View on YouTube](https://youtu.be/sZCHqrQBUGk)
- [Download Video](https://github.com/langmanus/langmanus/blob/main/assets/demo.mp4)

## Table of Contents
- [FreeTop Web UI](#freetop-web-ui)
  - [Demo Video](#demo-video)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [Configuration](#configuration)
    - [Installation](#installation)
  - [Contributing](#contributing)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

## Quick Start

### Prerequisites

- [FreeTop](https://github.com/Hedlen/freetop)
- Node.js (v22.14.0+)
- pnpm (v10.6.2+) as package manager
- Chrome (v114.0.5735.199)

### Configuration

Create a `.env` file in the project root and configure the following environment variables:

- `NEXT_PUBLIC_API_URL`: The URL of the FreeTop API.

It's always a good idea to start with the given example file, and edit the `.env` file with your own values:

```bash
cp .env.example .env
```

### Installation

```bash
# Clone the repository
cd web

# Install dependencies
pnpm install

# Run the project in development mode
pnpm dev
```

Then open your browser and navigate to http://localhost:3000

Have fun!

## Contributing

We welcome contributions of all kinds! Whether you're fixing a typo, improving documentation, or adding a new feature, your help is appreciated. Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

Special thanks to all the open source projects and contributors that make LangManus possible. We stand on the shoulders of giants.
