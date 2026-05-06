import React, { useState, useCallback, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { 
  Upload, 
  Download, 
  Settings2, 
  CheckCircle2, 
  X, 
  Image as ImageIcon,
  Type,
  Layout,
  RefreshCw,
  Plus,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from './lib/utils';

// --- Types ---

interface ProcessedImage {
  id: string;
  originalName: string;
  originalSize: number;
  originalFile: File;
  compressedFile: File | null;
  compressedSize: number | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  previewUrl: string;
}

interface Settings {
  quality: number;
  maxWidth: number;
  useWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkFontSize: number;
}

// --- Components ---

const AdSlot = ({ className, label }: { className?: string; label: string }) => (
  <div className={cn("bg-gray-100/50 border border-dashed border-gray-200 rounded-xl flex items-center justify-center overflow-hidden min-h-[100px]", className)}>
    <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Advertisement: {label}</div>
  </div>
);

export default function App() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [settings, setSettings] = useState<Settings>({
    quality: 0.8,
    maxWidth: 1920,
    useWatermark: false,
    watermarkText: 'SnapShrink',
    watermarkOpacity: 0.5,
    watermarkFontSize: 32,
  });
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isZh = typeof navigator !== 'undefined' && navigator.language.startsWith('zh');
  
  const helpContent = {
    en: {
      title: "How SnapShrink Works",
      steps: [
        { t: "1. Upload", d: "Drag & drop or select images from your device. We support JPG, PNG, and WebP." },
        { t: "2. Optimize", d: "Adjust quality and resolution. Higher compression means smaller files but lower detail." },
        { t: "3. Watermark", d: "Enable watermark to protect your work with custom text and styling." },
        { t: "4. Pure Privacy", d: "Everything happens in your browser. Your images never touch any server." }
      ],
      close: "Got it"
    },
    zh: {
      title: "使用指南",
      steps: [
        { t: "1. 上传图片", d: "直接拖拽或点击上传。支持 JPG、PNG 及 WebP 格式。" },
        { t: "2. 优化参数", d: "调整质量和分辨率。压缩率越高，体积越小，细节会相应减少。" },
        { t: "3. 添加水印", d: "开启水印功能，自定义文字内容与透明度，保护您的版权。" },
        { t: "4. 隐私安全", d: "所有处理都在本地浏览器完成，图片绝不会上传到服务器。" }
      ],
      close: "了解"
    }
  };

  const content = isZh ? helpContent.zh : helpContent.en;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const addWatermark = async (file: File, text: string, opacity: number, fontSize: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

      // Watermark style
        const baseFontSize = fontSize;
        // Make font size somewhat relative to image width but capped
        const finalFontSize = Math.max(12, (canvas.width / 1000) * baseFontSize);
        
        ctx.font = `600 ${finalFontSize}px sans-serif`;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = Math.max(2, finalFontSize / 8);
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        const padding = finalFontSize;
        ctx.fillText(text, canvas.width - padding, canvas.height - padding);

        canvas.toBlob((blob) => {
          if (!blob) return reject('Blob creation failed');
          const watermarkedFile = new File([blob], file.name, { type: file.type });
          resolve(watermarkedFile);
        }, file.type);
      };
      img.onerror = reject;
    });
  };

  const processImage = async (img: ProcessedImage, currentSettings: Settings) => {
    try {
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'processing' } : i));

      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: currentSettings.maxWidth,
        useWebWorker: true,
        initialQuality: currentSettings.quality,
      };

      let compressedFile = await imageCompression(img.originalFile, options);

      if (currentSettings.useWatermark) {
        compressedFile = await addWatermark(
          compressedFile, 
          currentSettings.watermarkText, 
          currentSettings.watermarkOpacity,
          currentSettings.watermarkFontSize
        );
      }

      setImages(prev => prev.map(i => i.id === img.id ? { 
        ...i, 
        status: 'done', 
        compressedFile, 
        compressedSize: compressedFile.size,
        previewUrl: URL.createObjectURL(compressedFile)
      } : i));
    } catch (error) {
      console.error(error);
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'error' } : i));
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages: ProcessedImage[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(7),
      originalName: file.name,
      originalSize: file.size,
      originalFile: file,
      compressedFile: null,
      compressedSize: null,
      status: 'pending',
      previewUrl: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const processAll = async () => {
    setIsProcessingAll(true);
    const pending = images.filter(img => img.status === 'pending');
    for (const img of pending) {
      await processImage(img, settings);
    }
    setIsProcessingAll(false);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const downloadAll = async () => {
    const processed = images.filter(img => img.status === 'done' && img.compressedFile);
    
    if (processed.length === 0) return;

    if (processed.length === 1) {
      const img = processed[0];
      saveAs(img.compressedFile!, `compressed_${img.originalName}`);
      return;
    }

    const zip = new JSZip();
    processed.forEach(img => {
      zip.file(`compressed_${img.originalName}`, img.compressedFile!);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'snapshrink_images.zip');
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-blue-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <RefreshCw className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">SnapShrink</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
            <button 
              onClick={() => setShowHelp(true)}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              {isZh ? '使用介绍' : 'How it works'}
            </button>
            <a href="#" className="hover:text-blue-600 transition-colors">{isZh ? '隐私政策' : 'Privacy'}</a>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {isZh ? '添加图片' : 'Add Images'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Main Utility */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Top Banner Ad */}
          <AdSlot label="Top Banner" className="w-full h-[90px]" />

          {/* Upload Area */}
          {images.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border-2 border-dashed border-gray-200 rounded-[32px] p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/10 transition-all group"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload className="text-blue-600 w-10 h-10" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Drop your images here</h2>
              <p className="text-gray-500 max-w-sm">Support JPEG, PNG, and WebP. Your images never leave your browser.</p>
              <input 
                type="file" 
                multiple 
                hidden 
                ref={fileInputRef}
                onChange={(e) => handleFiles(e.target.files)}
                accept="image/*"
              />
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                  Queue ({images.length} files)
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setImages([])}
                    className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                    title="Clear all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <AnimatePresence mode="popLayout">
                {images.map((img) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={img.id}
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={img.previewUrl} className="w-full h-full object-cover" alt="preview" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{img.originalName}</div>
                      <div className="text-xs text-gray-400">
                        {formatSize(img.originalSize)} 
                        {img.compressedSize && (
                          <> → <span className="text-green-600 font-medium">{formatSize(img.compressedSize)}</span></>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {img.status === 'done' && (
                        <button 
                          onClick={() => {
                            if (!img.compressedFile) return;
                            const a = document.createElement('a');
                            a.href = img.previewUrl;
                            a.download = `compressed_${img.originalName}`;
                            a.click();
                          }}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {img.status === 'processing' && (
                        <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      {img.status === 'done' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase tracking-wider">
                            -{Math.round((1 - (img.compressedSize! / img.originalSize)) * 100)}%
                          </span>
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                      )}
                      
                      <button 
                        onClick={() => removeImage(img.id)}
                        className="text-gray-300 hover:text-gray-600 p-2 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <div className="sticky bottom-8 mt-4">
                <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-blue-100 shadow-xl flex items-center justify-between">
                   <div className="flex gap-4">
                    <button 
                      onClick={processAll}
                      disabled={isProcessingAll || images.every(i => i.status === 'done')}
                      className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-200"
                    >
                      {isProcessingAll ? <RefreshCw className="animate-spin w-5 h-5" /> : 'Compress All'}
                    </button>
                    {images.some(i => i.status === 'done') && (
                      <button 
                        onClick={downloadAll}
                        className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-black transition-all flex items-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Download Results
                      </button>
                    )}
                   </div>
                   <div className="text-right px-4 hidden sm:block">
                      <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Files</div>
                      <div className="text-xl font-bold">{images.length}</div>
                   </div>
                </div>
              </div>
              
              <AdSlot label="Content Feed Ad" className="mt-8" />
            </div>
          )}
        </div>

        {/* Right Column: Controls & Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm sticky top-24">
            <div className="flex items-center gap-2 mb-6">
              <Settings2 className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-lg">Compression Settings</h2>
            </div>

            <div className="space-y-8">
              {/* Quality Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-500 uppercase tracking-wider text-xs">Quality</span>
                  <span className="font-bold text-blue-600">{Math.round(settings.quality * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.1"
                  value={settings.quality}
                  onChange={(e) => setSettings({ ...settings, quality: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>SMALLER FILE</span>
                  <span>HIGHER QUALITY</span>
                </div>
              </div>

              {/* Max Width */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-500 uppercase tracking-wider text-xs">Max Resolution</span>
                  </div>
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-gray-300 cursor-help" />
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-gray-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                      Limit the longest edge of the image. "Original" keeps the size as is.
                    </div>
                  </div>
                </div>
                <select 
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 font-medium"
                  value={settings.maxWidth}
                  onChange={(e) => setSettings({ ...settings, maxWidth: parseInt(e.target.value) })}
                >
                  <option value={1080}>1080p (Social Media)</option>
                  <option value={1920}>2K / FHD (Email/Web)</option>
                  <option value={3840}>4K (Print/High Res)</option>
                  <option value={10000}>Original Size</option>
                </select>
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                  Scaling down significantly reduces file size while maintaining visibility for web use.
                </p>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Watermark Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-500 uppercase tracking-wider text-xs">Watermark</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.useWatermark}
                      onChange={(e) => setSettings({ ...settings, useWatermark: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.useWatermark && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-2"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Watermark Text</label>
                      <input 
                        type="text" 
                        value={settings.watermarkText}
                        onChange={(e) => setSettings({ ...settings, watermarkText: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100"
                        placeholder="Enter text..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Font Size</label>
                          <input 
                            type="number" 
                            value={settings.watermarkFontSize}
                            onChange={(e) => setSettings({ ...settings, watermarkFontSize: parseInt(e.target.value) })}
                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Opacity</label>
                          <input 
                            type="number" 
                            step="0.1"
                            min="0"
                            max="1"
                            value={settings.watermarkOpacity}
                            onChange={(e) => setSettings({ ...settings, watermarkOpacity: parseFloat(e.target.value) })}
                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100"
                          />
                       </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
            
            <div className="mt-8">
              <AdSlot label="Sidebar Utility Ad" className="h-[250px]" />
            </div>
          </div>
          
          {/* Footer micro-info */}
          <div className="px-4 text-[11px] text-gray-400 font-medium text-center space-y-2 uppercase tracking-tighter">
            <p>© 2026 SnapShrink. Local-first Image Processing.</p>
            <div className="flex justify-center gap-4">
              <a href="#" className="hover:text-gray-600 transition-colors">Cookies</a>
              <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
            </div>
          </div>
        </div>

      </main>

      {/* How it Works Modal */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] p-8 lg:p-12 max-w-2xl w-full shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setShowHelp(false)}
                className="absolute top-6 right-6 p-2 text-gray-300 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-3xl font-bold mb-8">{content.title}</h2>
              
              <div className="grid sm:grid-cols-2 gap-8 mb-10">
                {content.steps.map((step, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <h3 className="font-bold text-lg">{step.t}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.d}</p>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowHelp(false)}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-colors"
              >
                {content.close}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
