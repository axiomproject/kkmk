INSERT INTO page_content (page_name, content) 
VALUES (
  'home',
  '{
    "headerTitle": "Small Actions Change Lives Empowering Payatas Youth",
    "headerDescription": "The Philippines premier social impact platform designed to elevate your charity effortlessly",
    "statCards": [
      
    ],
    "features": [
      {
        "title": "Give Happiness",
        "description": "Giving happiness to others is one of the most fulfilling things you can do in life",
        "image": ""
      },
      {
        "title": "Share Love",
        "description": "Giving happiness to others is one of the most fulfilling things you can do in life",
        "image": ""
      },
      {
        "title": "Build Socially",
        "description": "Giving happiness to others is one of the most fulfilling things you can do in life",
        "image": ""
      }
    ],
    "highlights": [
      {
        "title": "Graduates'' Stories",
        "description": "Read more about their journey.",
        "image": "",
        "link": "/grad"
      }
    ],
    "community": {
      "title": "Community Impact",
      "description": "Experience the ripple effect of change as communities share their journey with KKMK through real testimonials from sponsors, volunteers, families and students.",
      "image": ""
    },
    "additionalCards": [
      {
        "title": "Health",
        "description": "lifeskills for 2,213 children in Philippines",
        "image": ""
      },
      {
        "title": "Join 5000+ People Donate",
        "description": "",
        "buttonText": "Join Community",
        "image": ""
      },
      {
        "title": "Education",
        "description": "Sponsor food, education to childrens",
        "image": ""
      }
    ],
    "actionCards": [
      {
        "image": "",
        "buttonText": "Donate Now"
      },
      {
        "image": ""
      }
    ],
    "testimonialCards": [
      {
        "name": "Imelda Hernandez \"Erni\" Armstrong",
        "title": "Co-Founder of Philippines Humanitarian",
        "description": "Co-Founder of Philippines Humanitarian, partner of KKMK",
        "backDescription": "\" I''m honoring the memory of my mother by continuing her legacy that she started with KM Foundation Founder, Father Walter Ysaac. \"\n\" I love helping KM Foundation because of Eva Aquino. I have complete trust in her and know that all the efforts that Philippines Humanitarian makes on behalf of KM Foundation are being implemented in the most efficient, professional and honorable way. \"",
        "image": ""
      },
      {
        "name": "4T Foundation International",
        "title": "Long-term Sponsors",
        "description": "Sponsors (Men, Josy, Jed & Nicho) for 20 years",
        "backDescription": "\" We are 4T foundation International, based in Escondido, California, USA. We have supported Kapatidkitamahalkita Foundation''s scholarship and outreach/feeding programs for almost 20 years now. Your foundation has done a great job in monitoring our scholars'' needs and making sure that the funds are used for whatever they are alotted for \"",
        "image": ""
      }
    ]
  }'::jsonb
)
ON CONFLICT (page_name) 
DO UPDATE SET content = EXCLUDED.content;
