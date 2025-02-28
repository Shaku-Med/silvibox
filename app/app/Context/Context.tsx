import { createContext, useContext } from "react";

export const AuthContext = createContext<any>(null)
export function handleAuthContext(){
    return useContext(AuthContext)
}