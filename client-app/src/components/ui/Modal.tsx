import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export default function Modal({ isOpen, onClose, children, style }: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay open" onClick={handleBackdropClick}>
      <div className="modal" style={style}>
        {children}
      </div>
    </div>
  );
}
