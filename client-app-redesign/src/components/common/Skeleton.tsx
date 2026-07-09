import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ width, height, borderRadius, className = '' }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? '20px',
    borderRadius: borderRadius ?? '6px'
  };

  return <div className={`${styles.pulse} ${className}`} style={style} />;
}
