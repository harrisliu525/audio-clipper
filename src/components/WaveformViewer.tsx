import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

interface WaveformViewerProps {
  audioFile: File | null;
  onWaveformReady: () => void;
  isPlaying?: boolean;
  onPlayPause?: (isPlaying: boolean) => void;
}

const WaveformViewer: React.FC<WaveformViewerProps> = ({ 
  audioFile, 
  onWaveformReady,
  isPlaying,
  onPlayPause
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 初始化WaveSurfer
  useEffect(() => {
    if (waveformRef.current && !wavesurferRef.current) {
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#0071e3',
        progressColor: '#147ce5',
        cursorColor: '#1d1d1f',
        height: 128,
        normalize: true,
        splitChannels: false as any,
        minPxPerSec: 50
      });
      
      // 创建区域插件
      const regionsPlugin = RegionsPlugin.create();
      // 注册插件
      wavesurfer.registerPlugin(regionsPlugin);
      // 存储插件引用以供后续使用
      (wavesurfer as any).regionsPlugin = regionsPlugin;
      
      wavesurfer.on('ready', () => {
        console.log('WaveSurfer准备就绪');
        onWaveformReady();
      });
      
      wavesurfer.on('error', (error) => {
        console.error('WaveSurfer错误:', error);
        setIsLoading(false);
      });
      
      // 监听播放/暂停事件
      wavesurfer.on('play', () => {
        onPlayPause?.(true);
      });
      
      wavesurfer.on('pause', () => {
        onPlayPause?.(false);
      });
      
      wavesurferRef.current = wavesurfer;
    }
    
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [onWaveformReady, onPlayPause]);
  
  // 加载音频文件
  useEffect(() => {
    if (audioFile && wavesurferRef.current) {
      setIsLoading(true);
      
      // 加载文件
      wavesurferRef.current.loadBlob(audioFile)
        .then(() => {
          setIsLoading(false);
        })
        .catch(error => {
          console.error('加载音频文件失败:', error);
          setIsLoading(false);
        });
    }
  }, [audioFile]);
  
  // 控制播放状态
  useEffect(() => {
    if (wavesurferRef.current) {
      if (isPlaying && !wavesurferRef.current.isPlaying()) {
        wavesurferRef.current.play();
      } else if (!isPlaying && wavesurferRef.current.isPlaying()) {
        wavesurferRef.current.pause();
      }
    }
  }, [isPlaying]);
  
  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-100 p-4">
      <div 
        ref={waveformRef} 
        className="w-full h-32"
      />
      {!audioFile && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          上传音频文件以查看波形
        </div>
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-70">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default WaveformViewer; 