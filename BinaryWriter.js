class Writer {
    constructor(){
        this.packet = []
    }
    writeUInt8(byte){
        this.packet.push(byte)
    }
    writeUInt16(data){
        const arr = new Uint8Array(new Uint16Array([data]).buffer)
        for(let i = 0; i < arr.length; i++) this.packet.push(arr[i])
    }
    writeUInt32(data){
        const arr = new Uint8Array(new Uint32Array([data]).buffer)
        for(let i = 0; i < arr.length; i++) this.packet.push(arr[i])
    }
    writeInt16(data){
        const arr = new Uint8Array(new Int16Array([data]).buffer)
        for(let i = 0; i < arr.length; i++) this.packet.push(arr[i])
    }
    writeInt32(data){
        const arr = new Uint8Array(new Int32Array([data]).buffer)
        for(let i = 0; i < arr.length; i++) this.packet.push(arr[i])
    }
}
module.exports = Writer
