# 🎬 短视频自动生成器 (Autodrive Visual Academy)

一个基于 AI 的短视频自动生成工具，使用 React + Remotion + Poe API 技术栈，能够根据主题自动生成包含文案、图片、语音的完整短视频内容。

## ✨ 功能特性

- 🤖 **AI 驱动的内容生成**
  - 使用 Poe API (Gemini 3 Pro) 生成高质量短视频脚本
  - 自动生成符合平台算法的爆款文案（高留存、快节奏）
  - 智能场景过渡，确保内容连贯流畅

- 🎨 **多媒体素材生成**
  - 使用 Nano Banana Pro 生成竖屏（9:16）风格图片
  - 使用 Gemini 2.5 Pro TTS 生成自然语音
  - 支持 1K/2K/4K 画质选择
  - 自动清理特殊符号，优化 TTS 输出

- 📝 **脚本审核与编辑**
  - 生成脚本后可预览和编辑
  - 支持修改画面描述和配音文案
  - 确认无误后再生成素材，节省 API 配额

- 🎬 **视频导出**
  - 使用 Remotion 进行专业视频渲染
  - 支持 1.5x 倍速播放
  - 自动同步音频和字幕
  - 导出高质量 MP4 视频

- 💾 **本地缓存**
  - 使用 IndexedDB 缓存生成的素材
  - 支持项目恢复，避免重复生成
  - 可导出项目素材包（ZIP）

- 🎵 **背景音乐**
  - 内置多款免费背景音乐
  - 支持自定义音乐或无音乐模式

## 🛠️ 技术栈

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite 6
- **视频渲染**: Remotion 4
- **AI 服务**: Poe API (OpenAI SDK)
  - Gemini 3 Pro (文案生成)
  - Nano Banana Pro (图片生成)
  - Gemini 2.5 Pro TTS (语音生成)
- **存储**: IndexedDB (idb)
- **工具库**: 
  - jszip (ZIP 打包)
  - file-saver (文件下载)
  - https-proxy-agent (代理支持)

## 📋 前置要求

- Node.js 18+ 
- npm 或 yarn
- Poe API Key（用于调用 AI 服务）

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd autodrive-visual-academy
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```env
POE_API_KEY=your_poe_api_key_here
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 开始使用。

## 📖 使用指南

### 基本流程

1. **输入主题**
   - 在首页输入视频主题（如"自动驾驶"）
   - 可选：添加详细描述或参考文本
   - 选择画质（1K/2K/4K）和背景音乐

2. **生成脚本**
   - 点击"开始制作"
   - AI 将生成 12-15 个场景的脚本
   - 脚本包含：标题、画面描述、配音文案、时长

3. **审核编辑**
   - 在脚本审核页面检查每个场景
   - 可修改画面描述和配音文案
   - 确认无误后点击"确认并生成素材"

4. **生成素材**
   - 系统将并发生成图片和语音
   - 支持自动重试机制
   - 进度实时显示

5. **预览与导出**
   - 在播放器预览完整视频
   - 可下载项目素材包（ZIP）
   - 使用 Remotion CLI 导出最终视频

### 导出视频

#### 方法 1: 使用 Remotion CLI（推荐）

1. **导出 Remotion 数据包**
   - 在播放器页面点击"导出 Remotion 数据包 (含素材文件)"
   - 下载 ZIP 文件并解压

2. **设置文件路径**
   - 将解压后的 `videos/`、`images/`、`audio/` 文件夹复制到项目的 `public/` 目录
   - 将 `remotion-data.json` 复制到项目根目录（与 `package.json` 同级）

   ```bash
   # 解压 ZIP 文件后，在项目根目录执行：
   cp -r project_name/videos public/
   cp -r project_name/images public/
   cp -r project_name/audio public/
   cp project_name/remotion-data.json .
   ```

3. **运行渲染命令**

   ```bash
   npm run render
   ```

   视频将导出到 `out/video.mp4`

   > **注意**：如果遇到 404 错误，请确保文件在 `public/` 目录下，且路径格式正确（以 `/` 开头，如 `/videos/1.mp4`）

#### 方法 2: 预览 Remotion 组合

```bash
npm run remotion:preview
```

这会打开 Remotion Studio，你可以在浏览器中预览和调试视频。

> 详细说明请参考 [RENDER_INSTRUCTIONS.md](./RENDER_INSTRUCTIONS.md)

## 🔧 配置说明

### 代理配置（可选）

如果遇到网络问题，可以配置代理：

```bash
# 设置环境变量
export HTTPS_PROXY=http://127.0.0.1:7890
# 或
export HTTP_PROXY=http://127.0.0.1:7890
```

Vite 会自动使用代理转发 Poe API 请求。

### API 模型配置

在 `services/geminiService.ts` 中可以修改使用的模型：

- **文案生成**: `gemini-3-pro`
- **图片生成**: `nano-banana-pro`
- **语音生成**: `gemini-2.5-pro-tts`

## 📁 项目结构

```
autodrive-visual-academy/
├── src/
│   ├── remotion/          # Remotion 视频组合
│   │   ├── Root.tsx       # 根组件
│   │   ├── Composition.tsx # 场景组合
│   │   └── index.ts       # Remotion 入口
│   └── ...
├── components/            # React 组件
│   ├── AssetGenerator.tsx # 素材生成器
│   └── Player.tsx         # 播放器
├── services/              # 服务层
│   └── geminiService.ts   # Poe API 调用
├── utils/                 # 工具函数
│   ├── audioUtils.ts      # 音频处理
│   ├── storageUtils.ts    # IndexedDB 存储
│   └── downloadUtils.ts   # 文件下载
├── types.ts               # TypeScript 类型定义
├── App.tsx                # 主应用组件
├── vite.config.ts         # Vite 配置
└── package.json
```

## 🎯 核心功能说明

### 脚本生成策略

系统使用"Viral Retention Formula"生成脚本：

- **Scene 1**: 制造冲突，打破预期（Hook）
- **Scene 2-5**: 放大冲突，说明重要性（Pain）
- **Scene 6-14**: 高密度价值输出（Solution）
- **Scene 15**: 总结和行动号召（CTA）

每个场景之间使用过渡词（"不仅如此"、"更重要的是"等）确保流畅连接。

### 素材生成优化

- **并发生成**: 图片和语音采用 3 个一批的并发策略
- **自动重试**: 失败自动重试 2-5 次
- **本地缓存**: 生成的素材自动保存到 IndexedDB
- **符号清理**: TTS 文本自动清理特殊符号

### 视频渲染

- **帧率**: 30 FPS
- **分辨率**: 1080x1920 (9:16 竖屏)
- **播放速度**: 1.5x 倍速
- **音频同步**: 自动计算实际音频时长并同步

## 🐛 常见问题

### Q: 生成的视频音频被提前截断？

A: 已在 `src/remotion/Root.tsx` 中添加 1 秒缓冲，确保音频完整播放。

### Q: 字幕遮挡图片？

A: 已在 `src/remotion/Composition.tsx` 中调整布局，图片高度设为 85%，字幕层 z-index 设为 10。

### Q: CORS 错误？

A: Vite 已配置代理，请求会通过 `/api/poe` 转发。如果仍有问题，检查代理配置。

### Q: 网络超时？

A: 配置 `HTTPS_PROXY` 环境变量，或检查网络连接。

## 📝 开发说明

### 添加新的背景音乐

在 `App.tsx` 中修改 `MUSIC_TRACKS` 数组：

```typescript
const MUSIC_TRACKS = [
  { id: 'custom', name: '自定义音乐', url: 'your-music-url.mp3' },
  // ...
];
```

### 修改场景数量

在 `services/geminiService.ts` 的 `generateScript` 函数中修改：

```typescript
Structure the response as a JSON object containing an array of exactly 12 scenes.
```

### 调整播放速度

在以下文件中修改 `playbackSpeed` 值：
- `src/remotion/Root.tsx`
- `src/remotion/Composition.tsx`
- `components/Player.tsx`

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请提交 Issue。

---

**注意**: 本项目需要有效的 Poe API Key 才能使用。请确保 API Key 有足够的配额。
