// migrate-fingerprint.js
const mysql = require('mysql2/promise');

async function runMigration() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            port: 3004,
            user: 'root',
            password: '',
            database: 'helper'
        });

        console.log('Connected to database...');

        // Proveri da li kolona već postoji
        const [columns] = await connection.query(
            `SHOW COLUMNS FROM children LIKE 'fingerprint_id'`
        );

        if (columns.length > 0) {
            console.log('✓ fingerprint_id kolona već postoji');
            return;
        }

        // Dodaj fingerprint_id kolonu
        await connection.query(`
            ALTER TABLE children
            ADD fingerprint_id VARCHAR(64) NULL
        `);
        console.log('✓ Dodata fingerprint_id kolona');

        // Dodaj unique constraint
        await connection.query(`
            ALTER TABLE children
            ADD UNIQUE KEY uniq_children_fingerprint (fingerprint_id)
        `);
        console.log('✓ Dodat unique constraint za fingerprint_id');

        console.log('\n✅ Migracija uspešno izvršena!');

    } catch (error) {
        console.error('❌ Greška pri migraciji:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

runMigration();
