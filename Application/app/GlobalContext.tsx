import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import { request, check, PERMISSIONS, RESULTS } from "react-native-permissions";
const GlobalContext = createContext<any>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [permissions, setPermissions] = useState(false);

    const requestPermissions = useCallback(async () => {
        if (Platform.OS === "android") {
            const scan = await request(PERMISSIONS.ANDROID.BLUETOOTH_SCAN);
            const connect = await request(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
            const location = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

            if (scan === RESULTS.GRANTED && connect === RESULTS.GRANTED && location === RESULTS.GRANTED) {
                setPermissions(true);
            } else {
                setPermissions(false);
            }
        } else {
            setPermissions(true); // iOS or anything else i guess
        }
    }, []);

    // request user permissions on mount, update the state once requested
    useEffect(() => {
        requestPermissions();
    }, [requestPermissions]);

    // check for permission changes every 2 seconds in case user manually changes them
    useEffect(() => {
        const interval = setInterval(async () => {
            if (!permissions) {
                const scan = await check(PERMISSIONS.ANDROID.BLUETOOTH_SCAN);
                const connect = await check(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
                const location = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

                if (scan === RESULTS.GRANTED && connect === RESULTS.GRANTED && location === RESULTS.GRANTED) {
                    setPermissions(true);
                } else {
                    setPermissions(false);
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [requestPermissions]);

    return (
        <GlobalContext.Provider value={{ permissions, requestPermissions }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobal = () => {
    const ctx = useContext(GlobalContext);
    if (!ctx) throw new Error("useGlobal should be used within a GlobalProvider!!!!");

    return ctx;
};