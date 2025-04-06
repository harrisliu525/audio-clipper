import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

let wavesurfer = null;
let audioContext = null;
let audioBuffer = null;
let breathMarkers = [];

// 初始化 WaveSurfer
function initWaveSurfer() {
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#3b82f6',
        progressColor: '#2563eb',
        cursorColor: '#374151',
        height: 128,
        normalize: true,
        splitChannels: false,
        minPxPerSec: 50,
        plugins: [
            RegionsPlugin.create()
        ]
    });

    wavesurfer.on('ready', () => {
        document.getElementById('analyzeBtn').disabled = false;
        document.getElementById('playBtn').disabled = false;
        showToast('音频加载完成');
    });

    wavesurfer.on('error', (error) => {
        showToast('音频加载失败: ' + error, 'error');
    });
}

// 初始化页面
function init() {
    initWaveSurfer();
    setupEventListeners();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

// 设置事件监听器
function setupEventListeners() {
    const audioInput = document.getElementById('audioInput');
    const dropZone = document.getElementById('dropZone');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const removeBtn = document.getElementById('removeBtn');
    const playBtn = document.getElementById('playBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const thresholdInput = document.getElementById('threshold');
    const minDurationInput = document.getElementById('minDuration');

    audioInput.addEventListener('change', handleFileSelect);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);
    analyzeBtn.addEventListener('click', analyzeBreaths);
    removeBtn.addEventListener('click', removeBreaths);
    playBtn.addEventListener('click', togglePlay);
    downloadBtn.addEventListener('click', downloadProcessedAudio);

    thresholdInput.addEventListener('input', updateThresholdValue);
    minDurationInput.addEventListener('input', updateDurationValue);

    // 添加拖放视觉反馈
    dropZone.addEventListener('dragenter', () => {
        dropZone.style.borderColor = '#3b82f6';
        dropZone.style.backgroundColor = '#f8fafc';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '';
        dropZone.style.backgroundColor = '';
    });
}

// 显示提示信息
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }, 100);
}

// 更新进度条
function updateProgress(progress) {
    const progressBar = document.querySelector('.progress-bar');
    const progressContainer = document.querySelector('.progress');
    
    if (progress === 0) {
        progressContainer.style.display = 'none';
    } else {
        progressContainer.style.display = 'block';
        progressBar.style.width = `${progress}%`;
    }
}

// 文件选择处理
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 100 * 1024 * 1024) {
            showToast('文件大小不能超过100MB', 'error');
            return;
        }
        loadAudioFile(file);
    }
}

// 拖放处理
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.dataTransfer.files[0];
    if (file && (file.type === 'audio/mp3' || file.type === 'audio/wav')) {
        if (file.size > 100 * 1024 * 1024) {
            showToast('文件大小不能超过100MB', 'error');
            return;
        }
        loadAudioFile(file);
    } else {
        showToast('请上传MP3或WAV格式的音频文件', 'error');
    }

    // 重置拖放区域样式
    event.target.style.borderColor = '';
    event.target.style.backgroundColor = '';
}

// 加载音频文件
async function loadAudioFile(file) {
    try {
        updateProgress(10);
        const arrayBuffer = await file.arrayBuffer();
        updateProgress(40);
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        updateProgress(70);
        await wavesurfer.loadBlob(file);
        updateProgress(100);
        
        setTimeout(() => updateProgress(0), 1000);
        showToast('音频加载成功');
    } catch (error) {
        console.error('Error loading audio file:', error);
        showToast('音频加载失败，请检查文件格式', 'error');
        updateProgress(0);
    }
}

// 分析气口
async function analyzeBreaths() {
    if (!audioBuffer) return;

    const threshold = document.getElementById('threshold').value / 100;
    const minDuration = document.getElementById('minDuration').value;
    
    updateProgress(10);
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    breathMarkers = [];
    let isBreath = false;
    let breathStart = 0;
    let rmsWindow = Math.floor(sampleRate * 0.02); // 20ms窗口
    
    for (let i = 0; i < data.length; i += rmsWindow) {
        // 计算RMS能量
        let sum = 0;
        for (let j = 0; j < rmsWindow && (i + j) < data.length; j++) {
            sum += data[i + j] * data[i + j];
        }
        const rms = Math.sqrt(sum / rmsWindow);
        
        if (rms < threshold) {
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

        if (i % (data.length / 10) < rmsWindow) {
            updateProgress(10 + (i / data.length) * 80);
        }
    }

    // 合并相近的气口标记
    breathMarkers = mergeCloseBreaths(breathMarkers, 0.1); // 100ms阈值

    // 清除已有的标记（WaveSurfer.js v7.x版本不再有clearMarkers方法）
    // 获取所有已存在的标记并删除它们
    if (wavesurfer.regions) {
        wavesurfer.regions.clear();
    } else {
        // 如果之前没有初始化regions插件，则初始化它
        wavesurfer.registerPlugin(RegionsPlugin.create());
    }

    // 标记气口位置
    breathMarkers.forEach(marker => {
        wavesurfer.regions.add({
            start: marker.start,
            end: marker.end,
            color: '#ef4444',
            label: 'Breath'
        });
    });

    updateProgress(100);
    setTimeout(() => updateProgress(0), 1000);
    
    document.getElementById('removeBtn').disabled = false;
    showToast(`检测到 ${breathMarkers.length} 个气口`);
}

// 合并相近的气口标记
function mergeCloseBreaths(markers, threshold) {
    if (markers.length < 2) return markers;
    
    const merged = [];
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

// 移除气口
async function removeBreaths() {
    if (!audioBuffer || breathMarkers.length === 0) return;

    updateProgress(10);

    try {
        const newBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = newBuffer.getChannelData(channel);
            let outputIndex = 0;

            let lastEnd = 0;
            breathMarkers.forEach((marker, index) => {
                const startSample = Math.floor(marker.start * audioBuffer.sampleRate);
                const endSample = Math.floor(marker.end * audioBuffer.sampleRate);

                // 复制气口之前的数据
                for (let i = lastEnd; i < startSample; i++) {
                    outputData[outputIndex++] = inputData[i];
                }

                lastEnd = endSample;
                updateProgress(10 + (index / breathMarkers.length) * 80);
            });

            // 复制最后一个气口之后的数据
            for (let i = lastEnd; i < inputData.length; i++) {
                outputData[outputIndex++] = inputData[i];
            }
        }

        audioBuffer = newBuffer;
        const blob = await bufferToWave(newBuffer);
        await wavesurfer.loadBlob(blob);
        
        document.getElementById('downloadBtn').disabled = false;
        updateProgress(100);
        setTimeout(() => updateProgress(0), 1000);
        showToast('气口移除完成');
    } catch (error) {
        console.error('Error removing breaths:', error);
        showToast('处理过程中出现错误', 'error');
        updateProgress(0);
    }
}

// 播放控制
function togglePlay() {
    if (wavesurfer.isPlaying()) {
        wavesurfer.pause();
    } else {
        wavesurfer.play();
    }
}

// 下载处理后的音频
async function downloadProcessedAudio() {
    if (!audioBuffer) return;

    try {
        updateProgress(10);
        const blob = await bufferToWave(audioBuffer);
        updateProgress(80);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'processed_audio.wav';
        a.click();
        URL.revokeObjectURL(url);
        updateProgress(100);
        setTimeout(() => updateProgress(0), 1000);
        showToast('下载已开始');
    } catch (error) {
        console.error('Error downloading audio:', error);
        showToast('下载失败', 'error');
        updateProgress(0);
    }
}

// AudioBuffer 转换为 WAV
function bufferToWave(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    const channels = [];
    let pos = 0;

    // 获取声道数据
    for (let i = 0; i < numberOfChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }

    // 写入WAV文件头
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * 2 * numberOfChannels, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
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

// 辅助函数：写入字符串到DataView
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// 更新参数显示值
function updateThresholdValue(event) {
    document.getElementById('thresholdValue').textContent = event.target.value + '%';
}

function updateDurationValue(event) {
    document.getElementById('durationValue').textContent = event.target.value + 'ms';
}

// 初始化应用
init();