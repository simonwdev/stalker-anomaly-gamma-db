/**
 * LZO1X decompressor — pure JavaScript, browser-compatible.
 *
 * Implements the LZO1X decompression algorithm based on the public
 * stream format specification by Markus F.X.J. Oberhumer.
 */
const LZO1X = (() => {
    "use strict";

    const M2_MAX_OFFSET = 0x0800;

    /**
     * Decompress an LZO1X-compressed buffer.
     * @param {Uint8Array} src  Compressed input bytes.
     * @param {number} dstLen   Expected decompressed size in bytes.
     * @returns {Uint8Array}    Decompressed output.
     * @throws {Error}          On malformed input.
     */
    function decompress(src, dstLen) {
        const dst = new Uint8Array(dstLen);
        let ip = 0;
        let op = 0;
        let t;

        // State: 0 = top of outer loop (literal run expected)
        //        1 = in match loop (match instruction expected)
        let state = 0;

        t = src[ip++];

        // Handle first byte > 17
        if (t > 17) {
            const n = t - 17;
            for (let i = 0; i < n; i++) dst[op++] = src[ip++];
            if (n >= 4) {
                // first_literal_run:
                t = src[ip++];
                if (t < 16) {
                    // Special far M1 after first literal run
                    const off = (1 + M2_MAX_OFFSET) + (t >> 2) + (src[ip++] << 2);
                    let p = op - off;
                    dst[op++] = dst[p++]; dst[op++] = dst[p++]; dst[op++] = dst[p];
                    t = src[ip - 2] & 3;
                    if (t === 0) {
                        t = src[ip++];
                        state = 0;
                    } else {
                        for (let i = 0; i < t; i++) dst[op++] = src[ip++];
                        t = src[ip++];
                        state = 1;
                    }
                } else {
                    state = 1; // t >= 16, enter match loop
                }
            } else {
                // n < 4: match_next trailer
                t = src[ip++];
                state = 1; // enter match loop
            }
        } else {
            state = 0; // t <= 17, outer loop
        }

        for (;;) {
            if (state === 0) {
                // Outer loop: expect literal run (t < 16) or match (t >= 16)
                if (t >= 16) {
                    state = 1;
                    continue;
                }
                // Literal run
                let litLen;
                if (t === 0) {
                    litLen = 15;
                    while (src[ip] === 0) { litLen += 255; ip++; }
                    litLen += src[ip++];
                } else {
                    litLen = t;
                }
                // Copy litLen + 3 bytes
                const total = litLen + 3;
                for (let i = 0; i < total; i++) dst[op++] = src[ip++];

                // first_literal_run:
                t = src[ip++];
                if (t >= 16) {
                    state = 1;
                    continue;
                }
                // Special far M1 after literal run
                const off = (1 + M2_MAX_OFFSET) + (t >> 2) + (src[ip++] << 2);
                let p = op - off;
                dst[op++] = dst[p++]; dst[op++] = dst[p++]; dst[op++] = dst[p];
                // match_done
                t = src[ip - 2] & 3;
                if (t === 0) {
                    t = src[ip++];
                    state = 0;
                    continue;
                }
                for (let i = 0; i < t; i++) dst[op++] = src[ip++];
                t = src[ip++];
                state = 1;
                continue;
            }

            // state === 1: Match loop
            if (t >= 64) {
                // M2 match
                const off = 1 + ((t >> 2) & 7) + (src[ip++] << 3);
                const mLen = (t >> 5) - 1;
                let p = op - off;
                dst[op++] = dst[p++]; dst[op++] = dst[p++];
                for (let i = 0; i < mLen; i++) dst[op++] = dst[p++];
            } else if (t >= 32) {
                // M3 match
                let mLen = t & 31;
                if (mLen === 0) {
                    mLen = 31;
                    while (src[ip] === 0) { mLen += 255; ip++; }
                    mLen += src[ip++];
                }
                const off = 1 + (src[ip] >> 2) + (src[ip + 1] << 6);
                ip += 2;
                let p = op - off;
                dst[op++] = dst[p++]; dst[op++] = dst[p++];
                for (let i = 0; i < mLen; i++) dst[op++] = dst[p++];
            } else if (t >= 16) {
                // M4 match
                let mOff = (t & 8) << 11;
                let mLen = t & 7;
                if (mLen === 0) {
                    mLen = 7;
                    while (src[ip] === 0) { mLen += 255; ip++; }
                    mLen += src[ip++];
                }
                mOff += (src[ip] >> 2) + (src[ip + 1] << 6);
                ip += 2;
                if (mOff === 0) {
                    // EOF
                    return dst.subarray(0, op);
                }
                mOff += 0x4000;
                let p = op - mOff;
                dst[op++] = dst[p++]; dst[op++] = dst[p++];
                for (let i = 0; i < mLen; i++) dst[op++] = dst[p++];
            } else {
                // M1 match (t < 16 in match context)
                const off = 1 + (t >> 2) + (src[ip++] << 2);
                let p = op - off;
                dst[op++] = dst[p++]; dst[op++] = dst[p];
                // match_done for M1 (2-byte copy)
                t = src[ip - 2] & 3;
                if (t === 0) {
                    t = src[ip++];
                    state = 0;
                    continue;
                }
                for (let i = 0; i < t; i++) dst[op++] = src[ip++];
                t = src[ip++];
                continue; // stay in match loop
            }

            // match_done for M2, M3, M4
            t = src[ip - 2] & 3;
            if (t === 0) {
                t = src[ip++];
                state = 0;
                continue;
            }
            // match_next: copy trail literals
            for (let i = 0; i < t; i++) dst[op++] = src[ip++];
            t = src[ip++];
            // stay in match loop (state = 1)
        }
    }

    return { decompress };
})();

if (typeof module !== "undefined" && module.exports) module.exports = LZO1X;
globalThis.LZO1X = LZO1X;
