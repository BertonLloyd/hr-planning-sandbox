# 人力规划与编制/成本测算沙盘

一个**自托管、纯前端**的人力规划工具，把「业务目标 → 编制 → 成本 → 人效」的专家测算方法固化成可点击的向导。面向 HRBP、OD 与 HR 负责人，无需后端、无需数据库，打开浏览器即可完成年度人力规划，并导出报表。

所有数据只保存在本机浏览器中，不会上传到任何服务器。

---

## 功能特性

- **三入口工作台**
  - 首页：新建方案、打开演示样例、管理我的历史方案
  - 规划工作台：五步向导，步骤条可回跳，草稿自动保留
  - 报表中心：核心指标、图表、数据下钻与 PDF 导出
- **五步测算流程**
  1. 目标与数据：录入业务目标与基础口径
  2. 编制：按岗位/部门测算各月编制
  3. 成本：固定工资、浮动、社保公积金、福利与专项费用
  4. 沙盘试算：调整参数，实时联动人效与成本结果
  5. 结果：汇总指标、图表与方案结论
- **内置测算方法**：字段旁直接点选「按人均产值倒推 / 按配比 / 按管理幅度」，无需自建公式
- **Excel 导入**：提供标准导入模板，支持字段校验、预览、错误定位（精确到行列）与手动字段映射
- **本地保存**：方案通过浏览器 localStorage 持久化，可随时继续编辑
- **报表导出**：KPI 卡片、多维图表与一键 PDF 导出

---

## 技术栈

| 分类 | 选型 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS v4 |
| UI 组件 | shadcn/ui（Radix UI） |
| 图表 | ECharts / Recharts |
| 表格解析 | SheetJS（xlsx） |
| 路由 | React Router |
| 状态/表单 | React Hook Form + Zod |

---

## 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`
- npm 10 及以上

---

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/BertonLloyd/hr-planning-sandbox.git
cd hr-planning-sandbox

# 2. 安装依赖
npm install

# 3. 启动开发服务器（默认 http://localhost:8001）
pm run dev

# 4. 生产构建（产物输出到 dist/）
npm run build
```

> 项目默认使用公网镜像源（见 `.npmrc`）。如需使用官方源，删除 `.npmrc` 或执行 `npm config delete registry` 即可。

### 其他命令

```bash
npm run typecheck     # TypeScript 类型检查
npm run lint          # 类型检查 + ESLint
```

---

## 使用流程

1. 打开首页，选择「新建方案」或先进入「演示样例」熟悉流程。
2. 在规划工作台按五步依次填写目标、编制与成本；每一步均可回跳修改，数据自动保存。
3. 需要批量录入岗位时，在「目标与数据」步骤下载标准 Excel 模板，填写后上传，系统会校验并提示错误位置。
4. 进入「沙盘试算」调整参数，实时查看人力成本与人效变化。
5. 在结果页确认方案，或前往报表中心查看图表并导出 PDF。

---

## 数据与隐私

- 本项目为纯前端静态应用，**不包含任何后端服务或网络上报**。
- 方案数据保存在浏览器 localStorage，Excel 文件在浏览器本地解析，均不离开本机。
- 清除浏览器站点数据会删除本地方案，重要规划请及时导出 PDF 或 Excel 备份。

---

## 目录结构

```
hr-planning-sandbox/
├── index.html
├── vite.config.ts
├── public/                # 静态资源
├── scripts/               # 开发与构建脚本
├── shared/                # 平台能力与静态资源
└── src/
    ├── app.tsx            # 路由配置
    ├── index.tsx          # 应用入口
    ├── components/        # 通用布局与 UI 组件
    │   └── ui/
    ├── context/           # 全局状态
    ├── data/              # 演示数据
    ├── hooks/             # 自定义 Hooks
    ├── lib/               # 工具库、存储与导入解析
    └── pages/             # 首页 / 工作台 / 报表中心
        └── WorkbenchPage/steps/   # 五步向导
```

---

## 许可证

基于 [MIT License](LICENSE) 开源，可自由使用、修改与分发。
