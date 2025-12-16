// test-db.js - Test database connection
const mysql = require('mysql2/promise');

async function testConnection() {
    console.log('Testing database connection...');

    // Manually set your DATABASE_URL here for testing
    const DATABASE_URL = process.env.DATABASE_URL || 'mysql://user:password@host:3004/helper';

    console.log('DATABASE_URL format:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

    try {
        const pool = mysql.createPool(DATABASE_URL);
        const connection = await pool.getConnection();
        console.log('✅ Database connection successful!');

        const [rows] = await connection.query('SELECT 1 as test');
        console.log('✅ Query test successful:', rows);

        // Test users table
        const [tables] = await connection.query('SHOW TABLES LIKE "users"');
        console.log('✅ Users table exists:', tables.length > 0);

        if (tables.length > 0) {
            const [columns] = await connection.query('DESCRIBE users');
            console.log('✅ Users table structure:', columns);
        }

        connection.release();
        await pool.end();
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        console.error('errno:', error.errno);
    }
}

testConnection();
