# 音频气口剪辑工具

一个专业的播客制作、有声书录制辅助工具，用于自动检测并移除音频中的呼吸声和停顿。

## 功能特点

- 支持MP3和WAV格式音频文件
- 拖放上传音频文件
- 可视化波形显示
- 自动检测音频中的气口（呼吸声和停顿）
- 可调节检测灵敏度和最小持续时间
- 直观显示检测到的气口区域
- 一键移除所有气口
- 播放功能，方便对比处理前后的效果
- 下载处理后的音频

## 技术栈

- 前端：HTML, CSS, JavaScript
- 音频处理：Web Audio API
- 波形可视化：WaveSurfer.js

## 使用方法

1. 选择或拖放音频文件到指定区域
2. 调整检测参数：
   - 检测灵敏度：值越高，越容易检测到轻微的呼吸声
   - 最小持续时间：只检测持续时间超过该值的气口
3. 点击"分析气口"按钮，系统会自动标记检测到的气口区域
4. 点击"移除气口"按钮，系统会自动移除所有检测到的气口
5. 使用播放按钮试听处理后的效果
6. 满意后点击"下载处理后的音频"按钮保存结果

## 开发环境设置

1. 克隆仓库
   ```
   git clone https://github.com/your-username/audio-clipper.git
   cd audio-clipper
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 启动开发服务器
   ```
   npm run dev
   ```

4. 构建生产版本
   ```
   npm run build
   ```

## 注意事项

- 支持的文件大小上限为100MB
- 处理大文件可能需要较长时间，请耐心等待
- 检测参数可根据实际音频特性进行调整，以获得最佳效果

## 许可证

MIT 