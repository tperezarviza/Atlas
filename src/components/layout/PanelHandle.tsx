import { Separator } from 'react-resizable-panels';

interface PanelHandleProps {
  direction?: 'horizontal' | 'vertical';
  disabled?: boolean;
}

export default function PanelHandle({ direction = 'horizontal', disabled = false }: PanelHandleProps) {
  return (
    <Separator
      disabled={disabled}
      className={`atlas-resize-handle ${direction === 'vertical' ? 'atlas-resize-handle-vertical' : 'atlas-resize-handle-horizontal'}`}
    />
  );
}
