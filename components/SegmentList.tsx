'use client';

// SegmentList Component - Display and manage street segments
import { useState } from 'react';

export interface Segment {
  id: string;
  street_nom?: string;
  cote: 'pair' | 'impair' | 'both';
  longueur_m: number;
  statut: 'non_fait' | 'en_cours' | 'fait';
  ordre_visite?: number;
  geom?: any;
}

export interface SegmentListProps {
  segments: Segment[];
  onSegmentClick?: (segment: Segment) => void;
  onSegmentHover?: (segment: Segment | null) => void;
  highlightedSegmentId?: string;
  showCompleted?: boolean;
}

export default function SegmentList({
  segments,
  onSegmentClick,
  onSegmentHover,
  highlightedSegmentId,
  showCompleted = true,
}: SegmentListProps) {
  const [filter, setFilter] = useState<'all' | 'pair' | 'impair'>('all');
  const [sortBy, setSortBy] = useState<'order' | 'name' | 'length'>('order');

  // Filter segments
  const filteredSegments = segments.filter((seg) => {
    if (!showCompleted && seg.statut === 'fait') return false;
    if (filter === 'all') return true;
    return seg.cote === filter;
  });

  // Sort segments
  const sortedSegments = [...filteredSegments].sort((a, b) => {
    if (sortBy === 'order') {
      const orderA = a.ordre_visite ?? 999999;
      const orderB = b.ordre_visite ?? 999999;
      return orderA - orderB;
    } else if (sortBy === 'name') {
      return (a.street_nom || '').localeCompare(b.street_nom || '');
    } else {
      return b.longueur_m - a.longueur_m;
    }
  });

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'fait':
        return '#4caf50';
      case 'en_cours':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'fait':
        return 'Fait';
      case 'en_cours':
        return 'En cours';
      default:
        return 'À faire';
    }
  };

  const getCoteLabel = (cote: string) => {
    switch (cote) {
      case 'pair':
        return 'Pair';
      case 'impair':
        return 'Impair';
      default:
        return 'Les deux';
    }
  };

  const getCoteColor = (cote: string) => {
    switch (cote) {
      case 'pair':
        return '#2196f3';
      case 'impair':
        return '#f44336';
      default:
        return '#607d8b';
    }
  };

  const stats = {
    total: segments.length,
    completed: segments.filter((s) => s.statut === 'fait').length,
    inProgress: segments.filter((s) => s.statut === 'en_cours').length,
    remaining: segments.filter((s) => s.statut === 'non_fait').length,
    totalLength: segments.reduce((sum, s) => sum + s.longueur_m, 0),
  };

  return (
    <div className="segment-list" style={{ padding: '20px' }}>
      <div className="segment-list-header" style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>Segments de rue</h2>

        {/* Statistics */}
        <div
          className="stats"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Total</div>
          </div>
          <div style={{ background: '#e8f5e9', padding: '10px', borderRadius: '5px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
              {stats.completed}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Fait</div>
          </div>
          <div style={{ background: '#fff3e0', padding: '10px', borderRadius: '5px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>
              {stats.inProgress}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>En cours</div>
          </div>
          <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {(stats.totalLength / 1000).toFixed(1)} km
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Distance</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#666', marginRight: '5px' }}>
              Côté:
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              style={{
                padding: '5px 10px',
                borderRadius: '5px',
                border: '1px solid #ddd',
              }}
            >
              <option value="all">Tous</option>
              <option value="pair">Pair</option>
              <option value="impair">Impair</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#666', marginRight: '5px' }}>
              Trier par:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '5px 10px',
                borderRadius: '5px',
                border: '1px solid #ddd',
              }}
            >
              <option value="order">Ordre de visite</option>
              <option value="name">Nom de rue</option>
              <option value="length">Longueur</option>
            </select>
          </div>
        </div>
      </div>

      {/* Segment list */}
      <div
        className="segment-items"
        style={{
          maxHeight: '500px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '5px',
        }}
      >
        {sortedSegments.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            Aucun segment trouvé
          </div>
        ) : (
          sortedSegments.map((segment, index) => (
            <div
              key={segment.id}
              className="segment-item"
              style={{
                padding: '12px',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                background:
                  highlightedSegmentId === segment.id ? '#e3f2fd' : 'transparent',
                transition: 'background 0.2s',
              }}
              onClick={() => onSegmentClick?.(segment)}
              onMouseEnter={() => onSegmentHover?.(segment)}
              onMouseLeave={() => onSegmentHover?.(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Order number */}
                <div
                  style={{
                    minWidth: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#3388ff',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {segment.ordre_visite || index + 1}
                </div>

                {/* Street info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    {segment.street_nom || 'Sans nom'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', display: 'flex', gap: '10px' }}>
                    <span
                      style={{
                        background: getCoteColor(segment.cote),
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '3px',
                      }}
                    >
                      {getCoteLabel(segment.cote)}
                    </span>
                    <span>{Math.round(segment.longueur_m)} m</span>
                  </div>
                </div>

                {/* Status */}
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: '3px',
                    fontSize: '12px',
                    background: getStatusColor(segment.statut),
                    color: 'white',
                    fontWeight: '500',
                  }}
                >
                  {getStatusLabel(segment.statut)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
