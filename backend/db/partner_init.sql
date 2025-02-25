INSERT INTO page_content (page_name, content) 
VALUES (
  'partner',
  '{
    "bannerImage": "",
    "sections": [
      {
        "title": "Philippines Humanitarian",
        "text": "In 2001, Amelia Hernandez founded the KapatidKita MahalKita Foundation...",
        "image": "",
        "caption": null
      },
      {
        "title": "",
        "text": "Reed Elsevier Philippines actively supports KM Payatas...",
        "image": "",
        "caption": null
      }
    ]
  }'::jsonb
)
ON CONFLICT (page_name) 
DO UPDATE SET content = EXCLUDED.content;
