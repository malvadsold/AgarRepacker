const WebSocket = require("ws")
const fetch = require('node-fetch')
const Protocol = require('./protocol')
const Messages = require('./messages')
const Repacker = require('./repacker')
const Config = require('./Config.json')
const colors = require('colors')
const figlet = require('figlet');

const Player = {
    Client: null,
    socket: null
}

class AgarIO {
    constructor(_callback) {
        this.version = ''
        this.versionInt = 0
        this.ProtocolVersion = 0
        this.getVersion()
    }
    async getVersion() {
        const req = await fetch('https://agar.io/mc/agario.js')
        const res = await req.text()
        this.version = res.match(/var\sversionString="(\d.\d.\d)";/)[1]
        this.versionInt = Protocol.versionStringToInt(this.version)
        this.getProtocolVersion()
    }
    async getProtocolVersion() {
        const req = await fetch('https://agar.io/agario.core.js')
        const res = await req.text()
        this.ProtocolVersion = res.match(/\w\[\w\+\d+>>\d\]=\w;\w+\(\w,(\d+)\);/)[1]
        startProxy()
    }
}

const Agar = new AgarIO()

class AgarPlayer {
    constructor(server) {
        this.server = server
        this.socket = null
        this.cells = {}
        this.MyCells = {}
        this.encryptionKey = 0
        this.decryptionKey = 0
        this.movementKey = 0
        this.removeNodes = {}
        this.borders = {
            minx: 0,
            miny: 0,
            maxx: 0,
            maxy: 0,
            isOffset: false
        }
        this.leaderboard = []
        this.host = server.match(/wss:\/\/(live-arena.+):.+/)[1]
        this.MyName = ''
        this.connect()
    }
    connect() {
        this.socket = new WebSocket(this.server)
        this.socket.binaryType = 'arraybuffer'
        this.socket.onopen = this.onopen.bind(this)
        this.socket.onmessage = this.onmessage.bind(this)
        this.socket.onerror = this.onerror.bind(this)
        this.socket.onclose = this.onclose.bind(this)
    }
    send(packet, sendEncrypted) {
        if (this.socket.readyState == WebSocket.OPEN) {
            if (sendEncrypted) {
                packet = Protocol.xorBuffer(packet, this.encryptionKey)
                this.encryptionKey = Protocol.rotateKey(this.encryptionKey)
                this.socket.send(packet)
            } else {
                this.socket.send(packet)
            }
        }
    }
    sendSpawn(name) {
        this.send(Messages.ClientSide.spawnPacket(name), true)
    }
    sendMove(x, y) {
        this.send(Messages.ClientSide.moveTo(x, y, this.movementKey), true)
    }
    sendSpectate() {
        this.send(Messages.ClientSide.sendSpectate(), true)
    }
    sendSplit() {
        this.send(Messages.ClientSide.sendSplit(), true)
    }
    sendEject() {
        this.send(Messages.ClientSide.sendEject(), true)
    }
    onopen() {
        this.send(Messages.ClientSide.ProtocolVersion(Agar.ProtocolVersion), false)
        this.send(Messages.ClientSide.SendVersionInt(Agar.versionInt), false)
    }
    onmessage(packet) {
        let Packet = new DataView(Protocol.xorBuffer(new Uint8Array(packet.data), this.decryptionKey).buffer)
        let off = 0
        const OpCode = Packet.getUint8(off++)
        switch (OpCode) {
            case 53:
            case 54:
                this.leaderboard = Messages.ServerSide.HandlePartyLeaderboard(Packet, 1, this.MyName)
                Player.socket.send(Repacker.RepackLeaderboard(this.leaderboard))
                break
            case 17:
                Player.socket.send(Packet.buffer)
                break
            case 32:
                this.MyCells = Messages.ServerSide.HandleMyCells(this.MyCells, Packet)
                Player.socket.send(Packet.buffer)
                break
            case 241:
                const response = Messages.ServerSide.HandlePacket241(Packet, Agar.versionInt, this.host)
                this.encryptionKey = response.encryptionKey
                this.decryptionKey = response.decryptionKey
                this.movementKey = response.movementKey
                break
            case 255:
                Packet = new DataView(new Uint8Array(Protocol.uncompressMessage(new Uint8Array(Packet.buffer).slice(5), [])).buffer)
                switch (Packet.getUint8(0)) {
                    case 16:
                        const response = Messages.ServerSide.HandleWorldUpdate(this.cells, this.MyCells, this.removeNodes, Packet, 1)
                        this.cells = response.cells
                        this.MyCells = response.MyCells
                        this.removeNodes = response.removeNodes
                        Player.socket.send(Repacker.RepackWorldUpdate(this.cells, this.removeNodes))
                        this.removeNodes = {}
                        break
                    case 64:
                        this.borders = Messages.ServerSide.HandleBorderUpdate(this.borders, Packet, 1)
                        this.borders.isOffset ? Player.socket.send(Packet.buffer) : false
                        break
                }
                break
        }
    }
    onclose() {}
    onerror() {}
}


const startProxy = () => {
    new WebSocket.Server({
        port: Config.port
    }).on('connection', ws => {
        ws.on('message', msg => {
            const OpCode = msg.readUInt8(0)
            switch (OpCode) {
                case 254:
                    Player.Client = new AgarPlayer(Config.server)
                    Player.socket = ws
                    break
                case 1:
                    Player.Client.sendSpectate()
                    break
                case 0:
                    let name = ''
                    let off = 1
                    for (let i = 0; i < (msg.byteLength - 1) / 2; i++) name += String.fromCharCode(msg.readUInt16LE(off)), off += 2
                    Player.Client.MyName = name
                    Player.Client.sendSpawn(name)
                    break
                case 17:
                    Player.Client.sendSplit()
                    break
                case 21:
                    Player.Client.sendEject()
                    break
                case 16:
                    let x, y = 0
                    switch (msg.byteLength) {
                        case 13:
                            x = msg.readInt32LE(1)
                            y = msg.readInt32LE(5)
                            break
                        case 21:
                            x = msg.readDoubleLE(1)
                            y = msg.readDoubleLE(9)
                            break
                    }
                    Player.Client.sendMove(x, y)
                    break
            }
        })
        ws.on('close', () => {})
    })
}

figlet('Malvads-Repacker', function (err, data) {
    if (err) {
        console.dir(err);
        return;
    }
    console.log(colors.green(data))
    console.log('')
    console.log('[!] https://github.com/Malvads/')
    console.log(colors.green('[!] This tool has been developed by Malvads (' + colors.red('TheGexi') + ')'))
    console.log(colors.green('[!] Proxy Server Port: ' + Config.port))
    console.log(colors.green('[!] Proxy Server Pointing To: ' + Config.server))
    console.log(colors.green('[!] You are now ready :) enjoy!'))
});