// Aplica el delta de permisos granulares
const path = require('path');
const { spawn } = require('child_process');

const sqlFile = path.join(__dirname, '..', 'sql', 'delta_permisos_granulares.sql');
const proc = spawn(process.execPath, [path.join(__dirname, 'apply-sql.js'), sqlFile], { stdio: 'inherit' });
proc.on('exit', code => process.exit(code));

