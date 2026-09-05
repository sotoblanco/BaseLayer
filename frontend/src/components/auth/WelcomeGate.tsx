import { useState } from 'react';
import { isLocalHost } from '../../isLocalHost';
import { AuthModal } from './AuthModal';
import { LocalWelcome } from './LocalWelcome';

interface WelcomeGateProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'ai' | 'modalities' | 'customization';
}

export function WelcomeGate({ isOpen, onClose, initialTab }: WelcomeGateProps) {
  const [useFullAuth, setUseFullAuth] = useState(!isLocalHost());

  if (useFullAuth) {
    return <AuthModal isOpen={isOpen} onClose={onClose} />;
  }

  return (
    <LocalWelcome
      isOpen={isOpen}
      onClose={onClose}
      initialTab={initialTab}
      onForbidden={() => setUseFullAuth(true)}
    />
  );
}
