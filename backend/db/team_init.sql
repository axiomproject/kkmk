INSERT INTO page_content (page_name, content) 
VALUES (
  'team',
  '{
    "bannerImage": "",
    "members": [
      {
        "name": "Angel M. Vallermosa",
        "subText": "Lorem ipsum",
        "image": "",
        "profileClass": "profile-1"
      },
      {
        "name": "Christian Mark R. Nocillado",
        "subText": "Lorem ipsum",
        "image": "",
        "profileClass": "profile-2"
      }
    ]
  }'::jsonb
)
ON CONFLICT (page_name) 
DO UPDATE SET content = EXCLUDED.content;
