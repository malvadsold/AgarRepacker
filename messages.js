const Cell = require('./cell')
const Protocol = require('./protocol')

class ClientSide {
    static ProtocolVersion(number){
        return new Uint8Array([254,number,0,0,0])
    }
    static SendVersionInt(version){
        const Packet = new DataView(new ArrayBuffer(5))
        Packet.setUint8(0, 255)
        Packet.setUint32(1, version, true)
        return new Uint8Array(Packet.buffer)
    }
    static spawnPacket(nick){
        const Buffer = [0]
        nick = unescape(encodeURIComponent(nick))
        for(let i = 0; i < nick.length; i++) Buffer.push(nick.charCodeAt(i))
        return new Uint8Array(Buffer)
    }
    static moveTo(x, y, key){
        const Packet = new DataView(new ArrayBuffer(13))
        let Offset = 0
        Packet.setUint8(Offset, 16)
        Offset += 1
        Packet.setInt32(Offset, x , true)
        Offset += 4
        Packet.setInt32(Offset, y, true)
        Offset += 4
        Packet.setUint32(Offset, key, true)
        return new Uint8Array(Packet.buffer)
    }
    static sendSpectate(){
        return new Uint8Array([1])
    }
    static sendSplit(){
        return new Uint8Array([17])
    }
    static sendEject(){
        return new Uint8Array([21])
    }
}
class ServerSide {
    static HandleMyCells(MyCells, packet){
        const node = packet.getUint32(1, true)
        MyCells[node] = node
        return MyCells
    }
    static HandleWorldUpdate(cells, MyCells, removeNodes, packet, off){
        const length = packet.getUint16(off, true)
        off += 2 + 8 * length
        while(true){
            const id = packet.getUint32(off, true)
            off += 4
            if(id == 0) break
            let flags = 0
            let cell = {}
            cell.id = id
            cell.x = packet.getInt32(off, true)
            off += 4
            cell.y = packet.getInt32(off, true)
            off += 4
            let size = packet.getUint16(off, true)
            off += 2
            flags = packet.getUint8(off++)
            cell.flags = flags
            cell.size = size
            if(flags & 128) cell.extendedFlags = packet.getUint8(off++)
            if(cell.flags & 1) cell.isVirus = true
            if(cell.flags & 2){
                const r = packet.getUint8(off++)
                const g = packet.getUint8(off++) 
                const b = packet.getUint8(off++) 
                cell.r = r
                cell.g = g
                cell.b = b
            }
            let name = ''
            let skin = ''
            if (cell.flags & 4) {
                while (true) {
                    let char = packet.getUint8(off++)
                    if (char == 0) break
                    skin += String.fromCharCode(char)
                }
            }
            if (cell.flags & 8) {
                while (true) {
                    let char = packet.getUint8(off++)
                    if (char == 0) break
                    name += String.fromCharCode(char)
                }
            }
            cell.skin = skin
            cell.name = decodeURIComponent(escape(name))
            if (cell.flags & 16) cell.isAgitated = true
            if (cell.flags & 32) cell.isEjected = true
            if (cell.flags & 64) cell.isEnemyEject = true
            if(cell.extendedFlags & 1) cell.isPellet = true
            if(cell.extendedFlags & 4) off += 4
            if(cells[id]){
                cells[id].x = cell.x
                cells[id].y = cell.y
                cells[id].setSize(cell.size)
            } else {
                cells[id] = new Cell
                cells[id].id = id
                cells[id].x = cell.x
                cells[id].y = cell.y
                cells[id].flags = cell.flags
                cells[id].extendedFlags = cell.extendedFlags
                cells[id].isVirus = cell.isVirus
                cells[id].isAgitated = cell.isAgitated
                cells[id].isEjected = cell.isEjected
                cells[id].isEnemyEject = cell.isEnemyEject
                cells[id].isPellet = cell.isPellet
                cells[id].setSize(cell.size)
                cells[id].setColor(cell.r, cell.g, cell.b)
                cells[id].setStrings(cell.skin, cell.name)
            }
        }
        const removeLength = packet.getUint16(off, true)
        off += 2
        for (let i = 0; i < removeLength; i++) {
            const node = packet.getUint32(off, true)
            off += 4;
            removeNodes[node] = node
            if (cells[node]) delete cells[node]
            if (MyCells[node]) delete MyCells[node]
        }
        return {cells, MyCells, removeNodes}
    }
    static HandlePacket241(packet, AgarVersion, host){
        let off = 1
        const movementKey = packet.getInt32(off, true)
        const decryptionKey = movementKey ^ AgarVersion
        off += 4
        let version = ''
        while (true) {
            let charCode = packet.getUint8(off++);
            if (charCode == 0) break;
            version += String.fromCharCode(charCode);
        }
        const encryptionKey = Protocol.murmur2(`${host}${version}`, 255)
        return {movementKey, decryptionKey, encryptionKey}
    }
    static HandleBorderUpdate(borders, packet, off){
        const minx = packet.getFloat64(off, true)
        off += 8
        const miny = packet.getFloat64(off, true)
        off += 8
        const maxx = packet.getFloat64(off, true)
        off += 8
        const maxy = packet.getFloat64(off, true)
        off += 8
        if(~~((maxx - minx) / 1e3) * 1e3 == 14E3 && ~~((maxy - miny) / 1e3) * 1e3 == 14E3){
            borders.minx = minx
            borders.miny = miny
            borders.maxx = maxx
            borders.maxy = maxy
            borders.isOffset = true          
        } else {
            borders.isOffset = false
        }
        return borders
    }
    static HandlePartyLeaderboard(Packet, off, MyName){
        const leaderboard = []
        if(Packet.getUint8(0) == 54){
            off += 2
        }
        while(off < Packet.byteLength){
            let flags = Packet.getUint8(off++)
            if(flags & 0x01) Packet.getUint8(off++)
            let name = ''
            if(flags & 0x02){
                while (true) {
                    let char = Packet.getUint8(off++)
                    if (char == 0) break
                    name += String.fromCharCode(char)
                }
            }
            name = decodeURIComponent(escape(name))
            name == '' ? name = 'An unnamed cell' : name = name
            if(flags & 0x04) off += 4
            if(flags & 0x08) name = MyName
            leaderboard.push(name)
        }
        return leaderboard
    }
}

module.exports = {
    ClientSide,
    ServerSide
}