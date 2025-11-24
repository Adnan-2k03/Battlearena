import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { getMapById, ELEMENT_COLORS, ELEMENT_ICONS } from '@/lib/data/maps';

type Element = 'fire' | 'water' | 'leaf' | 'light' | 'darkness' | 'space';

interface AdminControlPanelProps {
  socket: Socket | null;
  roomId: string;
  myTeam: 'blue' | 'red' | null;
  selectedMap?: string;
  enemyPlayers: Array<{
    id: string;
    nickname: string;
    team: 'blue' | 'red';
    role: 'striker' | 'guardian';
  }>;
}

interface AdminSettings {
  unlimitedEnemyHealth: boolean;
  enemyBarrierElement: Element | null;
  enemyBarrierStrength: number;
  godMode: boolean;
  instantCharge: boolean;
}

export function AdminControlPanel({ socket, roomId, myTeam, selectedMap, enemyPlayers }: AdminControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>({
    unlimitedEnemyHealth: false,
    enemyBarrierElement: null,
    enemyBarrierStrength: 100,
    godMode: false,
    instantCharge: false
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('admin_settings_updated', ({ adminSettings }: { adminSettings: AdminSettings }) => {
      setSettings(adminSettings);
    });

    socket.on('admin_error', ({ message }: { message: string }) => {
      alert(`Admin Error: ${message}`);
    });

    return () => {
      socket.off('admin_settings_updated');
      socket.off('admin_error');
    };
  }, [socket]);

  const updateSetting = (key: keyof AdminSettings, value: any) => {
    console.log('Admin updateSetting called:', key, value, 'roomId:', roomId, 'socket:', !!socket);
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    if (socket && roomId) {
      console.log('Emitting admin_update_settings event');
      socket.emit('admin_update_settings', { roomId, settings: { [key]: value } });
    } else {
      console.error('Cannot update settings - missing socket or roomId');
    }
  };

  const controlBot = (botId: string, action: 'trigger_attack' | 'trigger_barrier') => {
    console.log('Admin controlBot called:', botId, action, 'roomId:', roomId, 'socket:', !!socket);
    if (socket && roomId) {
      console.log('Emitting admin_control_bot event');
      socket.emit('admin_control_bot', { roomId, botId, action });
    } else {
      console.error('Cannot control bot - missing socket or roomId');
    }
  };

  if (!isOpen) {
    return (
      <div style={{
        position: 'fixed',
        top: '60px',
        right: '10px',
        zIndex: 1000,
        pointerEvents: 'auto'
      }}>
        <button
          onClick={() => {
            console.log('Admin Controls button clicked - opening panel');
            setIsOpen(true);
          }}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            pointerEvents: 'auto'
          }}
        >
          ⚡ Admin Controls
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      right: '10px',
      background: 'rgba(20, 20, 40, 0.95)',
      border: '2px solid rgba(102, 126, 234, 0.5)',
      borderRadius: '12px',
      padding: '20px',
      maxWidth: '400px',
      maxHeight: '75vh',
      overflowY: 'auto',
      zIndex: 1000,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      color: '#fff',
      pointerEvents: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>⚡ Admin Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '16px'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
          padding: '14px',
          borderRadius: '10px',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#fca5a5', fontWeight: 'bold' }}>⚔️ Enemy Team Controls</h4>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.unlimitedEnemyHealth}
              onChange={(e) => updateSetting('unlimitedEnemyHealth', e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ fontSize: '13px' }}>Unlimited Enemy Health</span>
          </label>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Enemy Barrier Element:
            </label>
            <select
              value={settings.enemyBarrierElement || ''}
              onChange={(e) => updateSetting('enemyBarrierElement', e.target.value || null)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                background: settings.enemyBarrierElement 
                  ? `${ELEMENT_COLORS[settings.enemyBarrierElement]}33`
                  : 'rgba(255, 255, 255, 0.1)',
                border: settings.enemyBarrierElement 
                  ? `2px solid ${ELEMENT_COLORS[settings.enemyBarrierElement]}`
                  : '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="" style={{ background: '#1e293b', color: '#94a3b8' }}>None</option>
              {(() => {
                const mapData = getMapById(selectedMap || 'elemental_arena');
                const elements = mapData?.elements || ['fire', 'water', 'leaf'];
                return elements.map((element) => (
                  <option 
                    key={element} 
                    value={element} 
                    style={{ background: '#1e293b', color: ELEMENT_COLORS[element] }}
                  >
                    {ELEMENT_ICONS[element]} {element.charAt(0).toUpperCase() + element.slice(1)}
                  </option>
                ));
              })()}
            </select>
          </div>

          {settings.enemyBarrierElement && (
            <div>
              <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px' }}>
                Barrier Strength: {settings.enemyBarrierStrength}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.enemyBarrierStrength}
                onChange={(e) => updateSetting('enemyBarrierStrength', parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
          padding: '14px',
          borderRadius: '10px',
          border: '1px solid rgba(167, 139, 250, 0.3)'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#c4b5fd', fontWeight: 'bold' }}>🤖 Control Enemy Bots</h4>
          {enemyPlayers.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>No enemy players to control</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {enemyPlayers.map(player => (
                <div key={player.id} style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ fontSize: '12px', marginBottom: '6px', fontWeight: 'bold' }}>
                    {player.nickname} ({player.role})
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => controlBot(player.id, 'trigger_attack')}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      ⚔️ Attack
                    </button>
                    <button
                      onClick={() => controlBot(player.id, 'trigger_barrier')}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      🛡️ Barrier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)',
          padding: '14px',
          borderRadius: '10px',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#86efac', fontWeight: 'bold' }}>👤 Player Controls</h4>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.godMode}
              onChange={(e) => updateSetting('godMode', e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ fontSize: '13px' }}>God Mode (Unlimited HP)</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.instantCharge}
              onChange={(e) => updateSetting('instantCharge', e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ fontSize: '13px' }}>Instant Element Charge</span>
          </label>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(202, 138, 4, 0.05) 100%)',
          padding: '14px',
          borderRadius: '10px',
          border: '1px solid rgba(234, 179, 8, 0.3)'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#fde047', fontWeight: 'bold' }}>🎮 Match Controls</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => {
                if (window.confirm('Reset both teams to full HP and clear shields?')) {
                  socket?.emit('admin_reset_match', { roomId });
                }
              }}
              style={{
                padding: '8px',
                background: '#eab308',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              🔄 Reset Match
            </button>
            <button
              onClick={() => {
                if (window.confirm('End the match immediately with your team as winner?')) {
                  socket?.emit('admin_force_win', { roomId });
                }
              }}
              style={{
                padding: '8px',
                background: '#f59e0b',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              🏆 Force Win
            </button>
          </div>
        </div>

        <div style={{
          background: 'rgba(100, 200, 255, 0.1)',
          padding: '10px',
          borderRadius: '6px',
          border: '1px solid rgba(100, 200, 255, 0.3)',
          fontSize: '11px',
          color: '#93c5fd'
        }}>
          💡 <strong>Admin Tips:</strong>
          <ul style={{ margin: '5px 0 0 0', paddingLeft: '15px' }}>
            <li>Unlimited element energy (no charging needed)</li>
            <li>Use God Mode to prevent damage to your team</li>
            <li>Control enemy bots to test different scenarios</li>
            <li>Reset match to practice specific situations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
