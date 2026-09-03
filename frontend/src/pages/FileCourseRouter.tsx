import { useSearchParams } from 'react-router-dom';
import FileCodingPage from './FileCodingPage';
import UXLightPage from '../ux-light/UXLightPage';
import { getSavedPlayerUI, savePlayerUI, type PlayerUI } from '../ux-light/uiPreference';

export default function FileCourseRouter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('ui') as PlayerUI | null;

  const ui: PlayerUI = requested === 'light' || requested === 'classic' ? requested : getSavedPlayerUI();

  const onSwitchTo = (next: PlayerUI) => {
    savePlayerUI(next);
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
