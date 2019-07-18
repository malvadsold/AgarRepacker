// ==UserScript==
// @name         Get Server IP
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Agar Repacker Get IP
// @author       TheGexi
// @match        https://agar.io/
// @grant        none
// ==/UserScript==
window.ip = ''

const get = (e) => {
    if(e.key == 'e'){
        prompt('serverIP:', ip)
    }
}

document.addEventListener('keypress', get)

WebSocket.prototype.send_ = WebSocket.prototype.send
WebSocket.prototype.send = function(){
    ip = this.url
    WebSocket.prototype.send_.apply(this,arguments)
}

