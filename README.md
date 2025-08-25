# Freqtrade Backtest Manager

[//]: # (语言切换链接)
<p align="center">
  <a href="README.md">中文</a> | <a href="README.en.md">English</a>
</p>

[//]: # (徽章)
<p align="center">
  <img src="https://img.shields.io/github/license/freqtrade-backtest-manager/freqtrade-backtest-manager" alt="License">
  <img src="https://img.shields.io/github/stars/freqtrade-backtest-manager/freqtrade-backtest-manager" alt="Stars">
  <img src="https://img.shields.io/github/forks/freqtrade-backtest-manager/freqtrade-backtest-manager" alt="Forks">
</p>

## 简介

Freqtrade Backtest Manager 是一个为 [Freqtrade](https://www.freqtrade.io/) 用户量身打造的Web界面，旨在提供一个直观、高效、功能强大的回测管理与分析平台。通过本工具，您可以轻松地创建、管理、运行和可视化您的 Freqtrade 回测任务，从而极大地提升策略研发和优化的效率。

## 核心功能

*   **📊 可视化回测仪表盘**: 在一个统一的视图中跟踪所有回测任务的状态。
    *   *![仪表盘截图](https://blog-1310221847.cos.ap-beijing.myqcloud.com/202508102123426.png)*
*   **🚀 一键式回测创建**: 通过友好的Web表单轻松配置并启动新的回测任务，无需手动编辑配置文件。
    *   *![新建回测截图](https://blog-1310221847.cos.ap-beijing.myqcloud.com/202508102124499.png)*
*   **📈 深度回测结果分析**: 查看详细的回测报告，包括资金曲线、利润分布、交易列表、交易对表现和退出原因分析等。
    *   *![回测详情截图](https://blog-1310221847.cos.ap-beijing.myqcloud.com/202508102124022.png)*
*   **📝 策略与配置管理**: 集中管理您的所有 Freqtrade 配置文件和策略文件。
    *   *![配置管理截图](https://blog-1310221847.cos.ap-beijing.myqcloud.com/202508102125613.png)*
*   **☁️ 历史数据管理**: 管理和下载用于回测的K线数据。
    *   *![数据管理截图](https://blog-1310221847.cos.ap-beijing.myqcloud.com/202508102125680.png)*
*   **🌐 多语言支持**: 内置中文和英文支持。

## 技术栈

*   **前端**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
*   **后端**: Next.js (API Routes), Prisma, BullMQ
*   **数据库**: PostgreSQL (默认), 得益于 Prisma，可轻松替换为 MySQL, SQLite 等
*   **后台任务**: Node.js (tsx), BullMQ Worker

## 快速开始

### 环境要求

*   Node.js (>= 20.x)
*   pnpm
*   Python (用于 Freqtrade)
*   Freqtrade 安装实例

### 安装与启动

1.  **克隆仓库**
    ```bash
    git clone https://github.com/your-username/freqtrade-backtest-manager.git
    cd freqtrade-backtest-manager
    ```

2.  **安装依赖**
    ```bash
    pnpm install
    ```

3.  **配置环境变量**
    复制 `.env.example` 为 `.env` 并根据您的 Freqtrade 环境进行配置。
    ```bash
    cp .env.example .env
    ```

4.  **数据库迁移**
    ```bash
    pnpm db:migrate
    ```

5.  **启动应用**
    您需要启动两个进程：
    *   **Web 服务器**:
        ```bash
        pnpm dev
        ```
    *   **后台 Worker (在另一个终端中)**:
        ```bash
        pnpm worker
        ```

6.  **访问应用**
    打开浏览器并访问 `http://localhost:5173`。

## 贡献

欢迎任何形式的贡献！如果您有任何想法、建议或发现了 Bug，请随时提交 Issue 或 Pull Request。

## 许可证

本项目采用 [MIT](LICENSE) 许可证。
