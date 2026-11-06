window.SITE = {
 "business": {
  "name": "Sample Hotel Pilani",
  "tagline": "Comfortable rooms near BITS Pilani",
  "phone": "+91 98765 43210",
  "whatsapp": "919876543210",
  "email": "hello@example.com",
  "address": "Main Road, Pilani, Rajasthan 333031",
  "map": "Pilani, Rajasthan",
  "hours": [
   [
    "Reception",
    "Open 24 hours"
   ]
  ]
 },
 "nav": [
  {
   "label": "Home",
   "href": "index.html"
  },
  {
   "label": "Rooms",
   "href": "rooms.html"
  },
  {
   "label": "Location",
   "href": "location.html"
  },
  {
   "label": "Book",
   "href": "contact.html"
  }
 ],
 "headerCta": {
  "label": "Check availability",
  "href": "contact.html"
 },
 "waText": "Hello, I want to check room availability.",
 "hero": {
  "variant": "full",
  "eyebrow": "5 minutes from BITS Pilani",
  "title": "Quiet, clean rooms near campus",
  "lead": "AC rooms, hot water, free Wi-Fi and parking. Book direct for the best rate.",
  "image": "img/hero.jpg",
  "imageAlt": "Hotel room",
  "ctas": [
   {
    "label": "Check availability",
    "href": "contact.html",
    "style": "light"
   },
   {
    "label": "Call reception",
    "href": "call",
    "style": "ghost",
    "icon": "phone"
   }
  ]
 },
 "rooms": [
  {
   "img": "img/r1.jpg",
   "title": "Standard room",
   "price": "₹1,800",
   "unit": "per night",
   "features": [
    "Double bed",
    "AC, TV",
    "Free Wi-Fi"
   ],
   "cta": {
    "label": "Enquire",
    "href": "contact.html"
   }
  },
  {
   "img": "img/r2.jpg",
   "title": "Deluxe room",
   "price": "₹2,500",
   "unit": "per night",
   "featured": true,
   "features": [
    "King bed",
    "Work desk",
    "Breakfast included"
   ],
   "cta": {
    "label": "Enquire",
    "href": "contact.html"
   }
  },
  {
   "img": "img/r3.jpg",
   "title": "Family room",
   "price": "₹3,200",
   "unit": "per night",
   "features": [
    "Sleeps 4",
    "Two beds",
    "Breakfast included"
   ],
   "cta": {
    "label": "Enquire",
    "href": "contact.html"
   }
  }
 ],
 "amenities": [
  "Free Wi-Fi",
  "AC rooms",
  "24-hour hot water",
  "Parking",
  "Room service",
  "Power backup",
  "Lift",
  "Laundry"
 ],
 "nearby": [
  "BITS Pilani campus: 5 min",
  "Birla Museum: 6 min",
  "Bus stand: 8 min",
  "Panchwati: 10 min"
 ],
 "quotes": [
  {
   "text": "Stayed during my son's convocation. Clean rooms and very helpful staff.",
   "name": "Guest",
   "meta": "SAMPLE: replace with a real review"
  }
 ],
 "pages": {
  "index": {
   "title": "Sample Hotel Pilani | Rooms near BITS Pilani",
   "description": "AC rooms near BITS Pilani with Wi-Fi and parking.",
   "sections": [
    {
     "type": "hero"
    },
    {
     "type": "tiles",
     "from": "rooms",
     "head": {
      "title": "Choose your room"
     }
    },
    {
     "type": "chips",
     "from": "amenities",
     "bg": "alt",
     "head": {
      "title": "Everything you need"
     }
    },
    {
     "type": "split",
     "title": "Close to campus, away from the noise",
     "text": "A short walk or auto ride to everything in Pilani.",
     "image": "img/outside.jpg",
     "points": [
      "BITS Pilani campus: 5 min",
      "Bus stand: 8 min"
     ],
     "cta": {
      "label": "See location",
      "href": "location.html"
     }
    },
    {
     "type": "quotes",
     "from": "quotes",
     "bg": "dark",
     "head": {
      "title": "Guest reviews"
     }
    },
    {
     "type": "cta",
     "title": "Convocation or admission dates?",
     "text": "Rooms fill fast. Book early for the best rate."
    }
   ]
  },
  "rooms": {
   "title": "Rooms and rates | Sample Hotel Pilani",
   "sections": [
    {
     "type": "pagehead",
     "eyebrow": "Rooms",
     "title": "Rooms and rates",
     "lead": "SAMPLE rates: confirm with the hotel."
    },
    {
     "type": "tiles",
     "from": "rooms"
    },
    {
     "type": "chips",
     "from": "amenities",
     "bg": "alt",
     "head": {
      "title": "Amenities"
     }
    }
   ]
  },
  "location": {
   "title": "Location | Sample Hotel Pilani",
   "sections": [
    {
     "type": "pagehead",
     "eyebrow": "Location",
     "title": "How to reach us"
    },
    {
     "type": "chips",
     "from": "nearby"
    },
    {
     "type": "contact"
    }
   ]
  },
  "contact": {
   "title": "Book your stay",
   "description": "Send your dates and we will confirm availability on call or WhatsApp.",
   "sections": [
    {
     "type": "pagehead",
     "eyebrow": "Contact",
     "title": "Book your stay",
     "lead": "Send your dates and we will confirm availability on call or WhatsApp."
    },
    {
     "type": "contact",
     "form": {
      "title": "Availability request",
      "button": "Check availability",
      "fields": [
       {
        "label": "Check-in",
        "name": "in",
        "type": "date"
       },
       {
        "label": "Room",
        "name": "room",
        "options": [
         "Standard",
         "Deluxe",
         "Family"
        ]
       }
      ]
     }
    }
   ]
  }
 },
 "look": "postcard"
};
