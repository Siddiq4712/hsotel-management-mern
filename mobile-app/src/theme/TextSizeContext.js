import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_TEXT_SIZE, textSizeOption } from './typography';
import { createTextSizeStorage } from './textSizeStorage';

const TextSizeContext = createContext({ preference: DEFAULT_TEXT_SIZE, ready: true });
export const useTextSize = () => useContext(TextSizeContext);

export function TextSizeProvider({ children }) {
  const [preference, setPreference] = useState(DEFAULT_TEXT_SIZE);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [preferences] = useState(() => createTextSizeStorage(AsyncStorage));
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    preferences.load()
      .then(value => { if (active) setPreference(value); })
      .catch(() => { if (active) setSaveError('Could not load your saved text size. Choose a size to save it again.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [preferences]);
  const changeTextSize = useCallback(id => {
    const next = textSizeOption(id).id;
    const currentRevision = ++revision.current;
    setPreference(next);
    setSaveError('');
    setSaving(true);
    // Serialize writes so rapid taps cannot persist an older choice last.
    preferences.save(next)
      .catch(() => {
        if (revision.current === currentRevision) setSaveError('Text size changed for this session, but could not be saved. Please try again.');
      })
      .finally(() => { if (revision.current === currentRevision) setSaving(false); });
  }, [preferences]);
  return <TextSizeContext.Provider value={{ preference, ready, saving, saveError, changeTextSize }}>
    {children}
  </TextSizeContext.Provider>;
}
