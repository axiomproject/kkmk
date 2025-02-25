const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function createStaffMember() {
    try {
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO staff_users (
                name,
                email,
                password,
                department,
                phone,
                role
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, email, department, role
        `;

        const values = [
            'Jc',
            'staff@kkmk.com',
            hashedPassword,
            'Operations',
            '123-456-7890',
            'staff'
        ];

        const result = await db.one(query, values);
        console.log('Staff member created successfully:', result);
        process.exit(0);
    } catch (error) {
        console.error('Error creating staff member:', error);
        process.exit(1);
    }
}

createStaffMember();
