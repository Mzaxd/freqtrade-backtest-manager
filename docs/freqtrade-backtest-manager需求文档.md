好的，遵照您的要求，我将整合之前讨论的所有内容，为您整理一份最终、完整、详细的系统设计文档。

本文档采用 Markdown 格式编写，您可以非常方便地将其内容复制并粘贴到 Google Docs 或其他文档编辑器中，它会自动识别标题、列表和代码块，保持格式的清晰和一致。

---

## **Freqtrade 可视化回测平台 \- 系统设计文档**

* **文档版本**: 1.0  
* **创建日期**: 2025年7月30日  
* **作者**: Gemini AI

### **目录**

1. [文档介绍](https://www.google.com/search?q=%231.0)  
2. [项目概述与目标](https://www.google.com/search?q=%232.0)  
   1. [2.1 项目概述](https://www.google.com/search?q=%232.1)  
   2. [2.2 核心目标](https://www.google.com/search?q=%232.2)  
3. [系统架构](https://www.google.com/search?q=%233.0)  
   1. [3.1 架构选型](https://www.google.com/search?q=%233.1)  
   2. [3.2 技术栈](https://www.google.com/search?q=%233.2)  
   3. [3.3 总体架构图](https://www.google.com/search?q=%233.3)  
   4. [3.4 部署架构](https://www.google.com/search?q=%233.4)  
4. [功能需求](https://www.google.com/search?q=%234.0)  
   1. [4.1 仪表盘 (Dashboard) \- P1](https://www.google.com/search?q=%234.1)  
   2. [4.2 配置管理 (Configuration Management)](https://www.google.com/search?q=%234.2)  
   3. [4.3 回测中心 (Backtesting Center)](https://www.google.com/search?q=%234.3)  
   4. [4.4 回测报告 (Backtest Report)](https://www.google.com/search?q=%234.4)  
5. [核心流程设计](https://www.google.com/search?q=%235.0)  
   1. [5.1 用户发起回测流程](https://www.google.com/search?q=%235.1)  
   2. [5.2 实时日志查看流程](https://www.google.com/search?q=%235.2)  
6. [数据库设计](https://www.google.com/search?q=%236.0)  
   1. [6.1 ORM 选型](https://www.google.com/search?q=%236.1)  
   2. [6.2 Schema 定义 (schema.prisma)](https://www.google.com/search?q=%236.2)  
   3. [6.3 数据表说明](https://www.google.com/search?q=%236.3)  
7. [项目结构](https://www.google.com/search?q=%237.0)  
8. [非功能需求](https://www.google.com/search?q=%238.0)  
9. [总结](https://www.google.com/search?q=%239.0)

---

### **1.0 文档介绍**

本文档旨在详细阐述 Freqtrade 可视化回测平台的设计与实现方案。该平台将以 Next.js 全栈单体应用的形式构建，旨在提供一个功能强大、用户友好的 Web 界面，以简化和加速量化策略的回测与分析流程。本文档将作为项目开发的指导性文件。

### **2.0 项目概述与目标**

#### **2.1 项目概述**

Freqtrade 是一款功能强大的开源加密货币量化交易机器人，但其重度依赖命令行的操作方式对许多用户不够友好，且不利于策略的快速迭代和结果的系统化管理。本项目旨在为其开发一个现代化的 Web 可视化平台，让用户可以通过图形界面完成策略管理、参数配置、任务启动和结果分析的全流程。

#### **2.2 核心目标**

* **提升效率**: 将策略回测流程从命令行操作转变为一键式 UI 操作，缩短“想法”到“结果”的验证周期。  
* **可视化反馈**: 提供丰富的图表和数据可视化，帮助用户直观地理解策略表现、资金曲线和交易点位。  
* **系统化管理**: 提供对策略文件、配置文件和回测历史的结构化管理，建立可追溯、可比较的策略档案库。  
* **卓越体验**: 基于现代技术栈构建简洁、美观、响应式的用户界面，提供卓越的用户体验。

### **3.0 系统架构**

#### **3.1 架构选型**

本平台将采用 **Next.js 全栈单体应用 (Full-Stack Monolith)** 架构。此架构的优势在于：

* **技术栈统一**: 前后端均使用 TypeScript，简化开发、招聘和维护。  
* **开发体验佳**: 无需处理前后端分离的复杂性（如CORS），并可实现端到端的类型安全。  
* **部署便捷**: 整个应用可作为一个单元进行部署和扩展。

后端逻辑将通过 Next.js Route Handlers 实现，并作为服务层调用 Freqtrade 命令行工具。

#### **3.2 技术栈**

| 分类 | 技术选型 | 说明 |
| :---- | :---- | :---- |
| **全栈框架** | Next.js 14+ | 使用最新的 App Router 模型。 |
| **语言** | TypeScript | 为整个项目提供类型安全。 |
| **UI 库** | shadcn/ui, Tailwind CSS | 构建现代化、可定制的 UI 界面。 |
| **状态管理** | Zustand | 轻量、简洁的客户端全局状态管理。 |
| **数据请求** | TanStack Query (React Query) | 高效管理服务端状态、缓存与同步。 |
| **数据库** | PostgreSQL 14+ | 成熟、可靠的关系型数据库。 |
| **ORM** | Prisma | 现代化的 TypeScript ORM，提供类型安全的数据库访问。 |
| **任务队列** | BullMQ | 基于 Redis 的高性能后台任务队列。 |
| **消息中间件** | Redis | 作为 BullMQ 的后端，并可用于缓存和实时消息发布/订阅。 |

#### **3.3 总体架构图**

此图展示了系统中各个组件的交互关系。

[**点击查看高清架构图**](https://www.google.com/search?q=https://i.imgur.com/GzB1yT9.png)

#### **3.4 部署架构**

推荐使用 Docker 和 Docker Compose 进行容器化部署，以管理多进程环境和依赖。  
docker-compose.yml 文件将定义以下核心服务：

1. **app**: 运行 Next.js 应用的服务进程。  
2. **worker**: 运行 BullMQ 任务处理器的独立进程。  
3. **postgres**: PostgreSQL 数据库服务。  
4. **redis**: Redis 服务。

### **4.0 功能需求**

(P0: 核心/MVP, P1: 高优先级, P2: 中优先级)

#### **4.1 仪表盘 (Dashboard) \- P1**

* **\[P1\]** 概览卡片：展示进行中的任务数、历史任务总数、策略总数等关键指标。  
* **\[P1\]** 最近回测：列表展示最近的回测任务及其核心结果。  
* **\[P2\]** 性能图表：展示一个全局的、可配置的最佳策略性能概览图。

#### **4.2 配置管理 (Configuration Management)**

* **策略管理 (Strategies)**  
  * **\[P0\]** 列表展示、上传、删除策略文件 (.py)。  
  * **\[P1\]** 提供内置代码编辑器进行在线查看和修改。  
* **配置文件管理 (Configs)**  
  * **\[P0\]** 列表展示、上传、删除配置文件 (.json)。  
  * **\[P1\]** 提供结构化的表单和源码两种模式进行编辑。

#### **4.3 回测中心 (Backtesting Center)**

* **发起回测 (Launch Backtest)**  
  * **\[P0\]** 提供清晰的回测表单，包含任务名称、策略选择、配置选择、时间范围等。  
  * **\[P0\]** 异步启动回测任务，并立即返回任务ID。  
* **任务历史 (Backtest History)**  
  * **\[P0\]** 以表格形式展示所有回测任务，支持分页、搜索、排序。  
  * **\[P0\]** 列表字段包含：任务名称、策略、状态 (PENDING, RUNNING, COMPLETED, FAILED)、总收益率等。  
  * **\[P1\]** 支持实时查看运行中任务的日志。  
  * **\[P1\]** 支持取消、重新运行任务等操作。

#### **4.4 回测报告 (Backtest Report)**

* **\[P0\]** 为每个已完成的任务生成独立的报告详情页。  
* **\[P0\]** 以卡片和表格形式展示 Freqtrade 输出的所有性能统计指标。  
* **\[P1\]** 集成或重绘资金曲线图。  
* **\[P1\]** 以表格形式展示详细的交易历史列表。

### **5.0 核心流程设计**

#### **5.1 用户发起回测流程**

这是系统的核心工作流程，确保了耗时任务不会阻塞用户界面。

**步骤分解:**

1. **用户交互**: 用户在浏览器中填写回测表单并点击“启动”按钮。  
2. **API 请求**: 客户端调用 Next.js 后端的一个 Server Action 或 API Route。  
3. **任务创建**:  
   * 后端逻辑使用 Prisma 在 BacktestTask 表中创建一条新记录，初始 status 为 PENDING。  
   * 后端将包含任务ID和所需参数的作业（Job）添加到 BullMQ 任务队列中。  
4. **即时响应**: API 立即向客户端返回成功信息及任务ID，HTTP 请求结束。  
5. **任务处理 (后台)**:  
   * 一个独立的 Worker 进程从 Redis 队列中获取该作业。  
   * Worker 更新数据库中该任务的 status 为 RUNNING。  
6. **执行引擎**:  
   * Worker 使用 Node.js 的 child\_process.spawn 模块启动 Freqtrade 命令行进程。  
   * Worker 监听该进程的输出流（用于日志）和结束事件。  
7. **任务完成**:  
   * Freqtrade 进程成功结束后，Worker 解析其生成的 JSON 结果文件。  
   * Worker 将解析出的关键指标（如总收益率、夏普比率等）和结果文件路径更新到数据库对应的任务记录中，并将 status 更新为 COMPLETED。  
   * 如果进程失败，则记录错误日志，并将 status 更新为 FAILED。  
8. **结果反馈**: 前端通过轮询或 WebSocket/SSE 感知到任务状态变化，并从后端拉取最终报告数据进行展示。

#### **5.2 实时日志查看流程**

此流程利用发布/订阅模式实现，高效且解耦。

1. **日志捕获**: 在 Worker 进程中，当 child\_process.spawn 产生的 Freqtrade 进程有 stdout 或 stderr 输出时，Worker 会捕获这些日志行。  
2. **日志发布**: Worker 将捕获到的日志行发布到 Redis 的一个特定频道（Channel）上，频道名称与任务ID关联，例如 logs:${taskId}。  
3. **API 订阅**: Next.js 后端提供一个 Server-Sent Events (SSE) 端点，例如 /api/backtests/\[id\]/logs。  
4. **流式传输**:  
   * 当前端请求此端点时，后端 API 会订阅 Redis 上对应的 logs:${taskId} 频道。  
   * 每当该频道有新消息（新的日志行）时，Redis 会通知后端，后端再通过 SSE 将消息实时流式传输到前端。  
5. **前端展示**: 前端接收到 SSE 事件后，将日志内容追加显示在 UI 界面上。

### **6.0 数据库设计**

#### **6.1 ORM 选型**

选用 **Prisma** 作为 ORM，它提供了无与伦比的类型安全和优秀的开发体验，与 Next.js 和 TypeScript 生态系统完美契合。数据库结构将通过 schema.prisma 文件进行定义。

#### **6.2 Schema 定义 (schema.prisma)**

代码段

// This is your Prisma schema file,  
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {  
  provider \= "prisma-client-js"  
}

datasource db {  
  provider \= "postgresql"  
  url      \= env("DATABASE\_URL")  
}

// 策略文件的元数据  
model Strategy {  
  id            Int            @id @default(autoincrement())  
  filename      String         @unique  
  className     String  
  description   String?  
  createdAt     DateTime       @default(now())  
  updatedAt     DateTime       @updatedAt  
  backtestTasks BacktestTask\[\]  
}

// 配置文件的元数据  
model Config {  
  id            Int            @id @default(autoincrement())  
  filename      String         @unique  
  description   String?  
  createdAt     DateTime       @default(now())  
  updatedAt     DateTime       @updatedAt  
  backtestTasks BacktestTask\[\]  
}

// 核心表：存储每一次回测任务的信息和结果  
model BacktestTask {  
  id             String    @id @default(cuid())  
  name           String  
  status         String    // PENDING, RUNNING, COMPLETED, FAILED  
  timerangeStart DateTime?  
  timerangeEnd   DateTime?  
  createdAt      DateTime  @default(now())  
  completedAt    DateTime?

  // 存储关键结果指标，用于快速预览和排序  
  resultsSummary Json?  
  // 存储 Freqtrade 生成的原始结果文件路径  
  rawOutputPath  String?  
  // 存储任务的完整日志 (用于失败排查)  
  logs           String?

  strategyId Int  
  strategy   Strategy @relation(fields: \[strategyId\], references: \[id\], onDelete: Cascade)

  configId Int  
  config   Config @relation(fields: \[configId\], references: \[id\], onDelete: Cascade)  
}

#### **6.3 数据表说明**

* **Strategy**: 存储用户上传的策略文件的元信息，与物理文件对应。  
* **Config**: 存储用户上传的配置文件的元信息，与物理文件对应。  
* **BacktestTask**: 系统的核心模型，记录每一次回测任务的参数、状态、结果摘要和日志，并关联相应的策略和配置。

### **7.0 项目结构**

推荐采用功能导向和模块化的目录结构，便于维护和扩展。

/my-freqtrade-ui  
├── /app                  \# Next.js App Router 根目录  
│   ├── /api              \# 后端 API 路由  
│   ├── /dashboard        \# 前端页面路由  
│   ├── /backtests  
│   ├── layout.tsx  
│   └── page.tsx  
├── /components           \# 通用及 shadcn/ui 组件  
├── /jobs                 \# BullMQ 任务的定义文件  
├── /lib                  \# 共享库 (Prisma Client, Queue 实例, 工具函数)  
├── /prisma               \# Prisma Schema 和 migrations  
├── /workers              \# BullMQ Worker 的执行脚本  
├── .env                  \# 环境变量  
├── docker-compose.yml    \# Docker 部署文件  
├── Dockerfile            \# 应用容器化文件  
├── package.json  
└── tsconfig.json

### **8.0 非功能需求**

* **性能**: 异步处理所有耗时操作，确保 UI 响应流畅。API 响应时间应在 200ms 以内，页面加载时间应在 2s 以内。  
* **可用性**: UI 界面简洁直观，交互逻辑清晰，关键操作有明确的加载和完成状态反馈。  
* **安全性**: 对所有用户输入进行验证。对上传文件的大小和类型进行限制。处理好文件路径，防止路径遍历攻击。  
* **可扩展性**: 采用模块化设计，便于未来增加新的功能模块（如超参数优化、实时交易监控等）。

### **9.0 总结**

本设计文档详细规划了一个基于 Next.js、Prisma 和 BullMQ 的现代化 Freqtrade 可视化回测平台。该方案通过统一的技术栈和全栈单体架构，旨在实现高效的开发、便捷的维护和卓越的用户体验。只要正确处理好后台任务与环境依赖两大关键点，此方案将能成功地打造出一个强大而实用的量化工具。