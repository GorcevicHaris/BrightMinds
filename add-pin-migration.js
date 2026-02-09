const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function addPinCodeColumn() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3004,
        user: 'root',
        database: 'helper',
        multipleStatements: true
    });

    try {
        console.log('🔄 Dodavanje pin_code kolone...');

        const sqlPath = path.join(__dirname, 'migrations', 'add_pin_code.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await connection.query(sql);

        console.log('✅ pin_code kolona uspešno dodata!');
    } catch (error) {
        console.error('❌ Greška:', error.message);
    } finally {
        await connection.end();
    }
}

addPinCodeColumn();
