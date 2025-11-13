// -- Builders -- //

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
    GET: 0x01,
    SET: 0x02
});

function encodeSettings(payload) {
    const parsed = [];

    for (const { key, value } of payload) {
        let cmd = key === 'preset' ? SettingsCmdOut.SETTING_PRESET
            : key === 'frequency' ? SettingsCmdOut.SETTING_FREQUENCY
            : key === 'rssi' ? SettingsCmdOut.SETTING_RSSI
            : key === 'detect_rssi' ? SettingsCmdOut.SETTING_DETECT_RSSI
            : null;
        if (cmd === null) continue;
        parsed.push(cmd);

        if (typeof value === "string") {
            const enc = new TextEncoder();
            const bytes = enc.encode(value);

            parsed.push(...bytes, 0);
        } else if (typeof value === "number") {
            const dv = new DataView(new ArrayBuffer(4));
            dv.setUint32(0, value, true);

            parsed.push(...new Uint8Array(dv.buffer));
        } else if (typeof value === "boolean") {
            parsed.push(value ? 1 : 0);
        } else if (value instanceof Uint8Array) {
            parsed.push(...value);
        }
    }

    return new Uint8Array(parsed);
}

function encodeSamples(samples) {
    const buffer = new ArrayBuffer(samples.length * 2); // int16_t = 2 bytes
    const dv = new DataView(buffer);

    samples.forEach((sample, index) => {
        dv.setInt16(index * 2, sample, true);
    });

    return new Uint8Array(buffer);
}

function buildSettings({ method, payload = null }) {
    let dataBytes = new Uint8Array(0);
    method = method === 'set' ? SettingsMethodCmdOut.SET : SettingsMethodCmdOut.GET;

    if (method === SettingsMethodCmdOut.SET && payload) {
        dataBytes = encodeSettings(payload);
    }

    const totalLength = 2 + 1 + 1 + dataBytes.length; // p_len, cmd, method, data (if exists ofc)
    const buffer = new ArrayBuffer(totalLength);
    const dv = new DataView(buffer);
    let offset = 0;

    dv.setUint16(offset, totalLength, true);
    offset += 2;
    
    dv.setUint8(offset++, Command.SETTINGS);
    dv.setUint8(offset++, method);

    const final = new Uint8Array(buffer);
    final.set(dataBytes, offset);
    return final;
}

function buildActivity(type, { active }) { // record AND play
    let dataBytes = new Uint8Array(0);

    const totalLength = 2 + 1 + 1; // p_len, cmd, active
    const buffer = new ArrayBuffer(totalLength);
    const dv = new DataView(buffer);
    let offset = 0;

    dv.setUint16(offset, totalLength, true);
    offset += 2;
    
    dv.setUint8(offset++, type);
    dv.setUint8(offset++, (active ? 1 : 0));

    const final = new Uint8Array(buffer);
    final.set(dataBytes, offset);
    return final;
}

function buildPlay({ length, frequency, preset, samples }) {
    const sampleBytes = encodeSamples(samples);

    const totalLength = 2 + 1 + 2 + 4 + 8 + sampleBytes.length; // p_len, cmd, length, frequency, preset, samples
    const buffer = new ArrayBuffer(totalLength);
    const dv = new DataView(buffer);
    let offset = 0;

    dv.setUint16(offset, totalLength, true);
    offset += 2;
    
    dv.setUint8(offset++, Command.PLAY);

    dv.setUint16(offset, length, true);
    offset += 2;

    dv.setUint32(offset, frequency, true);
    offset += 4;

    const enc = new TextEncoder();
    const padded = new Uint8Array(8);
    padded.set(enc.encode(preset).slice(0, 7)); // ensure null-term

    const final = new Uint8Array(buffer);
    final.set(padded, offset);
    offset += 8;

    final.set(sampleBytes, offset);
    return final;
}

// -- Parsers -- //

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
            detect_rssi: dv.getInt8(16) // start at byte 16, read int8
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
        const numSamples = (dv.getUint16(0, true) - 15) / 2; // get size of packet, subtract header + settings, divide by 2 bytes (per sample)
        const samples = [];

        for (let i = 0; i < numSamples; i++) {
            samples.push(dv.getInt16(15 + i * 2, true));
        }

        return {
            page: '/record',
            data: {
                success: true,
                preset: readString(dv, 3, 8), // start at byte 3, next 8 bytes
                frequency: dv.getUint32(11, true), // start at byte 11, read uint32
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

const builders = {
    ["/settings"]: buildSettings,
    ["/analyzer"]: (data) => buildActivity(Command.ANALYZER, data),
    ["/record"]: (data) => buildActivity(Command.RECORD, data),
    ["/play"]: buildPlay
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

export function buildPacket(type, data) {
    const builder = builders[type];
    return builder ? builder(data) : null;
}