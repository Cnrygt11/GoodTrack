import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface LightboxProps {
  isOpen: boolean;
  src: string | null;
  onClose: () => void;
  altText?: string;
}

export default function Lightbox({ isOpen, src, onClose, altText }: LightboxProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !src) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className="lightbox-backdrop" onClick={handleBackdropClick}>
      {/* Close Button */}
      <button className="lightbox-close" onClick={onClose} title="Kapat / Close">
        <X size={20} />
      </button>

      {/* Image Container */}
      <div className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
        <img className="lightbox-image" src={src} alt={altText || 'Detailed view'} />
      </div>
    </div>,
    document.body,
  );
}
