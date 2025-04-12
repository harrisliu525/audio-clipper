import React from 'react';

interface ControlPanelProps {
  isAudioLoaded: boolean;
  isAnalyzing: boolean;
  isBreathsDetected: boolean;
  isPlaying: boolean;
  onAnalyze: () => void;
  onRemove: () => void;
  onPlay: () => void;
  onDownload: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isAudioLoaded,
  isAnalyzing,
  isBreathsDetected,
  isPlaying,
  onAnalyze,
  onRemove,
  onPlay,
  onDownload
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <button
        className={`py-2 px-4 rounded-full font-medium ${
          isAudioLoaded && !isAnalyzing
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        disabled={!isAudioLoaded || isAnalyzing}
        onClick={onAnalyze}
      >
        分析气口
      </button>
      
      <button
        className={`py-2 px-4 rounded-full font-medium ${
          isBreathsDetected && !isAnalyzing
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        disabled={!isBreathsDetected || isAnalyzing}
        onClick={onRemove}
      >
        移除气口
      </button>
      
      <button
        className={`py-2 px-4 rounded-full font-medium ${
          isAudioLoaded && !isAnalyzing
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        disabled={!isAudioLoaded || isAnalyzing}
        onClick={onPlay}
      >
        {isPlaying ? '暂停' : '播放'}
      </button>
      
      <button
        className={`py-2 px-4 rounded-full font-medium ${
          isBreathsDetected && !isAnalyzing
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        disabled={!isBreathsDetected || isAnalyzing}
        onClick={onDownload}
      >
        下载处理后的音频
      </button>
    </div>
  );
};

export default ControlPanel; 