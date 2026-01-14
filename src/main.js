// OCR Tool - Text Recognition
// Uses Tesseract.js for client-side OCR

let worker = null;
let currentImage = null;
let currentLanguage = 'eng';

// DOM Elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const pasteBtn = document.getElementById('paste-btn');
const cameraBtn = document.getElementById('camera-btn');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const clearImageBtn = document.getElementById('clear-image');
const enhanceCheckbox = document.getElementById('enhance-checkbox');
const contrastGroup = document.getElementById('contrast-group');
const brightnessGroup = document.getElementById('brightness-group');
const contrastSlider = document.getElementById('contrast-slider');
const brightnessSlider = document.getElementById('brightness-slider');
const contrastValue = document.getElementById('contrast-value');
const brightnessValue = document.getElementById('brightness-value');
const languageSelect = document.getElementById('language-select');
const extractBtn = document.getElementById('extract-btn');
const errorMessage = document.getElementById('error-message');
const progressContainer = document.getElementById('progress-container');
const progressText = document.getElementById('progress-text');
const progressFill = document.getElementById('progress-fill');
const results = document.getElementById('results');
const outputArea = document.getElementById('output-area');
const confidenceValue = document.getElementById('confidence-value');
const copyBtn = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');
const cameraModal = document.getElementById('camera-modal');
const cameraVideo = document.getElementById('camera-video');
const cameraCanvas = document.getElementById('camera-canvas');
const cameraClose = document.getElementById('camera-close');
const captureBtn = document.getElementById('capture-btn');

let mediaStream = null;

// Initialize
function init() {
  loadSettings();
  setupEventListeners();
}

// Load saved settings
function loadSettings() {
  const savedLanguage = localStorage.getItem('ocr-language');
  if (savedLanguage) {
    languageSelect.value = savedLanguage;
    currentLanguage = savedLanguage;
  }
}

// Save settings
function saveSettings() {
  localStorage.setItem('ocr-language', currentLanguage);
}

// Setup event listeners
function setupEventListeners() {
  // Drag and drop
  uploadArea.addEventListener('dragover', handleDragOver);
  uploadArea.addEventListener('dragleave', handleDragLeave);
  uploadArea.addEventListener('drop', handleDrop);
  uploadArea.addEventListener('click', (e) => {
    if (e.target === uploadArea || e.target.classList.contains('upload-text') ||
        e.target.classList.contains('upload-hint') || e.target.classList.contains('upload-icon')) {
      fileInput.click();
    }
  });

  // File input
  fileInput.addEventListener('change', handleFileSelect);
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  // Paste
  pasteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handlePaste();
  });
  document.addEventListener('paste', handlePasteEvent);

  // Camera
  cameraBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openCamera();
  });
  cameraClose.addEventListener('click', closeCamera);
  captureBtn.addEventListener('click', capturePhoto);
  cameraModal.addEventListener('click', (e) => {
    if (e.target === cameraModal) closeCamera();
  });

  // Clear image
  clearImageBtn.addEventListener('click', clearImage);

  // Preprocessing
  enhanceCheckbox.addEventListener('change', toggleEnhance);
  contrastSlider.addEventListener('input', updateSliderValue);
  brightnessSlider.addEventListener('input', updateSliderValue);

  // Language
  languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    saveSettings();
    // Reset worker when language changes
    if (worker) {
      worker.terminate();
      worker = null;
    }
  });

  // Extract
  extractBtn.addEventListener('click', extractText);

  // Actions
  copyBtn.addEventListener('click', copyText);
  downloadBtn.addEventListener('click', downloadText);
}

// Drag and drop handlers
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadArea.classList.remove('dragover');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

// File handlers
function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showError('Please select an image file.');
    return;
  }

  hideError();
  currentImage = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    previewContainer.classList.add('visible');
    uploadArea.classList.add('has-image');
    extractBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

// Paste handlers
async function handlePaste() {
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      const imageType = item.types.find(type => type.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        const file = new File([blob], 'pasted-image.png', { type: imageType });
        handleFile(file);
        return;
      }
    }
    showError('No image found in clipboard. Copy an image first.');
  } catch (err) {
    showError('Could not read clipboard. Try using Ctrl+V instead.');
  }
}

function handlePasteEvent(e) {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) handleFile(file);
      return;
    }
  }
}

// Camera handlers
async function openCamera() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    cameraVideo.srcObject = mediaStream;
    cameraModal.classList.add('visible');
  } catch (err) {
    showError('Could not access camera. Please check permissions.');
  }
}

function closeCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  cameraVideo.srcObject = null;
  cameraModal.classList.remove('visible');
}

function capturePhoto() {
  const video = cameraVideo;
  const canvas = cameraCanvas;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  canvas.toBlob((blob) => {
    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
    handleFile(file);
    closeCamera();
  }, 'image/jpeg', 0.9);
}

// Clear image
function clearImage() {
  currentImage = null;
  previewImage.src = '';
  previewContainer.classList.remove('visible');
  uploadArea.classList.remove('has-image');
  extractBtn.disabled = true;
  fileInput.value = '';
  results.classList.remove('visible');
  hideError();
}

// Preprocessing
function toggleEnhance() {
  const show = enhanceCheckbox.checked;
  contrastGroup.style.display = show ? 'flex' : 'none';
  brightnessGroup.style.display = show ? 'flex' : 'none';
}

function updateSliderValue(e) {
  const slider = e.target;
  const valueSpan = slider.id === 'contrast-slider' ? contrastValue : brightnessValue;
  valueSpan.textContent = slider.value + '%';
}

// Apply preprocessing to image
async function preprocessImage(imageSource) {
  if (!enhanceCheckbox.checked) {
    return imageSource;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');

      // Apply filters
      const contrast = contrastSlider.value / 100;
      const brightness = brightnessSlider.value / 100;

      ctx.filter = `contrast(${contrast}) brightness(${brightness})`;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    };

    if (imageSource instanceof File || imageSource instanceof Blob) {
      img.src = URL.createObjectURL(imageSource);
    } else {
      img.src = imageSource;
    }
  });
}

// OCR Engine initialization (lazy loaded)
async function initializeOCR(language) {
  if (worker) {
    return worker;
  }

  showProgress('Loading OCR engine (first time only)...', 0);

  const Tesseract = await import('tesseract.js');

  worker = await Tesseract.createWorker(language, 1, {
    workerPath: '/tesseract/worker.min.js',
    langPath: '/tesseract/lang-data',
    corePath: '/tesseract/tesseract-core.wasm.js',
    logger: (m) => {
      if (m.status === 'loading tesseract core') {
        showProgress('Loading OCR engine...', 10);
      } else if (m.status === 'initializing tesseract') {
        showProgress('Initializing...', 20);
      } else if (m.status === 'loading language traineddata') {
        showProgress('Loading language data...', 30);
      } else if (m.status === 'initializing api') {
        showProgress('Preparing...', 50);
      } else if (m.status === 'recognizing text') {
        const percent = 50 + Math.round(m.progress * 50);
        showProgress(`Recognizing text: ${Math.round(m.progress * 100)}%`, percent);
      }
    }
  });

  return worker;
}

// Extract text
async function extractText() {
  if (!currentImage) {
    showError('Please select an image first.');
    return;
  }

  hideError();
  extractBtn.disabled = true;
  results.classList.remove('visible');

  try {
    // Preprocess image
    const processedImage = await preprocessImage(currentImage);

    // Initialize OCR
    await initializeOCR(currentLanguage);

    // Recognize text
    const result = await worker.recognize(processedImage);

    // Show results
    hideProgress();
    outputArea.value = result.data.text.trim();

    // Show confidence
    const confidence = Math.round(result.data.confidence);
    confidenceValue.textContent = confidence + '%';
    confidenceValue.className = 'confidence-value';
    if (confidence >= 80) {
      confidenceValue.classList.add('high');
    } else if (confidence >= 50) {
      confidenceValue.classList.add('medium');
    } else {
      confidenceValue.classList.add('low');
    }

    results.classList.add('visible');
  } catch (err) {
    console.error('OCR Error:', err);
    showError('Failed to extract text: ' + err.message);
    hideProgress();
  } finally {
    extractBtn.disabled = false;
  }
}

// Copy text
async function copyText() {
  const text = outputArea.value;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copyBtn.classList.add('copied');
    copyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied!
    `;
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy Text
      `;
    }, 2000);
  } catch (err) {
    showError('Failed to copy text.');
  }
}

// Download text
function downloadText() {
  const text = outputArea.value;
  if (!text) return;

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'extracted-text.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Progress helpers
function showProgress(text, percent) {
  progressContainer.classList.add('visible');
  progressText.textContent = text;
  progressFill.style.width = percent + '%';
}

function hideProgress() {
  progressContainer.classList.remove('visible');
  progressFill.style.width = '0%';
}

// Error helpers
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('visible');
}

function hideError() {
  errorMessage.classList.remove('visible');
}

// Initialize on load
init();
