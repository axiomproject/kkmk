INSERT INTO page_content (page_name, content) 
VALUES (
  'life',
  '{
    "bannerImage": "",
    "headerText": "Welcome to the heart of KM Foundation",
    "description": "where every individual – staff, sponsored students, and sponsors – plays a vital role in crafting a narrative of hope, growth, and lasting impact. Here''s a glimpse into the unique experiences that define Life with KM Foundation",
    "tabs": ["All", "Educating the Young", "Health and Nutrition", "Special Programs"],
    "galleryImages": []
  }'::jsonb
)
ON CONFLICT (page_name) 
DO UPDATE SET content = EXCLUDED.content;
