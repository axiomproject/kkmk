INSERT INTO page_content (page_name, content) 
VALUES (
  'graduates',
  '{
    "bannerImage": "",
    "headerText": "Graduate Testimonials",
    "subText": "Hear from our graduates whose lives were forever changed by the gift of education. Read, be inspired, and consider becoming a sponsor to be a part of these incredible journeys.",
    "testimonials": [
      {
        "image": "",
        "name": "SARAH PALENQUEZ",
        "subtitle": "Business Administration Major in Marketing",
        "description": "I am a former scholar of KKMK from grade 1 until I graduated..."
      },
      {
        "image": "",
        "name": "MICHAEL JOHN CONTINIDO",
        "subtitle": "Office Administration",
        "description": "As someone who doesnt have much in life..."
      },
      {
        "image": "",
        "name": "ABEGAIL CANO",
        "subtitle": "Social Work",
        "description": "Im a former Amelia S. Hernandez scholar..."
      },
      {
        "image": "",
        "name": "DIVINE GRACE CABUG-OS",
        "subtitle": "Business Teachers Education",
        "description": "I started my journey with Kapatidkita Mahalkita Foundation..."
      },
      {
        "image": "",
        "name": "JEANNEL CRAIS",
        "subtitle": "Business Administration Major in Marketing Management",
        "description": "Being a recipient of the Amelia S. Hernandez Scholarship..."
      },
      {
        "image": "",
        "name": "ROSEMHER LUCERIO",
        "subtitle": "Operations Specialist",
        "description": "I was accepted in KKMK Foundation in 2012..."
      }
    ]
  }'::jsonb
)
ON CONFLICT (page_name) 
DO UPDATE SET content = EXCLUDED.content;
