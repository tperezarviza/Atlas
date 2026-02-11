import { useState } from 'react'
import TopBar from './components/TopBar'
import LeaderFeed from './components/LeaderFeed'
import WorldMap from './components/WorldMap'
import MarketsDashboard from './components/MarketsDashboard'
import ConflictList from './components/ConflictList'
import NewsWire from './components/NewsWire'
import DiplomaticCalendar from './components/DiplomaticCalendar'
import AIBrief from './components/AIBrief'
import Ticker from './components/Ticker'

export default function App() {
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>('c1')

  return (
    <div
      className="h-screen w-screen p-[2px]"
      style={{
        display: 'grid',
        gridTemplateRows: '48px 1fr 1fr 36px',
        gridTemplateColumns: '320px 1fr 340px',
        gap: '2px',
        background: '#030810',
      }}
    >
      {/* Row 1: TopBar spans all columns */}
      <div style={{ gridColumn: '1 / -1' }}>
        <TopBar />
      </div>

      {/* Row 2, Col 1: Leader Feed */}
      <div style={{ gridRow: 2, gridColumn: 1 }}>
        <LeaderFeed />
      </div>

      {/* Row 2, Col 2: World Map */}
      <div style={{ gridRow: 2, gridColumn: 2 }}>
        <WorldMap selectedConflictId={selectedConflictId} onSelectConflict={setSelectedConflictId} />
      </div>

      {/* Row 2, Col 3: Markets */}
      <div style={{ gridRow: 2, gridColumn: 3 }}>
        <MarketsDashboard />
      </div>

      {/* Row 3, Col 1: Conflict List */}
      <div style={{ gridRow: 3, gridColumn: 1 }}>
        <ConflictList selectedId={selectedConflictId} onSelect={setSelectedConflictId} />
      </div>

      {/* Row 3, Col 2: News + Calendar */}
      <div style={{ gridRow: 3, gridColumn: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
        <NewsWire />
        <DiplomaticCalendar />
      </div>

      {/* Row 3, Col 3: AI Brief */}
      <div style={{ gridRow: 3, gridColumn: 3 }}>
        <AIBrief />
      </div>

      {/* Row 4: Ticker spans all columns */}
      <div style={{ gridColumn: '1 / -1' }}>
        <Ticker />
      </div>
    </div>
  )
}
