// Modelo de Reservas eliminado. Stubs para evitar fallos si algún import persiste.
async function list() { return []; }
async function getById() { return null; }
async function create() { throw new Error('Reservas eliminado'); }
async function update() { throw new Error('Reservas eliminado'); }
async function setEstado() { throw new Error('Reservas eliminado'); }
async function remove() { throw new Error('Reservas eliminado'); }
module.exports = { list, getById, create, update, setEstado, remove };
