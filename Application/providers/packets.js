export const Command = Object.freeze({
    SETTINGS: 0x01,
    ANALYZER: 0x02,
    RECORD: 0x03,
    PLAY: 0x04,
    GRAPH: 0x05
});

export const SettingsCmdOut = Object.freeze({
    SETTING_PRESET: 0x01,
    SETTING_FREQUENCY: 0x02,
    SETTING_RSSI: 0x03,
    SETTING_DETECT_RSSI: 0x04
});

export const SettingsMethodCmdOut = Object.freeze({
    SETTINGS: 0x01,
    OPTIONS: 0x02,
    STATUS: 0x03,
    UPDATE: 0x04
});

function readString(dv, offset, maxLen) {
    let str = "";

    for (let i = 0; i < maxLen; i++) {
        const b = dv.getUint8(offset + i);
        if (b === 0) break;

        str += String.fromCharCode(b);
    }

    return str;
}

function parseSettings(buffer) {
    const dv = new DataView(buffer);

    return {
        page: '/settings',
        data: {
            preset: readString(dv, 3, 8), // start at byte 3, next 8 bytes
            frequency: dv.getUint32(11, true), // start at byte 11, read uint32
            rssi: dv.getInt8(15), // start at byte 15, read int8
            detect_rssi: dv.getInt8(17) // start at byte 17, read int8
        }
    };
}

function parseAnalyzer(buffer) {
    const dv = new DataView(buffer);

    return {
        page: '/analyzer',
        data: {
            frequency: dv.getUint32(3, true), // start at byte 3, read uint32
            rssi: dv.getInt8(7) // start at byte 7, read int8
        }
    };
}

function parseRecord(buffer) {
    const dv = new DataView(buffer);

    try {
        const numSamples = (dv.getUint16(0, true) - 3) / 2; // get size of packet, subtract header, divide by 2 bytes (per sample)
        const samples = [];

        for (let i = 0; i < numSamples; i++) {
            samples.push(dv.getInt16(3 + i * 2, true));
        }

        return {
            page: '/record',
            data: {
                success: true,
                samples: samples
            }
        };
    } catch {
        return {
            page: '/record',
            data: { success: false }
        };
    }
}

function parsePlay(buffer) {
    const dv = new DataView(buffer);

    return {
        page: '/play',
        data: {
            success: !!dv.getUint8(3) // start at byte 3, read uint8
        }
    };
}

function parseGraph(buffer) {
    const dv = new DataView(buffer);
    const numValues = (dv.getUint16(0, true) - 5) / 2; // get size of packet, subtract header + length, divide by 2 bytes (per sample)
    const values = [];

    for (let i = 0; i < numValues; i++) {
        values.push(dv.getInt16(5 + i * 2, true));
    }

    return {
        page: '/graph',
        data: {
            length: dv.getUint16(3, true), // start at byte 3, read uint16
            values: values
        }
    };
}

const parsers = {
    [Command.SETTINGS]: parseSettings,
    [Command.ANALYZER]: parseAnalyzer,
    [Command.RECORD]: parseRecord,
    [Command.PLAY]: parsePlay,
    [Command.GRAPH]: parseGraph
};

export function parsePacket(buffer) {
    try {
        if (Array.isArray(buffer)) {
            buffer = new Uint8Array(buffer).buffer;
        }

        const dv = new DataView(buffer);
        const cmd = dv.getUint8(2); // goes after length
        const parser = parsers[cmd];

        return parser ? parser(buffer) : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}