import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

let wavesurfer = null;
let audioContext = null;
let audioBuffer = null;
let breathMarkers = [];

// Initialize WaveSurfer
function initWaveSurfer() {
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#0071e3',
        progressColor: '#147ce5',
        cursorColor: '#1d1d1f',
        height: 128,
        normalize: true,
        splitChannels: false,
        minPxPerSec: 50
    });

    // In WaveSurfer v7.7.3, plugins need to be created separately and stored
    // Create regions plugin
    const regionsPlugin = RegionsPlugin.create();
    // Register plugin
    wavesurfer.registerPlugin(regionsPlugin);
    // Store plugin reference for later use
    wavesurfer.regionsPlugin = regionsPlugin;

    wavesurfer.on('ready', () => {
        document.getElementById('analyzeBtn').disabled = false;
        document.getElementById('playBtn').disabled = false;
        showToast('Audio loaded successfully');
    });

    wavesurfer.on('error', (error) => {
        showToast('Failed to load audio: ' + error, 'error');
    });
}

// Initialize page
function init() {
    initWaveSurfer();
    setupEventListeners();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

// Set up event listeners
function setupEventListeners() {
    const audioInput = document.getElementById('audioInput');
    const dropZone = document.querySelector('[data-dropzone]');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const removeBtn = document.getElementById('removeBtn');
    const playBtn = document.getElementById('playBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const thresholdInput = document.getElementById('threshold');
    const minDurationInput = document.getElementById('minDuration');
    const pauseDurationInput = document.getElementById('pauseDuration');

    audioInput.addEventListener('change', handleFileSelect);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);
    analyzeBtn.addEventListener('click', analyzeBreaths);
    removeBtn.addEventListener('click', removeBreaths);
    playBtn.addEventListener('click', togglePlay);
    downloadBtn.addEventListener('click', downloadProcessedAudio);

    thresholdInput.addEventListener('input', updateThresholdValue);
    minDurationInput.addEventListener('input', updateDurationValue);
    pauseDurationInput.addEventListener('input', updatePauseDurationValue);

    // Add drag and drop visual feedback
    dropZone.addEventListener('dragenter', () => {
        dropZone.style.borderColor = '#0071e3';
        dropZone.style.backgroundColor = 'rgba(0, 113, 227, 0.05)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '';
        dropZone.style.backgroundColor = '';
    });
}

// Display toast notifications
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

// Update progress bar
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

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 100 * 1024 * 1024) {
            showToast('File size cannot exceed 100MB', 'error');
            return;
        }
        loadAudioFile(file);
    }
}

// Handle drag and drop
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.dataTransfer.files[0];
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
            showToast('File size cannot exceed 100MB', 'error');
            return;
        }
        loadAudioFile(file);
    } else {
        showToast('Please upload a supported audio file format', 'error');
    }

    // Reset drop zone style
    event.target.style.borderColor = '';
    event.target.style.backgroundColor = '';
}

// Load audio file
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
        showToast('Audio loaded successfully');
    } catch (error) {
        console.error('Error loading audio file:', error);
        showToast('Failed to load audio. Please check the file format', 'error');
        updateProgress(0);
    }
}

// Analyze breaths
async function analyzeBreaths() {
    if (!audioBuffer) return;

    // Modify threshold calculation based on overall audio average energy
    const sensitivityPercent = document.getElementById('threshold').value; // 0-100
    const minDuration = document.getElementById('minDuration').value;
    
    updateProgress(10);
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Calculate average RMS energy for the entire audio
    let totalRms = 0;
    let rmsWindow = Math.floor(sampleRate * 0.02); // 20ms window
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
    }
    
    const avgRms = totalRms / windowCount;
    // Calculate threshold based on average RMS and sensitivity percentage
    // Higher sensitivity means lower threshold relative to average RMS, making it easier to detect breaths
    const threshold = avgRms * (1 - sensitivityPercent / 100);
    
    console.log(`Average RMS: ${avgRms}, Threshold: ${threshold}, Sensitivity: ${sensitivityPercent}%`);
    
    breathMarkers = [];
    let isBreath = false;
    let breathStart = 0;
    
    for (let i = 0; i < data.length; i += rmsWindow) {
        // Calculate RMS energy
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

    // Check if there's a breath at the end of the audio
    if (isBreath) {
        const breathDuration = (data.length - breathStart) / sampleRate * 1000;
        if (breathDuration >= minDuration) {
            breathMarkers.push({
                start: breathStart / sampleRate,
                end: data.length / sampleRate
            });
        }
    }

    // Merge close breath markers
    breathMarkers = mergeCloseBreaths(breathMarkers, 0.1); // 100ms threshold

    // Clear existing region markers
    if (wavesurfer.regionsPlugin) {
        // Get all regions
        const regions = wavesurfer.regionsPlugin.getRegions();
        // Remove each region
        regions.forEach(region => {
            region.remove();
        });
    }

    // Mark breath positions
    breathMarkers.forEach(marker => {
        // Use RegionsPlugin's addRegion method
        wavesurfer.regionsPlugin.addRegion({
            start: marker.start,
            end: marker.end,
            color: 'rgba(255, 69, 58, 0.3)',
            drag: false,
            resize: false
        });
    });

    updateProgress(100);
    setTimeout(() => updateProgress(0), 1000);
    
    document.getElementById('removeBtn').disabled = false;
    showToast(`Detected ${breathMarkers.length} breaths`);
}

// Merge close breath markers
function mergeCloseBreaths(markers, threshold) {
    if (markers.length < 2) return markers;
    
    const merged = [];
    let current = markers[0];
    
    for (let i = 1; i < markers.length; i++) {
        if (markers[i].start - current.end < threshold) {
            // Merge adjacent breaths
            current.end = markers[i].end;
        } else {
            merged.push(current);
            current = markers[i];
        }
    }
    merged.push(current);
    
    return merged;
}

// Remove breaths
async function removeBreaths() {
    if (!audioBuffer || breathMarkers.length === 0) return;

    updateProgress(10);

    try {
        // 获取用户设置的间隔时间（秒）
        const pauseDuration = parseFloat(document.getElementById('pauseDuration').value);
        // 计算间隔时间对应的采样点数
        const pauseSamples = Math.floor(pauseDuration * audioBuffer.sampleRate);
        
        // 计算新缓冲区的总长度（原始长度减去所有气口的长度，再加上所有间隔的长度）
        let totalBreathSamples = 0;
        let totalPauseSamples = breathMarkers.length * pauseSamples;
        
        breathMarkers.forEach(marker => {
            const startSample = Math.floor(marker.start * audioBuffer.sampleRate);
            const endSample = Math.floor(marker.end * audioBuffer.sampleRate);
            totalBreathSamples += (endSample - startSample);
        });
        
        const newLength = audioBuffer.length - totalBreathSamples + totalPauseSamples;
        
        const newBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            newLength,
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

                // 复制气口前的音频数据
                for (let i = lastEnd; i < startSample; i++) {
                    outputData[outputIndex++] = inputData[i];
                }
                
                // 添加指定长度的静音（值为0的采样点）
                for (let i = 0; i < pauseSamples; i++) {
                    outputData[outputIndex++] = 0;
                }

                lastEnd = endSample;
                updateProgress(10 + (index / breathMarkers.length) * 80);
            });

            // 复制最后一个气口后的音频数据
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
        showToast('Breaths removed successfully');
    } catch (error) {
        console.error('Error removing breaths:', error);
        showToast('An error occurred during processing', 'error');
        updateProgress(0);
    }
}

// Playback control
function togglePlay() {
    if (wavesurfer.isPlaying()) {
        wavesurfer.pause();
    } else {
        wavesurfer.play();
    }
}

// Download processed audio
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
        showToast('Download started');
    } catch (error) {
        console.error('Error downloading audio:', error);
        showToast('Download failed', 'error');
        updateProgress(0);
    }
}

// Convert AudioBuffer to WAV
function bufferToWave(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    const channels = [];
    let pos = 0;

    // Get channel data
    for (let i = 0; i < numberOfChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }

    // Write WAV header
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

    // Write sample data
    for (let i = 0; i < audioBuffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, channels[channel][i]));
            view.setInt16(44 + pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            pos += 2;
        }
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

// Helper function: Write string to DataView
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Update parameter display values
function updateThresholdValue(event) {
    document.getElementById('thresholdValue').textContent = event.target.value + '%';
}

function updateDurationValue(event) {
    document.getElementById('durationValue').textContent = event.target.value + 'ms';
}

function updatePauseDurationValue(event) {
    document.getElementById('pauseValue').textContent = event.target.value + 's';
}

// Initialize application
document.addEventListener('DOMContentLoaded', init);