// controllers/clientesController.js
exports.getAllClientes = (req, res) => {
    // Ejemplo de respuesta
    res.json([
        { id: 1, nombre: 'Juan Pérez' },
        { id: 2, nombre: 'Ana Gómez' }
    ]);
};
