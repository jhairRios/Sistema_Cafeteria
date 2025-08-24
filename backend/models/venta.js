// models/venta.js
class Venta {
    constructor(id, producto, cantidad) {
        this.id = id;
        this.producto = producto;
        this.cantidad = cantidad;
    }
}

module.exports = Venta;
