import { createContext, useContext } from 'react';

export const StaffWorkspaceContext = createContext(null);
export const useStaffWorkspace = () => useContext(StaffWorkspaceContext);

export const StaffWorkspaceGuardContext = createContext(null);
