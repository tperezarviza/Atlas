import { Group, Panel, useDefaultLayout } from 'react-resizable-panels';
import PanelHandle from './PanelHandle';
import CollapsiblePanel from './CollapsiblePanel';
import { useLayoutConfig } from '../../hooks/useLayoutConfig';

interface DashboardLayoutProps {
  r2c1: React.ReactNode;
  map: React.ReactNode;
  r2c3: React.ReactNode;
  r3c1: React.ReactNode;
  r3c2Left: React.ReactNode;
  r3c2Right: React.ReactNode;
  r3c3: React.ReactNode;
  kioskActive?: boolean;
  panelKeyPrefix?: string;
}

export default function DashboardLayout({
  r2c1,
  map,
  r2c3,
  r3c1,
  r3c2Left,
  r3c2Right,
  r3c3,
  kioskActive = false,
  panelKeyPrefix = '',
}: DashboardLayoutProps) {
  const { isCollapsed, setCollapsed } = useLayoutConfig();

  const canCollapse = !kioskActive;
  const canResize = !kioskActive;

  const pk = (key: string) => `${panelKeyPrefix}${key}`;

  // Persistence hooks
  const rowsLayout = useDefaultLayout({ id: 'atlas-rows-v1' });
  const row2Layout = useDefaultLayout({ id: 'atlas-row2-v1' });
  const row3Layout = useDefaultLayout({ id: 'atlas-row3-v1' });
  const r3c2Layout = useDefaultLayout({ id: 'atlas-r3c2-v1' });

  return (
    <Group
      orientation="vertical"
      defaultLayout={rowsLayout.defaultLayout}
      onLayoutChanged={rowsLayout.onLayoutChanged}
    >
      {/* Row 2 */}
      <Panel id="row2" defaultSize="55%"  minSize="25%">
        <Group
          orientation="horizontal"
          defaultLayout={row2Layout.defaultLayout}
          onLayoutChanged={row2Layout.onLayoutChanged}
        >
          <CollapsiblePanel
            defaultSize="20%"
            minSize="10%"
            collapsible={canCollapse}
            collapsedSize="2%"
            panelId="r2c1"
            collapsed={isCollapsed(pk('r2c1'))}
            onCollapse={() => setCollapsed(pk('r2c1'), true)}
            onExpand={() => setCollapsed(pk('r2c1'), false)}
            title="Left Panel"
          >
            {r2c1}
          </CollapsiblePanel>

          <PanelHandle disabled={!canResize} />

          <Panel id="r2-map" defaultSize="60%" minSize="30%">
            {map}
          </Panel>

          <PanelHandle disabled={!canResize} />

          <CollapsiblePanel
            defaultSize="20%"
            minSize="10%"
            collapsible={canCollapse}
            collapsedSize="2%"
            panelId="r2c3"
            collapsed={isCollapsed(pk('r2c3'))}
            onCollapse={() => setCollapsed(pk('r2c3'), true)}
            onExpand={() => setCollapsed(pk('r2c3'), false)}
            title="Right Panel"
          >
            {r2c3}
          </CollapsiblePanel>
        </Group>
      </Panel>

      {/* Vertical handle between rows */}
      <PanelHandle direction="vertical" disabled={!canResize} />

      {/* Row 3 */}
      <Panel id="row3" defaultSize="45%" minSize="20%">
        <Group
          orientation="horizontal"
          defaultLayout={row3Layout.defaultLayout}
          onLayoutChanged={row3Layout.onLayoutChanged}
        >
          <CollapsiblePanel
            defaultSize="25%"
            minSize="10%"
            collapsible={canCollapse}
            collapsedSize="2%"
            panelId="r3c1"
            collapsed={isCollapsed(pk('r3c1'))}
            onCollapse={() => setCollapsed(pk('r3c1'), true)}
            onExpand={() => setCollapsed(pk('r3c1'), false)}
            title="Conflicts"
          >
            {r3c1}
          </CollapsiblePanel>

          <PanelHandle disabled={!canResize} />

          <Panel id="r3c2" defaultSize="45%" minSize="15%">
            <div className="h-full rounded-[14px] overflow-hidden panel-glow" style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,200,50,0.10)' }}>
              <Group
                orientation="horizontal"
                defaultLayout={r3c2Layout.defaultLayout}
                onLayoutChanged={r3c2Layout.onLayoutChanged}
              >
                <Panel id="r3c2-left" defaultSize="50%" minSize="20%">
                  {r3c2Left}
                </Panel>
                <PanelHandle disabled={!canResize} />
                <Panel id="r3c2-right" defaultSize="50%" minSize="20%">
                  {r3c2Right}
                </Panel>
              </Group>
            </div>
          </Panel>

          <PanelHandle disabled={!canResize} />

          <CollapsiblePanel
            defaultSize="30%"
            minSize="10%"
            collapsible={canCollapse}
            collapsedSize="2%"
            panelId="r3c3"
            collapsed={isCollapsed(pk('r3c3'))}
            onCollapse={() => setCollapsed(pk('r3c3'), true)}
            onExpand={() => setCollapsed(pk('r3c3'), false)}
            title="AI Brief"
          >
            {r3c3}
          </CollapsiblePanel>
        </Group>
      </Panel>
    </Group>
  );
}
