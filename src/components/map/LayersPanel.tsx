interface LayerInfo {
  name: string;
  color: string;
  count: number;
  visible: boolean;
}

interface LayersPanelProps {
  layers: LayerInfo[];
}

export default function LayersPanel({ layers }: LayersPanelProps) {
  const visibleLayers = layers.filter(l => l.visible);

  if (visibleLayers.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      zIndex: 5,
      background: 'rgba(6,8,12,0.88)',
      border: '1px solid rgba(255,200,50,0.12)',
      borderRadius: 8,
      padding: '10px 14px',
    }}>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 12,
        fontWeight: 600,
        color: '#c9a84c',
        letterSpacing: 1.5,
        textTransform: 'uppercase' as const,
        marginBottom: 6,
      }}>
        Active Layers
      </div>
      {visibleLayers.map(layer => (
        <div key={layer.name} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: 'rgba(255,255,255,0.6)',
          padding: '2px 0',
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            flexShrink: 0,
            background: layer.color,
          }} />
          {layer.name} ({layer.count})
        </div>
      ))}
    </div>
  );
}
