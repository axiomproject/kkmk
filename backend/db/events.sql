CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  location VARCHAR(255) NOT NULL,
  image VARCHAR(1000),
  description TEXT,
  total_volunteers INTEGER NOT NULL,
  current_volunteers INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
