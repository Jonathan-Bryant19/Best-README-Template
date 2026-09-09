// Minimal WAV handling, so assembling a chapter needs no audio tooling at all.
//
// Every piece of a chapter track is 16-bit PCM at one sample rate, which means
// silence and concatenation are just byte math — and durations come out exact
// rather than parsed out of some tool's log output.

const HEADER_SIZE = 44;

export function parseWav(buffer) {
  if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Not a RIFF/WAVE file');
  }

  let offset = 12;
  let format = null;
  let data = null;

  // Walk the chunks rather than assuming a 44-byte header: real encoders like to
  // slip LIST/fact chunks in front of the data.
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;

    if (id === 'fmt ') {
      format = {
        audioFormat: buffer.readUInt16LE(body),
        channels: buffer.readUInt16LE(body + 2),
        sampleRate: buffer.readUInt32LE(body + 4),
        bitsPerSample: buffer.readUInt16LE(body + 14)
      };
    } else if (id === 'data') {
      data = { offset: body, length: Math.min(size, buffer.length - body) };
    }

    offset = body + size + (size % 2); // chunks are word-aligned
    if (format && data) break;
  }

  if (!format || !data) throw new Error('WAV file is missing its fmt or data chunk');
  return { ...format, dataOffset: data.offset, dataLength: data.length };
}

export function wavDuration(buffer) {
  const { sampleRate, channels, bitsPerSample, dataLength } = parseWav(buffer);
  return dataLength / (sampleRate * channels * (bitsPerSample / 8));
}

export function matchesFormat(buffer, { sampleRate, channels = 1, bitsPerSample = 16 }) {
  const info = parseWav(buffer);
  return (
    info.audioFormat === 1 &&
    info.sampleRate === sampleRate &&
    info.channels === channels &&
    info.bitsPerSample === bitsPerSample
  );
}

function header({ sampleRate, channels, bitsPerSample, dataLength }) {
  const buf = Buffer.alloc(HEADER_SIZE);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);

  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataLength, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);           // fmt chunk size
  buf.writeUInt16LE(1, 20);            // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(channels * (bitsPerSample / 8), 32); // block align
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataLength, 40);
  return buf;
}

/** Silence of an exact length, rounded to a whole number of samples. */
export function silenceWav(seconds, { sampleRate, channels = 1, bitsPerSample = 16 }) {
  const frames = Math.max(0, Math.round(seconds * sampleRate));
  const dataLength = frames * channels * (bitsPerSample / 8);
  // Buffer.alloc zero-fills, and zero is silence for signed 16-bit PCM.
  return Buffer.concat([header({ sampleRate, channels, bitsPerSample, dataLength }), Buffer.alloc(dataLength)]);
}

/** Joins WAV buffers that already share a format into one file. */
export function concatWavs(buffers, { sampleRate, channels = 1, bitsPerSample = 16 }) {
  const bodies = buffers.map((buffer) => {
    const { dataOffset, dataLength } = parseWav(buffer);
    return buffer.subarray(dataOffset, dataOffset + dataLength);
  });

  const dataLength = bodies.reduce((sum, body) => sum + body.length, 0);
  return Buffer.concat([header({ sampleRate, channels, bitsPerSample, dataLength }), ...bodies]);
}
