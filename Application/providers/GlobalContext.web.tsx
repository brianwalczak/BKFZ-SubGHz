import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "expo-router";
import { buildPacket, parsePacket } from './packets.js';
const GlobalContext = createContext<any>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [message, setMessage] = useState<[string, string] | null>(null);
    const settingsRef = React.useRef<{ [key: string]: any }>(null);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);

    const router = useRouter();
    const pathname = usePathname();
    const dataCallbacks = React.useRef<{ [event: string]: ((data?: any) => void)[] }>({});

    const registerEvent = useCallback((url: string, cb: (data: any) => void) => {
        if (!dataCallbacks.current[url]) {
            dataCallbacks.current[url] = [];
        }

        dataCallbacks.current[url].push(cb);
        return {
            remove: () => {
                dataCallbacks.current[url] = dataCallbacks.current[url].filter(callback => callback !== cb);
            }
        };
    }, []);

    const disconnectDevice = useCallback(async () => {
        if (!isConnected) return false;

        try {
            ws.current?.close();
            setIsConnected(false);
            return true;
        } catch {
            return false;
        }
    }, [isConnected]);

    const connectDevice = useCallback(async () => {
        if (isConnected) return await disconnectDevice();
        ws.current = new WebSocket(`ws://${window.location.host}/ws`);

        ws.current.onopen = async () => {
            setIsConnected(true);
            ws.current?.send(buildPacket("/settings", { method: 'get' }));
        };

        ws.current.onmessage = async function (event) {
            try {
                const buffer = await event.data.arrayBuffer();
                const chunk = new Uint8Array(buffer);

                if (chunk.length >= 2) {
                    const parsed = parsePacket(chunk.buffer);

                    if (parsed.page && dataCallbacks.current[parsed.page]) {
                        dataCallbacks.current[parsed.page].forEach(cb => cb(parsed.data));
                    }

                    if (parsed?.page === "/settings") {
                        settingsRef.current = parsed?.data || null;
                    }
                }
            } catch { };
        };

        ws.current.onclose = function (event) {
            ws.current = null;
            setIsConnected(false);
        };
    }, [isConnected, disconnectDevice]);

    const sendData = useCallback(async (payload: { page: string, data: object }) => {
        if (!isConnected) return false;

        try {
            const packet = buildPacket(payload.page, payload.data);

            ws.current?.send(packet);
            return true;
        } catch (err) {
            return false;
        }
    }, [isConnected]);

    const updateSettings = useCallback(async (newSettings: { [key: string]: any }, request: boolean = false) => {
        const hasChanges = Object.keys(newSettings).some(key => newSettings[key] !== settingsRef.current?.[key]);

        if (hasChanges) {
            settingsRef.current = { ...(settingsRef.current || {}), ...newSettings };

            if (request) {
                return await sendData({
                    page: "/settings",
                    data: {
                        method: 'set',
                        payload: Object.keys(newSettings).map(key => ({ key: key, value: newSettings[key] }))
                    }
                });
            }
        }

        return true;
    }, [sendData]);

    useEffect(() => {
        if (isConnected && pathname === "/") {
            router.replace("/home"); // navigate to home page
        } else if (!isConnected && pathname !== "/") {
            router.replace("/"); // start connection flow again
        }
    }, [isConnected, pathname, router]);

    return (
        <GlobalContext.Provider value={{ settings: settingsRef.current, updateSettings, connectDevice, disconnectDevice, sendData, registerEvent, message, setMessage }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobal = () => {
    const ctx = useContext(GlobalContext);
    if (!ctx) throw new Error("useGlobal should be used within a GlobalProvider!!!!");

    return ctx;
};