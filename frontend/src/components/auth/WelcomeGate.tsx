import { useState } from 'react';
import { isLocalHost } from '../../isLocalHost';
import { AuthModal } from './AuthModal';
import { LocalWelcome } from './LocalWelcome';

interface WelcomeGateProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeGate({ isOpen, onClose }: WelcomeGateProps) {
  const [useFullAuth, setUseFullAuth] = useState(!isLocalHost());

  if (useFullAuth) {
    return <AuthModal isOpen={isOpen} onClose={onClose} />;
  }

  return (
    <LocalWelcome
      isOpen={isOpen}
      onClose={onClose}
      onForbidden={() => setUseFullAuth(true)}
    />
  );
}
