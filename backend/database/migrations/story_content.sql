CREATE TABLE IF NOT EXISTS story_content (
  id SERIAL PRIMARY KEY,
  section_order INTEGER NOT NULL,
  content_text TEXT NOT NULL,
  image_url TEXT,
  image_caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banner_images (
  id SERIAL PRIMARY KEY,
  page_name VARCHAR(50) NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial data
INSERT INTO story_content (section_order, content_text, image_caption) VALUES
(1, 'In the heart of Payatas B, the Kapatidkita Mahalkita Foundation...', 'Fr. Walter L. Ysaac, S.J.'),
(2, 'The KM Foundation''s mission is to uplift and empower...', NULL),
(3, 'In 2011, Reed Elsevier Philippines started supporting...', NULL);
