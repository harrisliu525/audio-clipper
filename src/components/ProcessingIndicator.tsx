import React from 'react';

interface ProcessingIndicatorProps {
  progress: number;
}

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ progress }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-blue-500">处理进度</span>
        <span className="text-sm font-medium text-blue-500">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProcessingIndicator; 