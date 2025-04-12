import React, { useEffect, useState, useRef } from 'react';
import AudioUploader from './components/AudioUploader';
import WaveformViewer from './components/WaveformViewer';
import ParameterControl from './components/ParameterControl';
import ControlPanel from './components/ControlPanel';
import ProcessingIndicator from './components/ProcessingIndicator';
import AudioService, { BreathMarker } from './services/AudioService';
import { ToastProvider, useToast } from './components/Toast';

// 主应用组件
function App() {
  return (
    <ToastProvider>
      <AudioApp />
    </ToastProvider>
  );
}

// 音频处理应用核心
function AudioApp() {
  // Toast通知
  const { showToast } = useToast();
  
  // 音频服务
  const audioServiceRef = useRef<AudioService>(new AudioService());
  
  // 状态管理
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBreathsDetected, setIsBreathsDetected] = useState(false);
  const [breathMarkers, setBreathMarkers] = useState<BreathMarker[]>([]);
  
  // 参数状态
  const [threshold, setThreshold] = useState(50);
  const [minDuration, setMinDuration] = useState(300);
  const [pauseDuration, setPauseDuration] = useState(0.2);
  
  // 获取音频服务实例
  const getAudioService = () => audioServiceRef.current;
  
  // 清理资源
  useEffect(() => {
    return () => {
      // 组件卸载时销毁Worker
      getAudioService().destroyWorker();
    };
  }, []);

  // 处理文件选择
  const handleFileSelected = async (file: File) => {
    setAudioFile(file);
    setIsBreathsDetected(false);
    setBreathMarkers([]);
    
    try {
      setIsProcessing(true);
      setProgress(10);
      
      // 加载音频文件
      await getAudioService().loadAudioFile(file);
      
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 500);
      
      showToast('音频文件加载成功', 'success');
    } catch (error) {
      console.error('加载音频文件失败:', error);
      showToast('加载音频文件失败，请检查文件格式', 'error');
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // 处理波形准备就绪
  const handleWaveformReady = () => {
    setIsAudioLoaded(true);
  };
  
  // 处理播放状态变化
  const handlePlayPause = (playing: boolean) => {
    setIsPlaying(playing);
  };

  // 分析气口
  const handleAnalyze = async () => {
    if (!isAudioLoaded) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // 分析气口
      const markers = await getAudioService().analyzeBreaths(
        threshold,
        minDuration,
        (progress) => setProgress(progress)
      );
      
      setBreathMarkers(markers);
      setIsBreathsDetected(markers.length > 0);
      
      showToast(`检测到 ${markers.length} 个气口`, 'success');
    } catch (error) {
      console.error('分析气口失败:', error);
      showToast('分析气口失败', 'error');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // 移除气口
  const handleRemove = async () => {
    if (!isBreathsDetected || breathMarkers.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // 移除气口
      const newBuffer = await getAudioService().removeBreaths(
        breathMarkers,
        pauseDuration,
        (progress) => setProgress(progress)
      );
      
      // 转换为blob
      const blob = await getAudioService().audioBufferToWav(newBuffer);
      
      // 更新WaveSurfer显示(通过重新设置audioFile触发加载)
      const newFile = new File([blob], audioFile!.name, { type: 'audio/wav' });
      setAudioFile(newFile);
      
      showToast('气口移除成功', 'success');
    } catch (error) {
      console.error('移除气口失败:', error);
      showToast('移除气口失败', 'error');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // 切换播放状态（实际播放逻辑在WaveformViewer组件中实现）
  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // 下载处理后的音频
  const handleDownload = async () => {
    try {
      setIsProcessing(true);
      setProgress(10);
      
      const audioBuffer = getAudioService().getAudioBuffer();
      if (!audioBuffer) {
        throw new Error('没有可下载的音频');
      }
      
      const blob = await getAudioService().audioBufferToWav(audioBuffer);
      setProgress(80);
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${audioFile?.name || 'audio.wav'}`;
      a.click();
      URL.revokeObjectURL(url);
      
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 500);
      
      showToast('下载已开始', 'success');
    } catch (error) {
      console.error('下载失败:', error);
      showToast('下载失败', 'error');
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">AudioBreath <span className="bg-green-500 text-white text-sm px-3 py-1 rounded-full">100% 免费</span></h1>
        <p className="text-gray-600">专业的播客制作、有声书录制辅助工具，无需注册即可使用。</p>
      </header>

      <main>
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <AudioUploader onFileSelected={handleFileSelected} />
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <WaveformViewer 
            audioFile={audioFile}
            onWaveformReady={handleWaveformReady}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
          />
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">参数设置</h2>
          <ParameterControl
            threshold={threshold}
            minDuration={minDuration}
            pauseDuration={pauseDuration}
            onThresholdChange={setThreshold}
            onMinDurationChange={setMinDuration}
            onPauseDurationChange={setPauseDuration}
          />
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <ControlPanel
            isAudioLoaded={isAudioLoaded}
            isAnalyzing={isProcessing}
            isBreathsDetected={isBreathsDetected}
            isPlaying={isPlaying}
            onAnalyze={handleAnalyze}
            onRemove={handleRemove}
            onPlay={handlePlay}
            onDownload={handleDownload}
          />
        </div>

        {isProcessing && (
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <ProcessingIndicator progress={progress} />
          </div>
        )}
      </main>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>© 2024 AudioBreath | 完全免费且无需注册</p>
      </footer>
    </div>
  );
}

export default App;
