# Freqtrade Backtest Manager

[//]: # (Language Switch)
<p align="center">
  <a href="README.md">中文</a> | <a href="README.en.md">English</a>
</p>

[//]: # (Badges)
<p align="center">
  <img src="https://img.shields.io/github/license/your-username/freqtrade-backtest-manager" alt="License">
  <img src="https://img.shields.io/github/stars/your-username/freqtrade-backtest-manager" alt="Stars">
  <img src="https://img.shields.io/github/forks/your-username/freqtrade-backtest-manager" alt="Forks">
</p>

## Introduction

Freqtrade Backtest Manager is a web interface tailor-made for [Freqtrade](https://www.freqtrade.io/) users, designed to provide an intuitive, efficient, and powerful platform for backtest management and analysis. With this tool, you can easily create, manage, run, and visualize your Freqtrade backtest tasks, significantly improving the efficiency of strategy development and optimization.

## Core Features

*   **📊 Visual Backtest Dashboard**: Track the status of all your backtest tasks in a unified view.
    *   *![Dashboard Screenshot](https://blog-1310221847.cos.ap-beijing.myqcloud.com/202508102058082.png)*
*   **🚀 One-Click Backtest Creation**: Easily configure and launch new backtest tasks through a friendly web form, without manually editing configuration files.
    *   *![New Backtest Screenshot](https://blog-1310221847.cos.ap-beijing.myqcloud.com/202508102120049.png)*
*   **📈 In-depth Backtest Result Analysis**: View detailed backtest reports, including equity curve, profit distribution, trade list, performance by pair, and exit reason analysis.
    *   *![Backtest Details Screenshot](https://blog-1310221847.cos.ap-beijing.myqcloud.com/202508102121153.png)*
*   **📝 Strategy and Configuration Management**: Centrally manage all your Freqtrade configuration files and strategy files.
    *   *![Config Management Screenshot](https://blog-1310221847.cos.ap-beijing.myqcloud.com/202508102122293.png)*
*   **☁️ Historical Data Management**: Manage and download candlestick data for backtesting.
    *   *![Data Management Screenshot](https://blog-1310221847.cos.ap-beijing.myqcloud.com/202508102122571.png)*
*   **🌐 Multi-language Support**: Built-in support for Chinese and English.

## Tech Stack

*   **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
*   **Backend**: Next.js (API Routes), Prisma, BullMQ
*   **Database**: PostgreSQL (default), thanks to Prisma, it can be easily replaced with MySQL, SQLite, etc.
*   **Background Jobs**: Node.js (tsx), BullMQ Worker

## Quick Start

### Prerequisites

*   Node.js (>= 20.x)
*   pnpm
*   Python (for Freqtrade)
*   An installed instance of Freqtrade

### Installation and Launch

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/freqtrade-backtest-manager.git
    cd freqtrade-backtest-manager
    ```

2.  **Install dependencies**
    ```bash
    pnpm install
    ```

3.  **Configure environment variables**
    Copy `.env.example` to `.env` and configure it according to your Freqtrade environment.
    ```bash
    cp .env.example .env
    ```

4.  **Database migration**
    ```bash
    pnpm db:migrate
    ```

5.  **Start the application**
    You need to start two processes:
    *   **Web Server**:
        ```bash
        pnpm dev
        ```
    *   **Background Worker (in another terminal)**:
        ```bash
        pnpm worker
        ```

6.  **Access the application**
    Open your browser and navigate to `http://localhost:5173`.

## Contributing

Contributions of any kind are welcome! If you have any ideas, suggestions, or have found a bug, please feel free to submit an Issue or Pull Request.

## License

This project is licensed under the [MIT](LICENSE) License.