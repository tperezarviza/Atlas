import { useCallback } from 'react';
import { Panel, usePanelRef } from 'react-resizable-panels';
import type { PanelImperativeHandle } from 'react-resizable-panels';

interface CollapsiblePanelProps {
  children: React.ReactNode;
  defaultSize?: number | string;
  minSize?: number | string;
  collapsible?: boolean;
  collapsedSize?: number | string;
  panelId?: string;
  onCollapse?: () => void;
  onExpand?: () => void;
  collapsed?: boolean;
  title?: string;
}

export default function CollapsiblePanel({
  children,
  defaultSize,
  minSize = 10,
  collapsible = true,
  collapsedSize = '2%',
  panelId,
  onCollapse,
  onExpand,
  collapsed,
  title,
}: CollapsiblePanelProps) {
  const panelRef = usePanelRef();
  const isCollapsed = collapsed ?? false;

  const handleResize = useCallback((size: { asPercentage: number }) => {
    const collapsedNum = typeof collapsedSize === 'string' ? parseFloat(collapsedSize) : (collapsedSize as number);
    if (size.asPercentage <= collapsedNum + 0.5) {
      onCollapse?.();
    } else {
      onExpand?.();
    }
  }, [collapsedSize, onCollapse, onExpand]);

  const toggleCollapse = useCallback(() => {
    const panel: PanelImperativeHandle | null = panelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [panelRef]);

  return (
    <Panel
      panelRef={panelRef}
      id={panelId}
      defaultSize={defaultSize}
      minSize={minSize}
      collapsible={collapsible}
      collapsedSize={collapsedSize}
      onResize={handleResize}
    >
      <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: '#000000' }}>
        {isCollapsed && collapsible ? (
          <button
            onClick={toggleCollapse}
            className="h-full w-full flex items-center justify-center cursor-pointer"
            style={{
              background: '#000000',
              border: '1px solid rgba(255,200,50,0.10)',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
            }}
            title={`Expand ${title ?? 'panel'}`}
          >
            <span className="font-data text-[9px] tracking-[2px] text-text-muted uppercase">
              {title ?? ''}
            </span>
          </button>
        ) : (
          children
        )}
      </div>
    </Panel>
  );
}
