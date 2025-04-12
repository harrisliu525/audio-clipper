import React, { useRef, useState } from 'react';

interface AudioUploaderProps {
  onFileSelected: (file: File) => void;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({ onFileSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        // 未来会增加错误提示
        alert('文件大小不能超过100MB');
        return;
      }
      onFileSelected(file);
    }
  };
  
  // 处理拖拽
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    const supportedTypes = [
        'audio/mp3', 
        'audio/wav', 
        'audio/ogg', 
        'audio/aac', 
        'audio/flac', 
        'audio/x-m4a', 
        'audio/mp4',
        'audio/mpeg'
    ];
    
    if (file && (supportedTypes.includes(file.type) || file.name.match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i))) {
        if (file.size > 100 * 1024 * 1024) {
            alert('文件大小不能超过100MB');
            return;
        }
        onFileSelected(file);
    } else {
        alert('请上传支持的音频文件格式');
    }
  };

  return (
    <div 
      className={`border-2 border-dashed p-12 text-center rounded-lg transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden"
        accept=".mp3,.wav,.ogg,.aac,.flac,.m4a"
        onChange={handleFileSelect}
      />
      <button 
        className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-full shadow-md transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        选择音频文件
      </button>
      <p className="mt-4 text-gray-500">
        支持MP3、WAV、OGG、AAC、FLAC和M4A格式。拖放文件至此处上传。
      </p>
    </div>
  );
};

export default AudioUploader; 