INSERT INTO page_content (page_name, content) 
VALUES (
  'community',
  '{
    "bannerImage": "",
    "headerText": "Our Community",
    "subText": "The KM Foundation''s community initiatives aim to empower and support Payatas residents...",
    "testimonials": [
      {
        "image": "",
        "name": "Community Member 1",
        "subtitle": "Role/Position",
        "description": "Testimonial text..."
      },
      {
        "image": "",
        "name": "Community Member 2",
        "subtitle": "Role/Position",
        "description": "Testimonial text..."
      },
      {
        "image": "",
        "name": "Community Member 3",
        "subtitle": "Role/Position",
        "description": "Testimonial text..."
      },
      {
        "image": "",
        "name": "Community Member 4",
        "subtitle": "Role/Position",
        "description": "Testimonial text..."
      }
    ]
  }'::jsonb
)
ON CONFLICT (page_name) 
DO UPDATE SET content = EXCLUDED.content;
