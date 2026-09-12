import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, Search, AlertCircle } from 'lucide-react';
import { db } from '../../lib/storage';
import { ProductVariant } from '../../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (variant: ProductVariant) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setManualCode('');
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCamera(true);
        setCameraError(null);
      } else {
        setCameraError("Caméra non disponible sur cet appareil ou permission restreinte.");
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError("Impossible d'activer la caméra. Vous pouvez saisir le code manuellement.");
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleSearchCode = (codeToSearch?: string) => {
    const code = (codeToSearch || manualCode).trim();
    if (!code) return;

    const variants = db.getVariants();
    const found = variants.find(
      v => (v.barcode && v.barcode.toLowerCase() === code.toLowerCase()) ||
           (v.sku && v.sku.toLowerCase() === code.toLowerCase())
    );

    if (found) {
      onSelectProduct(found);
      onClose();
    } else {
      alert(`Aucun produit trouvé avec le code: ${code}`);
    }
  };

  if (!isOpen) return null;

  const quickSamples = db.getVariants().slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Scanner Code-Barres / SKU
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Caméra ou saisie manuelle rapide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport or Fallback */}
        <div className="relative bg-slate-950 h-56 flex items-center justify-center overflow-hidden">
          {hasCamera ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan target overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-28 border-2 border-dashed border-emerald-400 rounded-2xl relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-500 shadow-sm animate-pulse" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
              <p className="text-xs text-slate-300 max-w-xs">{cameraError || "Caméra désactivée"}</p>
              <span className="text-[11px] text-slate-500 mt-1">Utilisez la recherche ci-dessous</span>
            </div>
          )}
        </div>

        {/* Manual Code Entry */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Saisie Manuelle (Code-barres ou Réf SKU)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchCode()}
                  placeholder="Ex: CHEV-FR-250 ou 613000..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearchCode()}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm rounded-xl flex items-center gap-1.5 transition active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Valider</span>
              </button>
            </div>
          </div>

          {/* Quick select test references */}
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
              Accès rapide test :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickSamples.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    onSelectProduct(v);
                    onClose();
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition text-left"
                >
                  <span className="font-semibold">{v.sku}</span> · {v.name.substring(0, 18)}...
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
