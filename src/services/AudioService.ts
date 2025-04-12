/**
 * 音频处理服务类
 */
export default class AudioService {
  private audioContext: AudioContext;
  private audioBuffer: AudioBuffer | null = null;
  private worker: Worker | null = null;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.initWorker();
  }
  
  // 初始化Web Worker
  private initWorker() {
    try {
      // 创建Worker
      const workerURL = new URL('../workers/audioProcessor.worker.ts', import.meta.url);
      this.worker = new Worker(workerURL, { type: 'module' });
      
      console.log('Audio处理Worker已初始化');
    } catch (error) {
      console.error('初始化Worker失败:', error);
    }
  }
  
  // 销毁Worker
  public destroyWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
  
  /**
   * 加载音频文件
   */
  async loadAudioFile(file: File): Promise<AudioBuffer> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return this.audioBuffer;
    } catch (error) {
      console.error('加载音频文件失败:', error);
      throw new Error('音频文件解码失败');
    }
  }
  
  /**
   * 分析音频中的气口
   */
  async analyzeBreaths(
    threshold: number,  // 灵敏度 (0-100)
    minDuration: number,  // 最小持续时间 (ms)
    onProgress?: (progress: number) => void
  ): Promise<BreathMarker[]> {
    if (!this.audioBuffer) {
      throw new Error('请先加载音频文件');
    }
    
    // 如果Worker可用，则使用Worker来处理
    if (this.worker) {
      return new Promise<BreathMarker[]>((resolve, reject) => {
        if (!this.worker || !this.audioBuffer) {
          reject(new Error('Worker或音频缓冲区不可用'));
          return;
        }
        
        // 设置消息处理器
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'progress') {
            onProgress?.(event.data.progress);
          }
          else if (event.data.type === 'analyzeResult') {
            // 移除消息处理器
            this.worker?.removeEventListener('message', messageHandler);
            
            // 返回结果
            resolve(event.data.markers);
          }
          else if (event.data.type === 'error') {
            // 移除消息处理器
            this.worker?.removeEventListener('message', messageHandler);
            
            // 返回错误
            reject(new Error(event.data.message));
          }
        };
        
        // 添加消息处理器
        this.worker.addEventListener('message', messageHandler);
        
        // 发送处理请求
        this.worker.postMessage({
          type: 'analyze',
          audioData: this.audioBuffer.getChannelData(0),
          sampleRate: this.audioBuffer.sampleRate,
          threshold: threshold,
          minDuration: minDuration
        });
      });
    }
    
    // 如果Worker不可用，则使用主线程处理（保留原有逻辑作为后备方案）
    onProgress?.(10);
    
    const data = this.audioBuffer.getChannelData(0);
    const sampleRate = this.audioBuffer.sampleRate;
    
    // 计算整个音频的平均RMS能量
    let totalRms = 0;
    let rmsWindow = Math.floor(sampleRate * 0.02); // 20ms窗口
    let windowCount = 0;
    
    for (let i = 0; i < data.length; i += rmsWindow) {
      let sum = 0;
      let count = 0;
      for (let j = 0; j < rmsWindow && (i + j) < data.length; j++) {
        sum += data[i + j] * data[i + j];
        count++;
      }
      if (count > 0) {
        totalRms += Math.sqrt(sum / count);
        windowCount++;
      }
      
      // 更新进度
      if (i % (data.length / 20) < rmsWindow) {
        onProgress?.(10 + (i / data.length) * 30);
      }
    }
    
    const avgRms = totalRms / windowCount;
    // 根据平均RMS和灵敏度百分比计算阈值
    // 灵敏度越高，相对于平均RMS的阈值越低，越容易检测到气口
    const calculatedThreshold = avgRms * (1 - threshold / 100);
    
    console.log(`平均RMS: ${avgRms}, 阈值: ${calculatedThreshold}, 灵敏度: ${threshold}%`);
    
    const breathMarkers: BreathMarker[] = [];
    let isBreath = false;
    let breathStart = 0;
    
    for (let i = 0; i < data.length; i += rmsWindow) {
      // 计算RMS能量
      let sum = 0;
      for (let j = 0; j < rmsWindow && (i + j) < data.length; j++) {
        sum += data[i + j] * data[i + j];
      }
      const rms = Math.sqrt(sum / rmsWindow);
      
      if (rms < calculatedThreshold) {
        if (!isBreath) {
          isBreath = true;
          breathStart = i;
        }
      } else {
        if (isBreath) {
          const breathDuration = (i - breathStart) / sampleRate * 1000;
          if (breathDuration >= minDuration) {
            breathMarkers.push({
              start: breathStart / sampleRate,
              end: i / sampleRate
            });
          }
          isBreath = false;
        }
      }
      
      // 更新进度
      if (i % (data.length / 20) < rmsWindow) {
        onProgress?.(40 + (i / data.length) * 50);
      }
    }
    
    // 检查音频末尾是否有气口
    if (isBreath) {
      const breathDuration = (data.length - breathStart) / sampleRate * 1000;
      if (breathDuration >= minDuration) {
        breathMarkers.push({
          start: breathStart / sampleRate,
          end: data.length / sampleRate
        });
      }
    }
    
    // 合并相近的气口
    const mergedMarkers = this.mergeCloseBreaths(breathMarkers, 0.1); // 100ms阈值
    
    // 完成
    onProgress?.(100);
    
    return mergedMarkers;
  }
  
  /**
   * 合并相近的气口标记
   */
  private mergeCloseBreaths(markers: BreathMarker[], threshold: number): BreathMarker[] {
    if (markers.length < 2) return markers;
    
    const merged: BreathMarker[] = [];
    let current = markers[0];
    
    for (let i = 1; i < markers.length; i++) {
      if (markers[i].start - current.end < threshold) {
        // 合并相邻的气口
        current.end = markers[i].end;
      } else {
        merged.push(current);
        current = markers[i];
      }
    }
    merged.push(current);
    
    return merged;
  }
  
  /**
   * 移除气口
   */
  async removeBreaths(
    breathMarkers: BreathMarker[],
    pauseDuration: number, // 间隔时长（秒）
    onProgress?: (progress: number) => void
  ): Promise<AudioBuffer> {
    if (!this.audioBuffer || breathMarkers.length === 0) {
      throw new Error('请先加载音频文件并检测气口');
    }
    
    // 如果Worker可用，则使用Worker来处理
    if (this.worker) {
      return new Promise<AudioBuffer>((resolve, reject) => {
        if (!this.worker || !this.audioBuffer) {
          reject(new Error('Worker或音频缓冲区不可用'));
          return;
        }
        
        // 设置消息处理器
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'progress') {
            onProgress?.(event.data.progress);
          }
          else if (event.data.type === 'removeResult') {
            // 移除消息处理器
            this.worker?.removeEventListener('message', messageHandler);
            
            try {
              // 创建新的音频缓冲区
              const newBuffer = this.audioContext.createBuffer(
                this.audioBuffer!.numberOfChannels,
                event.data.processedData.length,
                this.audioBuffer!.sampleRate
              );
              
              // 复制处理后的数据到第一个通道
              newBuffer.copyToChannel(event.data.processedData, 0);
              
              // 如果有多个通道，也复制到其他通道（简单处理，复制相同数据）
              for (let i = 1; i < this.audioBuffer!.numberOfChannels; i++) {
                newBuffer.copyToChannel(event.data.processedData, i);
              }
              
              // 更新当前的音频缓冲区
              this.audioBuffer = newBuffer;
              
              // 返回新缓冲区
              resolve(newBuffer);
            } catch (error) {
              reject(error);
            }
          }
          else if (event.data.type === 'error') {
            // 移除消息处理器
            this.worker?.removeEventListener('message', messageHandler);
            
            // 返回错误
            reject(new Error(event.data.message));
          }
        };
        
        // 添加消息处理器
        this.worker.addEventListener('message', messageHandler);
        
        // 只处理第一个通道数据，简化处理
        const audioData = this.audioBuffer.getChannelData(0);
        
        // 发送处理请求
        this.worker.postMessage({
          type: 'remove',
          audioData: audioData,
          sampleRate: this.audioBuffer.sampleRate,
          breathMarkers: breathMarkers,
          pauseDuration: pauseDuration
        });
      });
    }
    
    // 如果Worker不可用，则使用主线程处理（保留原有逻辑作为后备方案）
    onProgress?.(10);
    
    try {
      // 计算间隔时间对应的采样点数
      const pauseSamples = Math.floor(pauseDuration * this.audioBuffer.sampleRate);
      
      // 计算新缓冲区的总长度
      let totalBreathSamples = 0;
      let totalPauseSamples = breathMarkers.length * pauseSamples;
      
      breathMarkers.forEach(marker => {
        const startSample = Math.floor(marker.start * this.audioBuffer!.sampleRate);
        const endSample = Math.floor(marker.end * this.audioBuffer!.sampleRate);
        totalBreathSamples += (endSample - startSample);
      });
      
      const newLength = this.audioBuffer.length - totalBreathSamples + totalPauseSamples;
      
      // 创建新的音频缓冲区
      const newBuffer = this.audioContext.createBuffer(
        this.audioBuffer.numberOfChannels,
        newLength,
        this.audioBuffer.sampleRate
      );
      
      // 处理每个通道
      for (let channel = 0; channel < this.audioBuffer.numberOfChannels; channel++) {
        const inputData = this.audioBuffer.getChannelData(channel);
        const outputData = newBuffer.getChannelData(channel);
        let outputIndex = 0;
        
        let lastEnd = 0;
        breathMarkers.forEach((marker, index) => {
          const startSample = Math.floor(marker.start * this.audioBuffer!.sampleRate);
          const endSample = Math.floor(marker.end * this.audioBuffer!.sampleRate);
          
          // 复制气口前的音频数据
          for (let i = lastEnd; i < startSample; i++) {
            outputData[outputIndex++] = inputData[i];
          }
          
          // 添加指定长度的静音
          for (let i = 0; i < pauseSamples; i++) {
            outputData[outputIndex++] = 0;
          }
          
          lastEnd = endSample;
          onProgress?.(10 + (index / breathMarkers.length) * 80);
        });
        
        // 复制最后一个气口后的音频数据
        for (let i = lastEnd; i < inputData.length; i++) {
          outputData[outputIndex++] = inputData[i];
        }
      }
      
      // 更新当前的音频缓冲区
      this.audioBuffer = newBuffer;
      
      onProgress?.(100);
      return newBuffer;
    } catch (error) {
      console.error('移除气口失败:', error);
      throw new Error('音频处理失败');
    }
  }
  
  /**
   * 将AudioBuffer转换为WAV格式的Blob
   */
  async audioBufferToWav(audioBuffer: AudioBuffer): Promise<Blob> {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    const channels = [];
    let pos = 0;
    
    // 获取通道数据
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }
    
    // 写入WAV头
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * 2 * numberOfChannels, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, length, true);
    
    // 写入采样数据
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(44 + pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        pos += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }
  
  /**
   * 辅助函数：将字符串写入DataView
   */
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  /**
   * 获取当前的音频上下文
   */
  getAudioContext(): AudioContext {
    return this.audioContext;
  }
  
  /**
   * 获取当前的音频缓冲区
   */
  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }
}

/**
 * 气口标记接口
 */
export interface BreathMarker {
  start: number; // 开始时间（秒）
  end: number;   // 结束时间（秒）
} 