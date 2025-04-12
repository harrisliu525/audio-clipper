/* eslint-disable no-restricted-globals */

interface BreathMarker {
  start: number; // 开始时间（秒）
  end: number;   // 结束时间（秒）
}

// Web Worker消息类型
interface WorkerRequestMessage {
  type: 'analyze' | 'remove';
  audioData?: Float32Array;
  sampleRate?: number;
  threshold?: number;
  minDuration?: number;
  pauseDuration?: number;
  breathMarkers?: BreathMarker[];
}

// 合并相近的气口标记
function mergeCloseBreaths(markers: BreathMarker[], threshold: number): BreathMarker[] {
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

// 分析音频中的气口
function analyzeBreaths(
  audioData: Float32Array,
  sampleRate: number,
  threshold: number,
  minDuration: number
): BreathMarker[] {
  // 报告进度
  self.postMessage({ type: 'progress', progress: 10 });
  
  // 计算整个音频的平均RMS能量
  let totalRms = 0;
  let rmsWindow = Math.floor(sampleRate * 0.02); // 20ms窗口
  let windowCount = 0;
  
  for (let i = 0; i < audioData.length; i += rmsWindow) {
    let sum = 0;
    let count = 0;
    
    for (let j = 0; j < rmsWindow && (i + j) < audioData.length; j++) {
      sum += audioData[i + j] * audioData[i + j];
      count++;
    }
    
    if (count > 0) {
      totalRms += Math.sqrt(sum / count);
      windowCount++;
    }
    
    // 更新进度
    if (i % (audioData.length / 20) < rmsWindow) {
      self.postMessage({ 
        type: 'progress', 
        progress: 10 + (i / audioData.length) * 30 
      });
    }
  }
  
  const avgRms = totalRms / windowCount;
  // 根据平均RMS和灵敏度百分比计算阈值
  const calculatedThreshold = avgRms * (1 - threshold / 100);
  
  console.log(`平均RMS: ${avgRms}, 阈值: ${calculatedThreshold}, 灵敏度: ${threshold}%`);
  
  const breathMarkers: BreathMarker[] = [];
  let isBreath = false;
  let breathStart = 0;
  
  for (let i = 0; i < audioData.length; i += rmsWindow) {
    // 计算RMS能量
    let sum = 0;
    for (let j = 0; j < rmsWindow && (i + j) < audioData.length; j++) {
      sum += audioData[i + j] * audioData[i + j];
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
    if (i % (audioData.length / 20) < rmsWindow) {
      self.postMessage({ 
        type: 'progress', 
        progress: 40 + (i / audioData.length) * 50 
      });
    }
  }
  
  // 检查音频末尾是否有气口
  if (isBreath) {
    const breathDuration = (audioData.length - breathStart) / sampleRate * 1000;
    if (breathDuration >= minDuration) {
      breathMarkers.push({
        start: breathStart / sampleRate,
        end: audioData.length / sampleRate
      });
    }
  }
  
  // 合并相近的气口
  const mergedMarkers = mergeCloseBreaths(breathMarkers, 0.1); // 100ms阈值
  
  // 完成
  self.postMessage({ type: 'progress', progress: 100 });
  
  return mergedMarkers;
}

// 移除气口
function removeBreaths(
  audioData: Float32Array,
  sampleRate: number,
  breathMarkers: BreathMarker[],
  pauseDuration: number
): Float32Array {
  // 报告进度
  self.postMessage({ type: 'progress', progress: 10 });
  
  // 计算间隔时间对应的采样点数
  const pauseSamples = Math.floor(pauseDuration * sampleRate);
  
  // 计算新缓冲区的总长度
  let totalBreathSamples = 0;
  let totalPauseSamples = breathMarkers.length * pauseSamples;
  
  breathMarkers.forEach(marker => {
    const startSample = Math.floor(marker.start * sampleRate);
    const endSample = Math.floor(marker.end * sampleRate);
    totalBreathSamples += (endSample - startSample);
  });
  
  const newLength = audioData.length - totalBreathSamples + totalPauseSamples;
  const outputData = new Float32Array(newLength);
  let outputIndex = 0;
  
  let lastEnd = 0;
  breathMarkers.forEach((marker, index) => {
    const startSample = Math.floor(marker.start * sampleRate);
    const endSample = Math.floor(marker.end * sampleRate);
    
    // 复制气口前的音频数据
    for (let i = lastEnd; i < startSample; i++) {
      outputData[outputIndex++] = audioData[i];
    }
    
    // 添加指定长度的静音
    for (let i = 0; i < pauseSamples; i++) {
      outputData[outputIndex++] = 0;
    }
    
    lastEnd = endSample;
    self.postMessage({ 
      type: 'progress', 
      progress: 10 + (index / breathMarkers.length) * 80 
    });
  });
  
  // 复制最后一个气口后的音频数据
  for (let i = lastEnd; i < audioData.length; i++) {
    outputData[outputIndex++] = audioData[i];
  }
  
  // 完成
  self.postMessage({ type: 'progress', progress: 100 });
  
  return outputData;
}

// 监听消息
self.addEventListener('message', (event: MessageEvent<WorkerRequestMessage>) => {
  const data = event.data;
  
  try {
    if (data.type === 'analyze' && data.audioData && data.sampleRate) {
      // 分析气口
      const markers = analyzeBreaths(
        data.audioData,
        data.sampleRate,
        data.threshold || 50,
        data.minDuration || 300
      );
      
      // 返回结果
      self.postMessage({
        type: 'analyzeResult',
        markers: markers
      });
    }
    else if (data.type === 'remove' && data.audioData && data.sampleRate && data.breathMarkers) {
      // 移除气口
      const processedData = removeBreaths(
        data.audioData,
        data.sampleRate,
        data.breathMarkers,
        data.pauseDuration || 0.2
      );
      
      // 返回结果
      self.postMessage({
        type: 'removeResult',
        processedData: processedData
      }, {transfer: [processedData.buffer]}); // 使用可转移对象优化性能
    }
  } catch (error) {
    // 发送错误信息
    self.postMessage({
      type: 'error',
      message: (error as Error).message
    });
  }
});

// 让TypeScript知道这是一个模块
export {}; 