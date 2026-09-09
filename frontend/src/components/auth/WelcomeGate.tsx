import { SituationalProfileBuilder } from './SituationalProfileBuilder';
import { LocalWelcome } from './LocalWelcome';

interface WelcomeGateProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'ai' | 'modalities' | 'customization';
}

export function WelcomeGate({ isOpen, onClose, initialTab }: WelcomeGateProps) {
  // If the user specifically opened AI setup or modalities guide, show the studio tabs
  if (initialTab === 'ai' || initialTab === 'modalities' || initialTab === 'customization') {
    return (
      <LocalWelcome
        isOpen={isOpen}
        onClose={onClose}
        initialTab={initialTab}
      />
    );
  }

  return (
    <SituationalProfileBuilder
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}
