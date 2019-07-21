class Protocol {
    static versionStringToInt(versionString){
        return parseInt(versionString.split(".")[0]) * 10000 + parseInt(versionString.split(".")[1]) * 100 + parseInt(versionString.split(".")[2])
    }
    static xorBuffer(packet, key){
        const keyBytes = new Uint8Array(new Uint32Array([key]).buffer)
        for(let i = 0; i < packet.length; i++){
            packet[i] ^= keyBytes[i % 4]
        }
        return packet
    }
    static rotateKey(key) {
        key = Math.imul(key, 1540483477) | 0
        key = (Math.imul(key >>> 24 ^ key, 1540483477) | 0) ^ 114296087
        key = Math.imul(key >>> 13 ^ key, 1540483477) | 0
        key = key >>> 15 ^ key
        return key
    }
    static murmur2(str, seed) {
        let l = str.length,
            h = seed ^ l,
            i = 0,
            k;
        while (l >= 4) {
            k =
                ((str.charCodeAt(i) & 0xff)) |
                ((str.charCodeAt(++i) & 0xff) << 8) |
                ((str.charCodeAt(++i) & 0xff) << 16) |
                ((str.charCodeAt(++i) & 0xff) << 24)
            k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16))
            k ^= k >>> 24;
            k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16))
            h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k
            l -= 4
                ++i
        }
        switch (l) {
            case 3:
                h ^= (str.charCodeAt(i + 2) & 0xff) << 16
            case 2:
                h ^= (str.charCodeAt(i + 1) & 0xff) << 8
            case 1:
                h ^= (str.charCodeAt(i) & 0xff)
                h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16))
        }
        h ^= h >>> 13
        h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16))
        h ^= h >>> 15
        return h >>> 0
    }
    static uncompressMessage(input, output){
        for(let i = 0, j = 0, n = input.length; i < n;){
            const token = input[i++]
            let literalsLength = token >> 4
            if(literalsLength > 0){
                let length = literalsLength + 240
                while(length === 255){
                    length = input[i++]
                    literalsLength += length
                }
                const end = i + literalsLength
                while(i < end) output[j++] = input[i++]
                if(i === n) return output
            }
            const offset = input[i++] | (input[i++] << 8)
            if(offset === 0 || offset > j) return -(i - 2)
            let matchLength = token & 15
            let length = matchLength + 240
            while(length === 255){
                length = input[i++]
                matchLength += length
            }
            let pos = j - offset
            const end = j + matchLength + 4
            while(j < end) output[j++] = output[pos++]
        }
        return output
    }
}

module.exports = Protocol
