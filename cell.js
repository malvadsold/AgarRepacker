class Cell {
    constructor(){
        this.id = 0
        this.isVirus = false
        this.isEjected = false
        this.isAgitated = false
        this.isEnemyEject = false
        this.isPellet = false
        this.flags = 0
        this.extendedFlags = 0
        this.hasExtendedFlags = false
        this.colors = false
        this.nick = ''
        this.skin = ''
        this.size = 0
        this.mass = 0
        this.r = 0
        this.g = 0
        this.b = 0
    }
    setColor(r,g,b){
        if(!this.colors){
            this.r = r
            this.g = g
            this.b = b
            this.colors = true
        }
    }
    setStrings(skin, name){
        this.skin == '' ? this.skin = skin : this.skin = this.skin
        this.nick == '' ? this.nick = name : this.nick = this.nick
    }
    setSize(size){
        this.size = size
        this.mass = (size * size) / 100
    }
}
module.exports = Cell