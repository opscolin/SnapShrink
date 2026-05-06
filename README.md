# SnapShrink - 高性能在线图片压缩工具

SnapShrink 是一款基于浏览器本地处理的高性能图片压缩工具。它支持批量操作、自定义水印和多种质量控制选项。由于所有图片处理均在用户本地浏览器中完成，隐私性和安全性得到了极致保障。

## ✨ 主要功能

- **🚀 极速批量压缩**: 支持多图片同时上传，利用 Web Worker 技术并行处理，不阻塞界面。
- **🔒 隐私优先**: 图片处理 100% 在客户端完成。**图片从不上传到服务器**，确保您的数据资产安全。
- **🎨 自定义水印**:
  - 一键开启/关闭水印。
  - 支持自定义文字内容、透明度和字体大小。
  - 智能阴影效果，确保在各种背景下清晰可见。
- **⚙️ 精细化控制**:
  - **画质调节**: 0.1 到 1.0 的质量系数可选。
  - **分辨率缩放**: 预设 1080p, 2K, 4K 及原始尺寸选项，有效降低文件体积。
- **📦 批量导出**: 压缩完成后，支持单张下载或一键打包为 `.zip` 文件导出。
- **🌐 多语言支持**: 自动根据浏览器语言切换中英文“使用指南”。
- **📈 广告友好布局**: 预留了 Google AdSense 标准广告位（顶部横幅、侧边栏、流式广告），在变现的同时不牺牲用户体验。

## 🛠️ 技术栈

- **框架**: [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/)
- **动画**: [Motion (Framer Motion)](https://motion.dev/)
- **核心逻辑**:
  - `browser-image-compression`: 高性能客户端压缩引擎。
  - `jszip` & `file-saver`: 实现批量文件的打包与下载。
  - `canvas-confetti`: 处理完成后的惊喜纸屑音效/视觉反馈。
- **图标**: [Lucide React](https://lucide.dev/)

## 🚀 快速开始

### 1. 开发环境启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 2. 构建生产版本

```bash
npm run build
```

## 🌍 部署到 Vercel (指南)

SnapShrink 是一个纯静态应用（SPA），非常适合部署在 Vercel 平台上：

1. 将代码推送到您的 **GitHub** 仓库。
2. 登录 [Vercel 官网](https://vercel.com/)。
3. 点击 "Add New" -> "Project"。
4. 导入对应的 GitHub 仓库。
5. Vercel 会自动识别 Vite 项目并配置构建指令，点击 **Deploy** 即可完成发布。

## 💰 接入 Google AdSense

本项目在 `src/App.tsx` 中定义了 `AdSlot` 组件。您可以按照以下步骤接入真实广告：

1. 在 `index.html` 的 `<head>` 中添加 AdSense 的脚本。
2. 在 `AdSlot` 组件中替换为您自己的 `data-ad-client` 和 `data-ad-slot`。
3. 布局已经针对 `90px` 高度（顶部）和 `250px` 高度（侧边栏）进行了优化。

## 📄 许可证

本项目采用 [Apache-2.0](LICENSE) 协议。
