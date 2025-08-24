// server.js - Configuración básica de Express para servir el frontend y API
const express = require('express');
const path = require('path');
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas API
const clienteRoutes = require('./routes/clientes');
const ventaRoutes = require('./routes/ventas');
const reporteRoutes = require('./routes/reportes');

app.use('/api/clientes', clienteRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/reportes', reporteRoutes);

// Fallback para SPA (index.html)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
