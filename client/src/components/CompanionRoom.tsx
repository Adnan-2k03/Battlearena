import { CompanionRoomScene } from './CompanionRoomScene';

interface CompanionRoomProps {
  laptopId: string;
  onBack: () => void;
}

export function CompanionRoom({ laptopId, onBack }: CompanionRoomProps) {
  return <CompanionRoomScene laptopId={laptopId} onBack={onBack} />;
}
