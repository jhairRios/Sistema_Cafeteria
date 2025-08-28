// Verifica que los permisos granulares y asignaciones por rol estén presentes
const { initPool, getPool } = require('../db');

const granularPerms = [
	'action.empleados.add','action.empleados.edit','action.empleados.delete',
	'action.productos.add','action.productos.edit','action.productos.delete',
	'action.mesas.ocupar','action.mesas.cerrar',
	'action.reportes.generar','action.reportes.export.pdf','action.reportes.export.excel','action.reportes.filtros',
	'action.ventas.agregar','action.ventas.limpiar','action.ventas.cancelar','action.ventas.procesar'
];

async function main() {
	await initPool();
	const pool = getPool();
	const [rows] = await pool.query(
		`SELECT clave FROM permisos WHERE clave IN (${granularPerms.map(() => '?').join(',')})`,
		granularPerms
	);
	const found = new Set(rows.map(r => r.clave));
	const missing = granularPerms.filter(k => !found.has(k));

	// Contar asignaciones por rol relevantes
	async function countForRole(roleId) {
		const [r] = await pool.query(
			`SELECT COUNT(*) AS c FROM roles_permisos rp 
			 JOIN permisos p ON p.id = rp.permiso_id 
			 WHERE rp.role_id = ? AND p.clave IN (${granularPerms.map(() => '?').join(',')})`,
			[roleId, ...granularPerms]
		);
		return r[0].c;
	}

	const cCajero = await countForRole(2);
	const cMesero = await countForRole(3);
	const cSupervisor = await countForRole(4);

	console.log('Permisos granulares esperados:', granularPerms.length);
	console.log('Permisos granulares encontrados:', found.size);
	if (missing.length) {
		console.warn('FALTAN claves:', missing.join(', '));
	}
	console.log('Asignaciones:', { Cajero: cCajero, Mesero: cMesero, Supervisor: cSupervisor });

	// Criterio simple de éxito
	const ok = missing.length === 0 && cCajero >= 6 && cMesero >= 4 && cSupervisor >= 10;
	if (!ok) {
		console.error('Verificación NO pasó. Revisa faltantes o asignaciones.');
		process.exit(2);
	}
	console.log('Verificación OK');
	process.exit(0);
}

main().catch(err => {
	console.error('Error verificando permisos:', err && err.message);
	process.exit(1);
});

