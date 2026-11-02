import React from 'react';
import { VidyutFlowAuthModal } from './VidyutFlowAuthModal';

/**
 * RoleWelcomeModal is preserved as a drop-in component that renders the
 * redesigned institutional VidyutFlowAuthModal.
 */
export const RoleWelcomeModal: React.FC = () => {
  return <VidyutFlowAuthModal />;
};

export default RoleWelcomeModal;
