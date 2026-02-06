// Browser-compatible MIDI Parser
export class MIDIParser {
    constructor() {
        this.tracks = [];
        this.duration = 0;
        this.ticksPerBeat = 480;
        this.tempo = 500000; // Default 120 BPM in microseconds per beat
    }

    async loadFromArrayBuffer(arrayBuffer) {
        const data = new Uint8Array(arrayBuffer);
        let offset = 0;

        // Read header chunk
        const headerChunk = this.readString(data, offset, 4);
        if (headerChunk !== 'MThd') {
            throw new Error('Invalid MIDI file: Missing MThd header');
        }
        offset += 4;

        const headerLength = this.readUint32(data, offset);
        offset += 4;

        const format = this.readUint16(data, offset);
        offset += 2;

        const numTracks = this.readUint16(data, offset);
        offset += 2;

        this.ticksPerBeat = this.readUint16(data, offset);
        offset += 2;

        // Skip any extra header bytes
        offset += headerLength - 6;

        // Read track chunks
        this.tracks = [];
        for (let t = 0; t < numTracks; t++) {
            const trackChunk = this.readString(data, offset, 4);
            if (trackChunk !== 'MTrk') {
                throw new Error('Invalid MIDI file: Missing MTrk header');
            }
            offset += 4;

            const trackLength = this.readUint32(data, offset);
            offset += 4;

            const trackEnd = offset + trackLength;
            const track = { notes: [], events: [] };
            let currentTime = 0;
            let runningStatus = 0;
            const activeNotes = {};

            while (offset < trackEnd) {
                const deltaTime = this.readVariableLength(data, offset);
                offset = deltaTime.newOffset;
                currentTime += deltaTime.value;

                let statusByte = data[offset];
                if (statusByte < 0x80) {
                    // Running status
                    statusByte = runningStatus;
                } else {
                    offset++;
                    if (statusByte < 0xF0) {
                        runningStatus = statusByte;
                    }
                }

                const eventType = statusByte & 0xF0;
                const channel = statusByte & 0x0F;

                if (eventType === 0x90) {
                    // Note On
                    const note = data[offset++];
                    const velocity = data[offset++];
                    if (velocity > 0) {
                        activeNotes[`${channel}-${note}`] = {
                            midi: note,
                            velocity: velocity / 127,
                            startTick: currentTime,
                            channel
                        };
                    } else {
                        // Note On with velocity 0 = Note Off
                        this.endNote(track, activeNotes, channel, note, currentTime);
                    }
                } else if (eventType === 0x80) {
                    // Note Off
                    const note = data[offset++];
                    offset++; // velocity (ignored for note off)
                    this.endNote(track, activeNotes, channel, note, currentTime);
                } else if (eventType === 0xA0 || eventType === 0xB0 || eventType === 0xE0) {
                    // Polyphonic Pressure, Control Change, Pitch Bend (2 data bytes)
                    offset += 2;
                } else if (eventType === 0xC0 || eventType === 0xD0) {
                    // Program Change, Channel Pressure (1 data byte)
                    offset += 1;
                } else if (statusByte === 0xFF) {
                    // Meta event
                    const metaType = data[offset++];
                    const metaLength = this.readVariableLength(data, offset);
                    offset = metaLength.newOffset;

                    if (metaType === 0x51 && metaLength.value === 3) {
                        // Tempo
                        this.tempo = (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
                    }
                    offset += metaLength.value;
                } else if (statusByte === 0xF0 || statusByte === 0xF7) {
                    // SysEx
                    const sysexLength = this.readVariableLength(data, offset);
                    offset = sysexLength.newOffset + sysexLength.value;
                } else {
                    // Unknown event, try to skip
                    break;
                }
            }

            // End any remaining active notes
            for (const key in activeNotes) {
                const noteData = activeNotes[key];
                track.notes.push({
                    midi: noteData.midi,
                    velocity: noteData.velocity,
                    time: this.ticksToSeconds(noteData.startTick),
                    duration: this.ticksToSeconds(currentTime - noteData.startTick)
                });
            }

            this.tracks.push(track);
            offset = trackEnd;
        }

        // Calculate total duration
        this.duration = 0;
        for (const track of this.tracks) {
            for (const note of track.notes) {
                const endTime = note.time + note.duration;
                if (endTime > this.duration) {
                    this.duration = endTime;
                }
            }
        }

        return this;
    }

    endNote(track, activeNotes, channel, note, currentTime) {
        const key = `${channel}-${note}`;
        if (activeNotes[key]) {
            const noteData = activeNotes[key];
            track.notes.push({
                midi: noteData.midi,
                velocity: noteData.velocity,
                time: this.ticksToSeconds(noteData.startTick),
                duration: this.ticksToSeconds(currentTime - noteData.startTick)
            });
            delete activeNotes[key];
        }
    }

    ticksToSeconds(ticks) {
        return (ticks / this.ticksPerBeat) * (this.tempo / 1000000);
    }

    readString(data, offset, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            str += String.fromCharCode(data[offset + i]);
        }
        return str;
    }

    readUint32(data, offset) {
        return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    }

    readUint16(data, offset) {
        return (data[offset] << 8) | data[offset + 1];
    }

    readVariableLength(data, offset) {
        let value = 0;
        let byte;
        do {
            byte = data[offset++];
            value = (value << 7) | (byte & 0x7F);
        } while (byte & 0x80);
        return { value, newOffset: offset };
    }

    async addLog(message, type = 'info') {
        const logOutput = document.getElementById('logOutput');
        if (!logOutput) return;
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        const timestamp = new Date().toLocaleTimeString();
        line.textContent = `[${timestamp}] ${message}`;
        logOutput.appendChild(line);
        logOutput.scrollTop = logOutput.scrollHeight;
    }
}
