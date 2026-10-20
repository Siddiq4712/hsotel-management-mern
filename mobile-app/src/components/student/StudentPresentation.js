import { createContext, useContext } from 'react';
import { useIsFocused } from '@react-navigation/native';

// A presentation-only boundary: embedded workflow screens share one header.
export const StudentPresentation = createContext({ embedded: false, active: true });
export const useStudentPresentation = () => useContext(StudentPresentation);

// Hidden workflow panels stay mounted to retain drafts, but need no live work.
export const useStudentVisible = () => {
  const { active = true } = useStudentPresentation();
  const focused = useIsFocused();
  return active && focused;
};
