const BinaryWriter = require('./BinaryWriter.js');

class Repacker {
    static RepackWorldUpdate(cells, removeNodes) {
        const writer = new BinaryWriter()
        writer.writeUInt8(16)
        writer.writeUInt16(0)
        for (let id in cells) {
            const cell = cells[id]
            let flags = 0
            if (cell.isVirus) flags |= 1
            if (cell.flags & 2) flags |= 2
            if (cell.flags & 4) flags |= 4
            if (cell.flags & 8) flags |= 8
            if (cell.flags & 16) flags |= 16
            if (cell.flags & 32) flags |= 32
            writer.writeUInt32(id)
            writer.writeInt32(cell.x)
            writer.writeInt32(cell.y)
            writer.writeInt16(cell.size)
            writer.writeUInt8(cell.r)
            writer.writeUInt8(cell.g)
            writer.writeUInt8(cell.b)
            writer.writeUInt8(flags)
            if (flags & 2) writer.writeUInt32(0)
            if (flags & 4) {
                for (let i = 0; i < cell.skin.length; i++) {
                    writer.writeUInt8(cell.skin.charCodeAt(i))
                }
                writer.writeUInt8(0)
            }
            if (flags & 8) {
                for (let i = 0; i < cell.nick.length; i++) {
                    writer.writeUInt16(cell.nick.charCodeAt(i))
                }
                writer.writeUInt16(0)
            } else {
                writer.writeUInt16(0)
            }
        }
        writer.writeUInt32(0)
        writer.writeUInt32(Object.keys(removeNodes).length)
        for (let id in removeNodes) {
            writer.writeUInt32(id)
        }
        return new Uint8Array(writer.packet).buffer
    }
    static RepackLeaderboard(leaderboard){
        let length = 0
        if(leaderboard.length < 10) length = leaderboard.length
        else length = 10
        const Writer = new BinaryWriter()
        Writer.writeUInt8(49)
        Writer.writeUInt32(length)
        for(let i = 0; i < length; i++){
            Writer.writeUInt32(0)
            for(let u = 0; u < leaderboard[i].length; u++) Writer.writeUInt16(leaderboard[i].charCodeAt(u))
            Writer.writeUInt16(0)
        }
        return new Uint8Array(Writer.packet).buffer
    }
}
module.exports = Repacker