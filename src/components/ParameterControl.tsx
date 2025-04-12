import React from 'react';

interface ParameterControlProps {
  threshold: number;
  minDuration: number;
  pauseDuration: number;
  onThresholdChange: (value: number) => void;
  onMinDurationChange: (value: number) => void;
  onPauseDurationChange: (value: number) => void;
}

const ParameterControl: React.FC<ParameterControlProps> = ({
  threshold,
  minDuration,
  pauseDuration,
  onThresholdChange,
  onMinDurationChange,
  onPauseDurationChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="space-y-2">
        <label htmlFor="threshold" className="block text-sm font-medium text-gray-700">
          检测灵敏度
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            id="threshold"
            min="0"
            max="100"
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-600 w-16">{threshold}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="minDuration" className="block text-sm font-medium text-gray-700">
          最小持续时间 (ms)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            id="minDuration"
            min="100"
            max="1000"
            step="50"
            value={minDuration}
            onChange={(e) => onMinDurationChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-600 w-16">{minDuration}ms</span>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="pauseDuration" className="block text-sm font-medium text-gray-700">
          间隔时长 (s)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            id="pauseDuration"
            min="0"
            max="1"
            step="0.05"
            value={pauseDuration}
            onChange={(e) => onPauseDurationChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-600 w-16">{pauseDuration}s</span>
        </div>
      </div>
    </div>
  );
};

export default ParameterControl; 