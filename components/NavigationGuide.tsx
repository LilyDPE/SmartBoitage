'use client';

// NavigationGuide Component - Real-time turn-by-turn navigation with French voice guidance
import { useState, useEffect, useRef } from 'react';
import { haversineDistance } from '@/lib/geo';

export interface NavigationGuideProps {
  instructions?: any[]; // ORS turn-by-turn instructions
  currentPosition: { lon: number; lat: number } | null;
  route?: any; // GeoJSON LineString
  onInstructionChange?: (instruction: any) => void;
  voiceEnabled?: boolean;
}

export default function NavigationGuide({
  instructions,
  currentPosition,
  route,
  onInstructionChange,
  voiceEnabled = false,
}: NavigationGuideProps) {
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [distanceToNext, setDistanceToNext] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const lastSpokenRef = useRef<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Check if speech synthesis is supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setVoiceSupported(true);
    }
  }, []);

  // Calculate distance to next instruction and ETA
  useEffect(() => {
    if (!currentPosition || !instructions || instructions.length === 0) {
      setDistanceToNext(null);
      setEta(null);
      return;
    }

    const currentInstruction = instructions[currentInstructionIndex];
    if (!currentInstruction || !currentInstruction.way_points) {
      return;
    }

    // Get the position of the next waypoint from route coordinates
    const nextWaypointIndex = currentInstruction.way_points[1] || currentInstruction.way_points[0];
    if (!route || !route.coordinates || nextWaypointIndex >= route.coordinates.length) {
      return;
    }

    const nextPoint = route.coordinates[nextWaypointIndex];

    // Calculate distance from current position to next waypoint
    const distance = haversineDistance(
      currentPosition.lon,
      currentPosition.lat,
      nextPoint[0],
      nextPoint[1]
    );

    setDistanceToNext(distance);

    // Calculate total remaining distance for ETA
    let remainingDistance = distance;
    for (let i = currentInstructionIndex + 1; i < instructions.length; i++) {
      remainingDistance += instructions[i].distance || 0;
    }

    // Estimate time based on realistic door-to-door distribution speed (4500m/h)
    // This accounts for walking + brief stops at each door
    const walkingSpeedMps = 4500 / 3600; // meters per second (~1.25 m/s)
    const estimatedSeconds = remainingDistance / walkingSpeedMps;
    setEta(estimatedSeconds);

  }, [currentPosition, instructions, currentInstructionIndex, route]);

  // Auto-advance to next instruction when close enough
  useEffect(() => {
    if (distanceToNext !== null && distanceToNext < 20 && currentInstructionIndex < (instructions?.length || 0) - 1) {
      // Within 20 meters, advance to next instruction
      const nextIndex = currentInstructionIndex + 1;
      setCurrentInstructionIndex(nextIndex);

      if (onInstructionChange && instructions) {
        onInstructionChange(instructions[nextIndex]);
      }
    }
  }, [distanceToNext, currentInstructionIndex, instructions, onInstructionChange]);

  // Voice guidance
  useEffect(() => {
    if (!voiceEnabled || !voiceSupported || !synthRef.current || !instructions) {
      return;
    }

    const currentInstruction = instructions[currentInstructionIndex];
    if (!currentInstruction || !currentInstruction.instruction) {
      return;
    }

    const instructionText = currentInstruction.instruction;

    // Only speak if it's a new instruction and we're close enough
    if (
      instructionText !== lastSpokenRef.current &&
      distanceToNext !== null &&
      distanceToNext < 100 // Start announcing within 100m
    ) {
      speak(instructionText);
      lastSpokenRef.current = instructionText;
    }
  }, [currentInstructionIndex, instructions, voiceEnabled, voiceSupported, distanceToNext]);

  const speak = (text: string) => {
    if (!synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatETA = (seconds: number): string => {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const getInstructionIcon = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      'turn-right': '➡️',
      'turn-left': '⬅️',
      'turn-sharp-right': '↗️',
      'turn-sharp-left': '↖️',
      'turn-slight-right': '↗️',
      'turn-slight-left': '↖️',
      'continue': '⬆️',
      'straight': '⬆️',
      'arrive': '🏁',
      'depart': '🚀',
      'roundabout': '🔄',
    };

    return iconMap[type] || '📍';
  };

  if (!instructions || instructions.length === 0) {
    return (
      <div className="card" style={{ padding: '15px', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          Aucune instruction de navigation disponible
        </div>
      </div>
    );
  }

  const currentInstruction = instructions[currentInstructionIndex];

  return (
    <div className="navigation-guide">
      {/* Main instruction card */}
      <div className="card" style={{
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        marginBottom: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{
            fontSize: '48px',
            marginRight: '20px',
            filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))',
          }}>
            {getInstructionIcon(currentInstruction.type)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              {currentInstruction.instruction || currentInstruction.name || 'Continuez tout droit'}
            </div>
            {distanceToNext !== null && (
              <div style={{ fontSize: '18px', opacity: 0.9 }}>
                dans {formatDistance(distanceToNext)}
              </div>
            )}
          </div>
        </div>

        {/* ETA and progress */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: '15px',
          borderTop: '1px solid rgba(255,255,255,0.3)',
        }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '3px' }}>
              Temps restant
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {eta !== null ? formatETA(eta) : '--'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '3px' }}>
              Instruction
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {currentInstructionIndex + 1} / {instructions.length}
            </div>
          </div>
          {voiceSupported && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '3px' }}>
                Guidage vocal
              </div>
              <div style={{ fontSize: '20px' }}>
                {speaking ? '🔊' : voiceEnabled ? '🔉' : '🔇'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next instructions preview */}
      {currentInstructionIndex < instructions.length - 1 && (
        <div className="card" style={{ padding: '15px', background: '#f5f5f5' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: '#666' }}>
            ENSUITE
          </div>
          {instructions.slice(currentInstructionIndex + 1, currentInstructionIndex + 3).map((inst, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: idx === 0 ? '1px solid #ddd' : 'none',
              }}
            >
              <div style={{ fontSize: '20px', marginRight: '10px' }}>
                {getInstructionIcon(inst.type)}
              </div>
              <div style={{ flex: 1, fontSize: '14px', color: '#333' }}>
                {inst.instruction || inst.name || 'Continuez'}
              </div>
              {inst.distance && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {formatDistance(inst.distance)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
