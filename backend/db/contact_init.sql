INSERT INTO page_content (page_name, content) 
VALUES (
  'contact',
  '{
    "mainHeading": "Contact Us",
    "mainDescription": "If you have further questions or need any assistance, please get in touch with our team and we will gladly assist you.",
    "email": "Kmkkpayatas@gmail.com",
    "phone": "321-221-221",
    "sections": [
      {
        "title": "Contact Support",
        "description": "Provides exceptional customer assistance through chat, resolving inquiries, and addressing concerns."
      },
      {
        "title": "Feedback and Suggestions",
        "description": "Collects, analyzes, and addresses user feedback and suggestions to improve products, services, and overall customer satisfaction effectively."
      },
      {
        "title": "Made Inquiries",
        "description": "Handles and responds to inquiries efficiently, providing accurate information and solutions to ensure customer satisfaction and clarity."
      }
    ],
    "locationHeading": "Our location",
    "locationTitle": "Connecting Near and Far",
    "locationSubHeading": "Headquarters",
    "address": [
      "Kapatid kita mahal kita Foundation",
      "Quezon City, Philippines",
      "Lonergan Center, Ateneo de Manila University, PH 1108",
      "Philippines"
    ]
  }'::jsonb
)
ON CONFLICT (page_name) 
DO UPDATE SET content = EXCLUDED.content;
