// controllers/ventasController.js
exports.getAllVentas = (req, res) => {
    res.json([
        { id: 1, producto: 'Laptop', cantidad: 2 },
        { id: 2, producto: 'Mouse', cantidad: 5 }
    ]);
};
