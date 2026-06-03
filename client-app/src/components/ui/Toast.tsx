import React from 'react';
import { useToast } from '../../context/ToastContext';

export default function Toast() {
  const { toast } = useToast();

  return (
    <div className={`toast ${toast.show ? 'show' : ''}`} id="toast">
      {toast.message}
    </div>
  );
}
