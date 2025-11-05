import React from "react";
import { TouchableOpacity } from "react-native";
import { Feather } from '@expo/vector-icons';
import { useRouter } from "expo-router";

export default function Back({ action, location = null, force = false }: { action: 'back' | 'go', location?: string | null, force?: boolean }) {
    const router = useRouter();

    return (
        <TouchableOpacity style={{ position: "absolute", left: 15, top: 50 }} onPress={() => {
            if (action === 'back') {
                router.back();
            } else if (action === 'go' && location) {
                if (force) {
                    router.replace(location as never);
                } else {
                    router.push(location as never);
                }
            }
        }}>
            <Feather name="chevron-left" size={30} color="#fff" />
        </TouchableOpacity>
    );
};