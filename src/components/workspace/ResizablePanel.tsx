import React, { useState, useRef, useCallback } from 'react';

interface ResizablePanelProps {
  direction: 'horizontal' | 'vertical';
  initialSize: number; // in pixels
  minSize: number;
  maxSize: number;
  sidebarPosition: 'left' | 'right' | 'bottom';
  children: React.ReactNode;
  className?: string;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  direction,
  initialSize,
  minSize,
  maxSize,
  sidebarPosition,
  children,
  className = ''
}) => {
  const [size, setSize] = useState(initialSize);
  const isResizing = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    
    if (direction === 'horizontal') {
      startPos.current = e.clientX;
    } else {
      startPos.current = e.clientY;
    }
    
    startSize.current = size;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
  }, [direction, size]);

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    
    let delta = 0;
    if (direction === 'horizontal') {
      delta = e.clientX - startPos.current;
      if (sidebarPosition === 'right') {
        delta = -delta; // Dragging left increases right-sidebar width
      }
    } else {
      delta = e.clientY - startPos.current;
      if (sidebarPosition === 'bottom') {
        delta = -delta; // Dragging up increases bottom panel height
      }
    }

    const newSize = Math.max(minSize, Math.min(maxSize, startSize.current + delta));
    setSize(newSize);
  }, [direction, sidebarPosition, minSize, maxSize]);

  const stopResize = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
  }, [handleResize]);

  // Styles depending on panels
  const panelStyle: React.CSSProperties = {};
  if (direction === 'horizontal') {
    panelStyle.width = `${size}px`;
  } else {
    panelStyle.height = `${size}px`;
  }

  return (
    <div
      style={panelStyle}
      className={`relative flex-shrink-0 flex transition-colors duration-150 ${className}`}
    >
      {/* Panel Children */}
      <div className="w-full h-full overflow-hidden flex flex-col">
        {children}
      </div>

      {/* Resize Handle Gutter Overlay */}
      {direction === 'horizontal' && sidebarPosition === 'left' && (
        <div
          onMouseDown={startResize}
          className="absolute top-0 bottom-0 right-0 w-1.5 cursor-col-resize hover:bg-brand-blue/70 active:bg-brand-blue z-20 group"
          title="Drag to resize panel"
        >
          <div className="w-0.5 h-full bg-gray-250 dark:bg-gray-800 group-hover:bg-brand-blue/80 transition-colors mx-auto" />
        </div>
      )}

      {direction === 'horizontal' && sidebarPosition === 'right' && (
        <div
          onMouseDown={startResize}
          className="absolute top-0 bottom-0 left-0 w-1.5 cursor-col-resize hover:bg-brand-blue/70 active:bg-brand-blue z-20 group"
          title="Drag to resize panel"
        >
          <div className="w-0.5 h-full bg-gray-250 dark:bg-gray-800 group-hover:bg-brand-blue/80 transition-colors mx-auto" />
        </div>
      )}

      {direction === 'vertical' && sidebarPosition === 'bottom' && (
        <div
          onMouseDown={startResize}
          className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize hover:bg-brand-blue/70 active:bg-brand-blue z-20 group"
          title="Drag to resize panel"
        >
          <div className="h-0.5 w-full bg-gray-250 dark:bg-gray-800 group-hover:bg-brand-blue/80 transition-colors my-auto" />
        </div>
      )}
    </div>
  );
};
export default ResizablePanel;
