-- Drop existing tables if they exist
DROP TABLE IF EXISTS regular_donations;
DROP TABLE IF EXISTS inkind_donations;

-- Regular donations table
CREATE TABLE regular_donations (
    id SERIAL PRIMARY KEY,
    donator_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    item VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- In-kind donations table
CREATE TABLE inkind_donations (
    id SERIAL PRIMARY KEY,
    donator_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    item VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
