import { createContext, useContext } from 'react';

export const ParentStudentContext = createContext(null);
export const useParentStudent = () => useContext(ParentStudentContext);
