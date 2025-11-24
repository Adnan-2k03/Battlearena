import { Socket } from 'socket.io-client';

interface LeaveMatchButtonProps {
  socket: Socket | null;
  roomId: string;
  onLeave?: () => void;
}

export function LeaveMatchButton({ socket, roomId, onLeave }: LeaveMatchButtonProps) {
  const handleLeave = () => {
    const confirmed = window.confirm('Are you sure you want to leave this match?');
    if (!confirmed) return;

    if (socket && roomId) {
      console.log('Emitting leave_match event for roomId:', roomId);
      socket.emit('leave_match', { roomId });
      
      if (onLeave) {
        onLeave();
      }
    }
  };

  return (
    <button
      onClick={handleLeave}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '12px 24px',
        background: 'rgba(239, 68, 68, 0.9)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '8px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        zIndex: 999,
        transition: 'all 0.2s',
        pointerEvents: 'auto'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(220, 38, 38, 0.95)';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      🚪 Leave Match
    </button>
  );
}
