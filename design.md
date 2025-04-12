# 音频气口剪辑工具 - 设计文档

## 项目目录结构

```
audio-clipper/
├── .git/                   # Git版本控制目录
├── .bolt/                  # 编辑器相关配置目录
├── src/                    # 源代码目录
│   ├── App.tsx             # React应用入口组件
│   ├── index.css           # 全局样式
│   ├── main.js             # 主要业务逻辑实现
│   ├── main.tsx            # React应用入口点
│   └── vite-env.d.ts       # Vite环境类型声明
├── .gitignore              # Git忽略文件配置
├── eslint.config.js        # ESLint配置
├── index.html              # 主HTML文件
├── package-lock.json       # 依赖锁定文件
├── package.json            # 项目依赖和配置
├── postcss.config.js       # PostCSS配置
├── tailwind.config.js      # Tailwind CSS配置
├── tsconfig.app.json       # TypeScript应用配置
├── tsconfig.json           # TypeScript基础配置
├── tsconfig.node.json      # TypeScript Node配置
└── vite.config.ts          # Vite构建工具配置
```

## 技术架构

项目同时包含两种技术方案：

1. **纯HTML/JS实现**：
   - 使用`index.html`和`src/main.js`构建的独立应用
   - 不依赖React框架，直接使用DOM操作和Web Audio API

2. **React实现**（开发中）：
   - 使用`src/App.tsx`和`src/main.tsx`作为React应用入口
   - 目前React部分尚未完全实现业务逻辑

## 核心技术要点

### 1. 音频处理核心流程

- **音频加载**：
  - 支持文件上传和拖放上传
  - 使用`File API`和`AudioContext.decodeAudioData()`解码音频数据

- **波形可视化**：
  - 使用WaveSurfer.js库实现音频波形可视化
  - 支持播放、暂停和波形浏览功能

- **气口检测算法**：
  - 基于RMS(Root Mean Square)能量分析
  - 自适应阈值计算，基于整体音频的平均能量
  - 可调参数：灵敏度百分比、最小持续时间
  - 合并相近气口功能避免过度分段

- **音频处理**：
  - 使用Web Audio API的`AudioBuffer`进行内存中处理
  - 保留非气口区域并生成新的音频流
  - WAV格式导出实现

### 2. 用户界面设计

- **响应式布局**：
  - 适配桌面和移动设备
  - 使用CSS Grid和Flex布局

- **交互反馈**：
  - 进度条显示处理状态
  - Toast消息通知系统
  - 可视化标记检测到的气口区域

### 3. 技术选型

- **前端框架**：
  - 计划使用React进行重构
  - 目前主要功能在原生JS实现

- **构建工具**：
  - Vite作为开发和构建工具
  - 支持热模块替换和快速构建

- **类型系统**：
  - TypeScript提供类型安全
  - 配置了多层次的tsconfig

- **样式方案**：
  - 支持Tailwind CSS和PostCSS
  - 原生CSS变量实现主题定制

## 性能考量

- 使用Web Worker处理大型音频文件（计划中）
- 进度反馈机制确保处理大文件时的用户体验
- 文件大小限制在100MB以内避免浏览器崩溃
- 优化缓存策略减少资源占用

## 扩展计划

- 完成React实现
- 添加更多检测算法选项
- 支持更多音频格式
- 批量处理功能
- 用户自定义气口编辑
- 更精细的处理控制 