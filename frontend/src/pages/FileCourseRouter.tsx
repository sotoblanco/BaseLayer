import { useSearchParams } from 'react-router-dom';
import FileCodingPage from './FileCodingPage';
import UXLightPage from '../ux-light/UXLightPage';
import { getSavedPlayerUI, savePlayerUI, type PlayerUI } from '../ux-light/uiPreference';
import { emitLearnerEvent } from '../services/profileService';

export default function FileCourseRouter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('ui') as PlayerUI | null;

  const ui: PlayerUI = requested === 'light' || requested === 'classic' ? requested : getSavedPlayerUI();

  const onSwitchTo = (next: PlayerUI) => {
    savePlayerUI(next);
    // Explicit player switch is the ONLY writer of preferred_ui.
    // Opening a lesson never sends `ui`, so this choice sticks.
    void emitLearnerEvent('lesson_opened', { ui: next });
    const params = new URLSearchParams(searchParams);
    params.set('ui', next);
    setSearchParams(params, { replace: true });
  };

  return ui === 'light' ? (
    <UXLightPage onSwitchUi={() => onSwitchTo('classic')} />
  ) : (
    <FileCodingPage onSwitchUi={() => onSwitchTo('light')} />
  );
}
