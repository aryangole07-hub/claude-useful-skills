"""Writes the 8 starter templates into ~/.claude/skills/website-rebuilder/templates (content.js, theme.css, DESIGN.md, INDEX.md)."""
import json
from pathlib import Path

ROOT = Path.home() / ".claude/skills/website-rebuilder/templates"
HOURS = [["Mon - Sat", "9:00 am - 7:00 pm"], ["Sun", "Closed"]]


def biz(name, tagline, **kw):
    return {"name": name, "tagline": tagline, "phone": "+91 98765 43210", "whatsapp": "919876543210",
            "email": "hello@example.com", "address": "Main Road, Pilani, Rajasthan 333031", "map": "Pilani, Rajasthan",
            "hours": HOURS, **kw}


def contact_page(title, lead, form):
    return {"title": title, "description": lead, "sections": [
        {"type": "pagehead", "eyebrow": "Contact", "title": title, "lead": lead},
        {"type": "contact", "form": form}]}


T = {}

# 1 school / college / coaching
T["school"] = dict(
    niches="school, college, coaching centre, tutor, play school, institute",
    summary="Admissions-first: split hero with results badge, stats strip, programmes, campus split, toppers, notices, FAQ, admissions form.",
    theme=dict(fonts="Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600", head='"Fraunces", Georgia, serif', body='"Inter", system-ui, sans-serif',
               vars={"--bg": "#fbf8f1", "--brand": "#1d3a8a", "--accent": "#e0a526", "--dark": "#0f1b3d"}),
    site={"business": biz("Sample Public School", "CBSE affiliated, Classes Nursery to XII"),
          "nav": [{"label": "Home", "href": "index.html"}, {"label": "Academics", "href": "academics.html"},
                  {"label": "Campus", "href": "campus.html"}, {"label": "Admissions", "href": "contact.html"}],
          "headerCta": {"label": "Apply now", "href": "contact.html"},
          "waText": "Hello, I would like to know about admissions.",
          "hero": {"eyebrow": "Admissions open 2027-28", "title": "Every child, **known by name**",
                   "lead": "Small classes, caring teachers and strong board results, close to home in Pilani.",
                   "image": "img/hero.jpg", "imageAlt": "Students in the school courtyard",
                   "badge": {"big": "98%", "text": "Class XII pass rate, 2026 (SAMPLE: confirm)"},
                   "ctas": [{"label": "Apply for admission", "href": "contact.html"}, {"label": "Call the office", "href": "call", "style": "ghost", "icon": "phone"}],
                   "points": ["CBSE curriculum", "Smart classrooms", "School bus across 20 km"]},
          "stats": [{"value": "35+", "label": "years of teaching"}, {"value": "1,200", "label": "students"}, {"value": "1:25", "label": "teacher to student ratio"}, {"value": "12", "label": "school buses"}],
          "programs": [{"icon": "leaf", "title": "Pre-primary", "text": "Play-based learning for Nursery to UKG in a safe, bright wing."},
                       {"icon": "book", "title": "Primary (I - V)", "text": "Strong reading, maths and curiosity, with activity periods every day."},
                       {"icon": "flask", "title": "Middle (VI - VIII)", "text": "Labs, projects and sports that build confidence."},
                       {"icon": "cap", "title": "Senior (IX - XII)", "text": "Science, Commerce and Humanities with board and entrance preparation."}],
          "toppers": [{"name": "Student name", "role": "96.4%, Class XII Science", "img": "img/topper1.jpg"},
                      {"name": "Student name", "role": "95.8%, Class XII Commerce", "img": "img/topper2.jpg"},
                      {"name": "Student name", "role": "97.2%, Class X", "img": "img/topper3.jpg"}],
          "notices": [{"date": "2026-11-20", "title": "Admission forms for 2027-28 available", "text": "Collect from the office or apply online."},
                      {"date": "2026-12-05", "title": "Annual sports day", "text": "Parents are invited from 9 am."}],
          "facilities": ["Science labs", "Computer lab", "Library", "Playground", "Music room", "CCTV campus", "RO drinking water", "Medical room"],
          "faq": [{"q": "What is the admission process?", "a": "Fill the enquiry form or visit the office. We call you to fix a short interaction for the child and a campus visit."},
                  {"q": "Do you run school buses?", "a": "Yes, buses cover Pilani and villages up to about 20 km. Ask the office for routes."},
                  {"q": "What are the school timings?", "a": "8:00 am to 2:00 pm, Monday to Saturday."}],
          "quotes": [{"text": "Teachers know my daughter well and tell us exactly how she is doing.", "name": "Parent of a Class 4 student", "meta": "SAMPLE: replace with a real review"}],
          "pages": {
              "index": {"title": "Sample Public School, Pilani | Admissions open", "description": "CBSE school in Pilani for Nursery to Class XII.", "sections": [
                  {"type": "hero"}, {"type": "stats", "from": "stats", "tight": True},
                  {"type": "cards", "from": "programs", "head": {"eyebrow": "Academics", "title": "Learning at every stage"}, "more": {"label": "See academics", "href": "academics.html", "style": "ghost"}},
                  {"type": "split", "bg": "alt", "eyebrow": "Campus", "title": "A safe, green campus", "text": "Bright classrooms, labs and a large playground in the heart of Pilani.",
                   "image": "img/campus.jpg", "points": ["CCTV and a guarded gate", "Separate pre-primary wing", "Sports every day"], "cta": {"label": "Tour the campus", "href": "campus.html"}},
                  {"type": "people", "from": "toppers", "head": {"eyebrow": "Results", "title": "Our 2026 toppers"}},
                  {"type": "notices", "from": "notices", "bg": "alt", "head": {"eyebrow": "Notice board", "title": "What is happening"}},
                  {"type": "faq", "from": "faq", "head": {"title": "Questions parents ask"}},
                  {"type": "cta", "title": "Admissions for 2027-28 are open", "text": "Seats are limited in pre-primary. Call or send an enquiry today.",
                   "ctas": [{"label": "Apply now", "href": "contact.html", "style": "light"}, {"label": "WhatsApp", "href": "whatsapp", "style": "ghost", "icon": "whatsapp"}]}]},
              "academics": {"title": "Academics | Sample Public School", "sections": [
                  {"type": "pagehead", "eyebrow": "Academics", "title": "What your child learns", "lead": "CBSE curriculum from Nursery to Class XII."},
                  {"type": "cards", "from": "programs"},
                  {"type": "split", "bg": "alt", "rev": True, "title": "Board and entrance preparation", "text": "Regular tests, doubt classes and guidance for JEE, NEET and CUET in the senior wing.", "image": "img/class.jpg"},
                  {"type": "people", "from": "toppers", "head": {"title": "Results we are proud of"}}]},
              "campus": {"title": "Campus and facilities | Sample Public School", "sections": [
                  {"type": "pagehead", "eyebrow": "Campus", "title": "Facilities", "lead": "Everything a child needs to learn and play safely."},
                  {"type": "chips", "from": "facilities"},
                  {"type": "gallery", "bg": "alt", "items": [{"img": "img/g1.jpg", "caption": "Science lab"}, {"img": "img/g2.jpg", "caption": "Library"}, {"img": "img/g3.jpg", "caption": "Sports day"}, {"img": "img/g4.jpg", "caption": "Classroom"}]},
                  {"type": "quotes", "from": "quotes", "head": {"title": "What parents say"}}]},
              "contact": contact_page("Admissions and enquiries", "Call, WhatsApp or send the form and the office will call you back.",
                                      {"title": "Admission enquiry", "button": "Send enquiry", "fields": [{"label": "Class applying for", "name": "class", "options": ["Nursery", "LKG", "UKG", "I - V", "VI - VIII", "IX - X", "XI - XII"]}]})}})

# 2 clinic / hospital / dentist
T["clinic"] = dict(
    niches="clinic, doctor, dentist, hospital, physiotherapy, eye clinic, optician, vet, diagnostic lab",
    summary="Booking-first: split hero with doctor photo and rating badge, treatments, doctors, how a visit works, timings, FAQ, appointment form.",
    theme=dict(fonts="Plus+Jakarta+Sans:wght@400;500;600;700", head='"Plus Jakarta Sans", system-ui, sans-serif', body='"Plus Jakarta Sans", system-ui, sans-serif',
               vars={"--bg": "#f6faf9", "--brand": "#0f766e", "--accent": "#f97362", "--dark": "#0b2724"}),
    site={"business": biz("Sample Care Clinic", "Family doctor and diagnostics", hours=[["Mon - Sat", "9:00 am - 1:30 pm, 5:00 - 8:30 pm"], ["Sun", "10:00 am - 1:00 pm"]]),
          "nav": [{"label": "Home", "href": "index.html"}, {"label": "Treatments", "href": "treatments.html"}, {"label": "Doctors", "href": "doctors.html"}, {"label": "Book", "href": "contact.html"}],
          "headerCta": {"label": "Book a visit", "href": "contact.html"}, "waText": "Hello, I want to book an appointment.",
          "hero": { "title": "Unhurried care for the whole family", "lead": "Experienced doctors, in-house tests and clear advice, without long waits.",
                   "image": "img/hero.jpg", "imageAlt": "Doctor with a patient", "badge": {"big": "4.8", "text": "Google rating from 300+ patients (SAMPLE: confirm)"},
                   "ctas": [{"label": "Book an appointment", "href": "contact.html"}, {"label": "WhatsApp", "href": "whatsapp", "style": "ghost", "icon": "whatsapp"}]},
          "treatments": [{"icon": "heart", "title": "General medicine", "text": "Fever, BP, diabetes, thyroid and routine check-ups."},
                         {"icon": "users", "title": "Child care", "text": "Vaccinations, growth checks and common illnesses."},
                         {"icon": "pulse", "title": "ECG and tests", "text": "Blood tests and ECG on site, reports the same day."},
                         {"icon": "shield", "title": "Health packages", "text": "Full body check-ups for adults and seniors."}],
          "doctors": [{"name": "Dr. Sample Name", "role": "MBBS, MD (Medicine)", "text": "20 years of practice.", "img": "img/doc1.jpg"},
                      {"name": "Dr. Sample Name", "role": "MBBS, DCH (Paediatrics)", "text": "Child specialist.", "img": "img/doc2.jpg"}],
          "steps": [{"title": "Book", "text": "Call, WhatsApp or use the form. We confirm a time."}, {"title": "Visit", "text": "See the doctor with little waiting."}, {"title": "Follow up", "text": "Reports on WhatsApp and a clear plan."}],
          "faq": [{"q": "Do I need an appointment?", "a": "Walk-ins are welcome, but booking cuts your wait."}, {"q": "Are reports sent online?", "a": "Yes, on WhatsApp or email the same day."}],
          "quotes": [{"text": "The doctor explained everything patiently. Very clean clinic.", "name": "Patient", "meta": "SAMPLE: replace with a real Google review"}],
          "pages": {
              "index": {"title": "Sample Care Clinic, Pilani | Book an appointment", "description": "Family doctor and diagnostics in Pilani.", "sections": [
                  {"type": "hero"}, {"type": "cards", "from": "treatments", "head": {"eyebrow": "Treatments", "title": "How we can help"}},
                  {"type": "people", "from": "doctors", "bg": "alt", "head": {"eyebrow": "Doctors", "title": "Meet your doctors"}},
                  {"type": "steps", "from": "steps", "head": {"title": "How a visit works"}},
                  {"type": "quotes", "from": "quotes", "bg": "dark", "head": {"title": "What patients say"}},
                  {"type": "faq", "from": "faq", "head": {"title": "Common questions"}},
                  {"type": "cta", "title": "Need to see a doctor today?", "text": "Call now and we will find you a slot."}]},
              "treatments": {"title": "Treatments | Sample Care Clinic", "sections": [
                  {"type": "pagehead", "eyebrow": "Treatments", "title": "Treatments and tests"}, {"type": "cards", "from": "treatments"},
                  {"type": "plist", "bg": "alt", "head": {"title": "Consultation and test fees"}, "items": [{"name": "Fees", "items": [{"name": "Consultation", "price": "₹300"}, {"name": "ECG", "price": "₹250"}, {"name": "Full body check-up", "price": "₹1,499"}]}], "note": "SAMPLE prices: confirm with the clinic."}]},
              "doctors": {"title": "Doctors | Sample Care Clinic", "sections": [
                  {"type": "pagehead", "eyebrow": "Doctors", "title": "Our doctors"}, {"type": "people", "from": "doctors"}]},
              "contact": contact_page("Book an appointment", "Tell us a convenient time and we will confirm on call or WhatsApp.",
                                      {"title": "Request an appointment", "button": "Request appointment", "fields": [{"label": "Preferred date", "name": "date", "type": "date"}]})}})

# 3 restaurant / cafe / sweets / bakery
T["restaurant"] = dict(
    niches="restaurant, cafe, dhaba, sweets shop, bakery, caterer, cloud kitchen",
    summary="Appetite-first: full-bleed food hero, signature dishes as photo cards, tabbed menu with prices, story split, gallery, order on WhatsApp.",
    theme=dict(fonts="Playfair+Display:wght@500;600;700&family=DM+Sans:wght@400;500;600", head='"Playfair Display", Georgia, serif', body='"DM Sans", system-ui, sans-serif',
               vars={"--bg": "#fdf8f0", "--brand": "#a3261b", "--accent": "#f0a020", "--dark": "#24120d"}),
    site={"business": biz("Sample Restaurant & Sweets", "Pure veg kitchen since 1998", hours=[["Every day", "8:00 am - 11:00 pm"]]),
          "nav": [{"label": "Home", "href": "index.html"}, {"label": "Menu", "href": "menu.html"}, {"label": "Gallery", "href": "gallery.html"}, {"label": "Visit", "href": "contact.html"}],
          "headerCta": {"label": "Order on WhatsApp", "href": "whatsapp", "icon": "whatsapp"}, "waText": "Hello, I want to place an order.",
          "hero": {"variant": "full", "eyebrow": "Pure veg since 1998", "title": "Fresh sweets, home-style thalis",
                   "lead": "Made in our own kitchen with pure ghee. Eat in, take away or order on WhatsApp.", "image": "img/hero.jpg", "imageAlt": "A thali and sweets on a table",
                   "ctas": [{"label": "See the menu", "href": "menu.html", "style": "light"}, {"label": "Order on WhatsApp", "href": "whatsapp", "style": "ghost", "icon": "whatsapp"}]},
          "dishes": [{"img": "img/d1.jpg", "title": "Special thali", "text": "Dal, two sabzi, rice, roti, sweet and salad."},
                     {"img": "img/d2.jpg", "title": "Kaju katli", "text": "Our best seller, made fresh every morning."},
                     {"img": "img/d3.jpg", "title": "Pyaaz kachori", "text": "Crisp, spicy and served hot with chutney."}],
          "menu": [{"name": "Thalis", "items": [{"name": "Regular thali", "price": "₹150", "desc": "Dal, sabzi, rice, 4 roti"}, {"name": "Special thali", "price": "₹220", "desc": "Two sabzi, paneer, sweet", "tag": "Popular"}]},
                   {"name": "Sweets (per kg)", "items": [{"name": "Kaju katli", "price": "₹900"}, {"name": "Motichoor laddu", "price": "₹480"}, {"name": "Ghewar", "price": "₹560", "tag": "Seasonal"}]},
                   {"name": "Snacks", "items": [{"name": "Pyaaz kachori", "price": "₹30"}, {"name": "Samosa", "price": "₹20"}, {"name": "Chai", "price": "₹15"}]}],
          "quotes": [{"text": "Best kachori in town and the sweets are always fresh.", "name": "Regular customer", "meta": "SAMPLE: replace with a real review"}],
          "pages": {
              "index": {"title": "Sample Restaurant & Sweets, Pilani", "description": "Pure veg thalis, sweets and snacks in Pilani.", "sections": [
                  {"type": "hero"}, {"type": "cards", "from": "dishes", "head": {"eyebrow": "Signature", "title": "What people come back for"}},
                  {"type": "plist", "from": "menu", "bg": "alt", "head": {"eyebrow": "Menu", "title": "Today's menu"}, "note": "SAMPLE prices: confirm with the owner."},
                  {"type": "split", "eyebrow": "Our story", "title": "Three generations of the same recipes", "text": "Started as a small sweets counter in 1998, we still make everything in our own kitchen.", "image": "img/story.jpg"},
                  {"type": "quotes", "from": "quotes", "bg": "dark", "head": {"title": "Loved in Pilani"}},
                  {"type": "cta", "title": "Party or wedding order?", "text": "Bulk sweets and catering for any size. Order a day ahead.", "ctas": [{"label": "WhatsApp your order", "href": "whatsapp", "style": "light", "icon": "whatsapp"}]}]},
              "menu": {"title": "Menu | Sample Restaurant & Sweets", "sections": [
                  {"type": "pagehead", "eyebrow": "Menu", "title": "Full menu", "lead": "Prices include taxes."}, {"type": "plist", "from": "menu"}]},
              "gallery": {"title": "Gallery | Sample Restaurant & Sweets", "sections": [
                  {"type": "pagehead", "title": "Gallery"}, {"type": "gallery", "items": [{"img": "img/g1.jpg"}, {"img": "img/g2.jpg"}, {"img": "img/g3.jpg"}, {"img": "img/g4.jpg"}, {"img": "img/g5.jpg"}]}]},
              "contact": contact_page("Visit or order", "Find us on Main Road, or order on WhatsApp for pickup.", {"title": "Bulk or party order", "button": "Send order request", "fields": [{"label": "Date needed", "name": "date", "type": "date"}]})}})

# 4 hotel / guest house / PG / homestay
T["hotel"] = dict(
    niches="hotel, guest house, homestay, PG, hostel, resort, banquet hall, dharamshala",
    summary="Stay-first: full-bleed hero, rooms as priced photo tiles, amenities chips, location split (nearby places), reviews, booking enquiry.",
    theme=dict(fonts="Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600", head='"Cormorant Garamond", Georgia, serif', body='"Manrope", system-ui, sans-serif',
               vars={"--bg": "#f7f5ef", "--brand": "#1f4d3a", "--accent": "#c49a4a", "--dark": "#122a20"}),
    site={"business": biz("Sample Hotel Pilani", "Comfortable rooms near BITS Pilani", hours=[["Reception", "Open 24 hours"]]),
          "nav": [{"label": "Home", "href": "index.html"}, {"label": "Rooms", "href": "rooms.html"}, {"label": "Location", "href": "location.html"}, {"label": "Book", "href": "contact.html"}],
          "headerCta": {"label": "Check availability", "href": "contact.html"}, "waText": "Hello, I want to check room availability.",
          "hero": {"variant": "full", "eyebrow": "5 minutes from BITS Pilani", "title": "Quiet, clean rooms near campus",
                   "lead": "AC rooms, hot water, free Wi-Fi and parking. Book direct for the best rate.", "image": "img/hero.jpg", "imageAlt": "Hotel room",
                   "ctas": [{"label": "Check availability", "href": "contact.html", "style": "light"}, {"label": "Call reception", "href": "call", "style": "ghost", "icon": "phone"}]},
          "rooms": [{"img": "img/r1.jpg", "title": "Standard room", "price": "₹1,800", "unit": "per night", "features": ["Double bed", "AC, TV", "Free Wi-Fi"], "cta": {"label": "Enquire", "href": "contact.html"}},
                    {"img": "img/r2.jpg", "title": "Deluxe room", "price": "₹2,500", "unit": "per night", "featured": True, "features": ["King bed", "Work desk", "Breakfast included"], "cta": {"label": "Enquire", "href": "contact.html"}},
                    {"img": "img/r3.jpg", "title": "Family room", "price": "₹3,200", "unit": "per night", "features": ["Sleeps 4", "Two beds", "Breakfast included"], "cta": {"label": "Enquire", "href": "contact.html"}}],
          "amenities": ["Free Wi-Fi", "AC rooms", "24-hour hot water", "Parking", "Room service", "Power backup", "Lift", "Laundry"],
          "nearby": ["BITS Pilani campus: 5 min", "Birla Museum: 6 min", "Bus stand: 8 min", "Panchwati: 10 min"],
          "quotes": [{"text": "Stayed during my son's convocation. Clean rooms and very helpful staff.", "name": "Guest", "meta": "SAMPLE: replace with a real review"}],
          "pages": {
              "index": {"title": "Sample Hotel Pilani | Rooms near BITS Pilani", "description": "AC rooms near BITS Pilani with Wi-Fi and parking.", "sections": [
                  {"type": "hero"}, {"type": "tiles", "from": "rooms", "head": {"eyebrow": "Rooms", "title": "Choose your room"}},
                  {"type": "chips", "from": "amenities", "bg": "alt", "head": {"title": "Everything you need"}},
                  {"type": "split", "eyebrow": "Location", "title": "Close to campus, away from the noise", "text": "A short walk or auto ride to everything in Pilani.", "image": "img/outside.jpg", "points": ["BITS Pilani campus: 5 min", "Bus stand: 8 min"], "cta": {"label": "See location", "href": "location.html"}},
                  {"type": "quotes", "from": "quotes", "bg": "dark", "head": {"title": "Guest reviews"}},
                  {"type": "cta", "title": "Convocation or admission dates?", "text": "Rooms fill fast. Book early for the best rate."}]},
              "rooms": {"title": "Rooms and rates | Sample Hotel Pilani", "sections": [
                  {"type": "pagehead", "eyebrow": "Rooms", "title": "Rooms and rates", "lead": "SAMPLE rates: confirm with the hotel."}, {"type": "tiles", "from": "rooms"}, {"type": "chips", "from": "amenities", "bg": "alt", "head": {"title": "Amenities"}}]},
              "location": {"title": "Location | Sample Hotel Pilani", "sections": [
                  {"type": "pagehead", "eyebrow": "Location", "title": "How to reach us"}, {"type": "chips", "from": "nearby"}, {"type": "contact"}]},
              "contact": contact_page("Book your stay", "Send your dates and we will confirm availability on call or WhatsApp.",
                                      {"title": "Availability request", "button": "Check availability", "fields": [{"label": "Check-in", "name": "in", "type": "date"}, {"label": "Room", "name": "room", "options": ["Standard", "Deluxe", "Family"]}]})}})

# 5 trades / local services
T["services"] = dict(
    niches="plumber, electrician, AC repair, pest control, carpenter, painter, builder, car repair, mobile repair, interior, solar",
    summary="Call-first: split hero with response-time badge, service cards, why-us split, 3-step process, areas served chips, reviews, quote form.",
    theme=dict(fonts="Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600", head='"Archivo", system-ui, sans-serif', body='"Inter", system-ui, sans-serif',
               vars={"--bg": "#f7f8fa", "--brand": "#1546c4", "--accent": "#ff8a1f", "--dark": "#0d1526"}),
    site={"business": biz("Sample Electricals & Repairs", "Same-day repairs in Pilani"),
          "nav": [{"label": "Home", "href": "index.html"}, {"label": "Services", "href": "services.html"}, {"label": "Our work", "href": "work.html"}, {"label": "Get a quote", "href": "contact.html"}],
          "headerCta": {"label": "Call now", "href": "call", "icon": "phone"}, "waText": "Hello, I need a repair.",
          "hero": {"eyebrow": "Same-day service", "title": "Repairs done right the first time", "lead": "Wiring, AC, inverters and appliances, by trained technicians with fixed prices.",
                   "image": "img/hero.jpg", "imageAlt": "Technician at work", "badge": {"big": "60 min", "text": "average arrival in Pilani (SAMPLE: confirm)"},
                   "ctas": [{"label": "Call now", "href": "call", "icon": "phone"}, {"label": "WhatsApp a photo", "href": "whatsapp", "style": "ghost", "icon": "whatsapp"}],
                   "points": ["Fixed prices, no surprises", "90-day warranty", "Open 7 days"]},
          "services": [{"icon": "bolt", "title": "Electrical wiring", "text": "New fittings, faults and full house wiring."}, {"icon": "tool", "title": "AC service and repair", "text": "Gas filling, cleaning and installation."},
                       {"icon": "home", "title": "Inverter and battery", "text": "Sales, installation and repair."}, {"icon": "shield", "title": "Annual maintenance", "text": "Yearly plans for homes and shops."}],
          "steps": [{"title": "Call or WhatsApp", "text": "Tell us the problem, send a photo if you can."}, {"title": "We visit", "text": "A technician comes at a time that suits you."}, {"title": "Fixed and guaranteed", "text": "Pay after the work, with a 90-day warranty."}],
          "areas": ["Pilani", "Chirawa", "Jhunjhunu", "Surajgarh", "Loharu", "Buhana"],
          "quotes": [{"text": "Came within an hour and fixed our AC the same day.", "name": "Customer", "meta": "SAMPLE: replace with a real review"}],
          "pages": {
              "index": {"title": "Sample Electricals & Repairs, Pilani | Same-day service", "description": "Electrical, AC and inverter repairs in Pilani.", "sections": [
                  {"type": "hero"}, {"type": "cards", "from": "services", "head": {"eyebrow": "Services", "title": "What we fix"}},
                  {"type": "split", "bg": "alt", "rev": True, "eyebrow": "Why us", "title": "Trained, verified technicians", "text": "Every job is done by our own staff, never a stranger.", "image": "img/team.jpg",
                   "points": ["Clear price before we start", "Clean work, we tidy up", "Warranty on every job"]},
                  {"type": "steps", "from": "steps", "head": {"title": "How it works"}},
                  {"type": "chips", "from": "areas", "bg": "alt", "head": {"title": "Areas we serve"}},
                  {"type": "quotes", "from": "quotes", "head": {"title": "Customer reviews"}},
                  {"type": "cta", "title": "Something not working?", "text": "Call now. Most jobs are fixed the same day."}]},
              "services": {"title": "Services | Sample Electricals & Repairs", "sections": [
                  {"type": "pagehead", "eyebrow": "Services", "title": "All services"}, {"type": "cards", "from": "services"},
                  {"type": "plist", "bg": "alt", "head": {"title": "Starting prices"}, "items": [{"name": "Prices", "items": [{"name": "Visit and inspection", "price": "₹199"}, {"name": "AC service", "price": "₹499"}, {"name": "Fan installation", "price": "₹249"}]}], "note": "SAMPLE prices: confirm with the owner."}]},
              "work": {"title": "Our work | Sample Electricals & Repairs", "sections": [
                  {"type": "pagehead", "title": "Recent work"}, {"type": "gallery", "items": [{"img": "img/w1.jpg"}, {"img": "img/w2.jpg"}, {"img": "img/w3.jpg"}, {"img": "img/w4.jpg"}]}, {"type": "quotes", "from": "quotes", "bg": "alt"}]},
              "contact": contact_page("Get a free quote", "Tell us what needs fixing. We usually call back within 15 minutes.",
                                      {"title": "Request a visit", "button": "Request a visit", "fields": [{"label": "Service", "name": "service", "options": ["Electrical", "AC", "Inverter", "Other"]}]})}})

# 6 shop / retail / showroom
T["shop"] = dict(
    niches="shop, showroom, jeweller, clothing store, electronics, furniture, hardware, pharmacy, supermarket, mobile shop",
    summary="Browse-first: split hero, category cards with photos, brands chips, new-arrivals gallery, store split, visit/WhatsApp CTA.",
    theme=dict(fonts="DM+Serif+Display&family=DM+Sans:wght@400;500;600", head='"DM Serif Display", Georgia, serif', body='"DM Sans", system-ui, sans-serif',
               vars={"--bg": "#faf8f5", "--brand": "#16130f", "--brand-ink": "#ffffff", "--accent": "#c08a2e", "--dark": "#16130f"}),
    site={"business": biz("Sample Store", "Trusted shop on Main Road since 2005"),
          "nav": [{"label": "Home", "href": "index.html"}, {"label": "Products", "href": "products.html"}, {"label": "About", "href": "about.html"}, {"label": "Visit", "href": "contact.html"}],
          "headerCta": {"label": "WhatsApp us", "href": "whatsapp", "icon": "whatsapp"}, "waText": "Hello, is this item available?",
          "hero": {"eyebrow": "New stock every week", "title": "Quality you can see and touch", "lead": "Visit the store or check stock on WhatsApp before you come.",
                   "image": "img/hero.jpg", "imageAlt": "Inside the store", "badge": {"big": "20 yrs", "text": "serving Pilani families"},
                   "ctas": [{"label": "Browse products", "href": "products.html"}, {"label": "Check stock on WhatsApp", "href": "whatsapp", "style": "ghost", "icon": "whatsapp"}]},
          "categories": [{"img": "img/c1.jpg", "title": "Category one", "text": "Short line on what is in this category."}, {"img": "img/c2.jpg", "title": "Category two", "text": "Short line on what is in this category."},
                         {"img": "img/c3.jpg", "title": "Category three", "text": "Short line on what is in this category."}],
          "brands": ["Brand A", "Brand B", "Brand C", "Brand D", "Brand E"],
          "pages": {
              "index": {"title": "Sample Store, Pilani", "description": "Shop on Main Road, Pilani.", "sections": [
                  {"type": "hero"}, {"type": "cards", "from": "categories", "head": {"eyebrow": "Shop", "title": "What we sell"}},
                  {"type": "chips", "from": "brands", "bg": "alt", "head": {"title": "Brands we stock"}},
                  {"type": "gallery", "head": {"eyebrow": "New arrivals", "title": "Just in"}, "items": [{"img": "img/n1.jpg"}, {"img": "img/n2.jpg"}, {"img": "img/n3.jpg"}]},
                  {"type": "split", "bg": "alt", "title": "Come see it in person", "text": "Free parking, friendly staff and easy exchange.", "image": "img/store.jpg", "points": ["Easy exchange in 7 days", "UPI and cards accepted", "Home delivery in Pilani"]},
                  {"type": "cta", "title": "Looking for something specific?", "text": "Send a photo on WhatsApp and we will tell you if it is in stock.", "ctas": [{"label": "WhatsApp us", "href": "whatsapp", "style": "light", "icon": "whatsapp"}]}]},
              "products": {"title": "Products | Sample Store", "sections": [{"type": "pagehead", "title": "Products"}, {"type": "cards", "from": "categories"}, {"type": "chips", "from": "brands", "bg": "alt", "head": {"title": "Brands"}}]},
              "about": {"title": "About | Sample Store", "sections": [{"type": "pagehead", "title": "About us"}, {"type": "split", "title": "A family business", "text": "SAMPLE: the store's real story.", "image": "img/owner.jpg"}]},
              "contact": contact_page("Visit the store", "Open Monday to Saturday on Main Road.", {"title": "Ask about a product", "button": "Send"})}})

# 7 studio: gym / salon / spa / yoga / dance
T["studio"] = dict(
    niches="gym, fitness, salon, beauty parlour, spa, yoga, dance, martial arts, music classes",
    summary="Energy-first: full-bleed hero, offers as cards, membership/price tiles, trainers, timetable price list, transformation gallery, trial-class CTA.",
    theme=dict(fonts="Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600", head='"Space Grotesk", system-ui, sans-serif', body='"Inter", system-ui, sans-serif',
               vars={"--bg": "#f5f5f3", "--brand": "#16a34a", "--accent": "#d9f99d", "--dark": "#111312"}),
    site={"business": biz("Sample Fitness Studio", "Gym, yoga and personal training", hours=[["Mon - Sat", "5:30 am - 10:00 pm"], ["Sun", "6:00 am - 12:00 pm"]]),
          "nav": [{"label": "Home", "href": "index.html"}, {"label": "Plans", "href": "plans.html"}, {"label": "Trainers", "href": "trainers.html"}, {"label": "Join", "href": "contact.html"}],
          "headerCta": {"label": "Free trial", "href": "contact.html"}, "waText": "Hello, I want a free trial.",
          "hero": {"variant": "full", "eyebrow": "First session free", "title": "Coaches who show up for you", "lead": "Modern equipment, small batches and a plan made for your goal.",
                   "image": "img/hero.jpg", "imageAlt": "People training in the gym",
                   "ctas": [{"label": "Book a free trial", "href": "contact.html", "style": "light"}, {"label": "See plans", "href": "plans.html", "style": "ghost"}]},
          "offers": [{"icon": "dumbbell", "title": "Strength and cardio", "text": "Full floor of machines and free weights."}, {"icon": "leaf", "title": "Yoga", "text": "Morning and evening batches."},
                     {"icon": "users", "title": "Personal training", "text": "One-on-one coaching with diet guidance."}],
          "plans": [{"title": "Monthly", "price": "₹1,200", "unit": "per month", "features": ["Full gym access", "Locker"], "cta": {"label": "Join", "href": "contact.html"}},
                    {"title": "Quarterly", "price": "₹3,000", "unit": "3 months", "featured": True, "features": ["Full gym access", "Diet plan", "1 PT session a month"], "cta": {"label": "Join", "href": "contact.html"}},
                    {"title": "Yearly", "price": "₹9,999", "unit": "12 months", "features": ["Everything", "Body analysis every month"], "cta": {"label": "Join", "href": "contact.html"}}],
          "trainers": [{"name": "Coach Name", "role": "Head trainer", "text": "Certified, 8 years.", "img": "img/t1.jpg"}, {"name": "Coach Name", "role": "Yoga", "img": "img/t2.jpg"}],
          "pages": {
              "index": {"title": "Sample Fitness Studio, Pilani | Free trial", "description": "Gym and yoga in Pilani.", "sections": [
                  {"type": "hero"}, {"type": "cards", "from": "offers", "head": {"eyebrow": "Train", "title": "What you can do here"}},
                  {"type": "tiles", "from": "plans", "bg": "alt", "head": {"eyebrow": "Plans", "title": "Simple plans, no hidden fees"}},
                  {"type": "people", "from": "trainers", "head": {"title": "Your coaches"}},
                  {"type": "gallery", "bg": "dark", "head": {"title": "Inside the studio"}, "items": [{"img": "img/g1.jpg"}, {"img": "img/g2.jpg"}, {"img": "img/g3.jpg"}]},
                  {"type": "cta", "title": "Your first session is free", "text": "Come in, meet a coach and try a workout."}]},
              "plans": {"title": "Plans | Sample Fitness Studio", "sections": [{"type": "pagehead", "title": "Plans and prices", "lead": "SAMPLE prices: confirm with the owner."}, {"type": "tiles", "from": "plans"}]},
              "trainers": {"title": "Trainers | Sample Fitness Studio", "sections": [{"type": "pagehead", "title": "Trainers"}, {"type": "people", "from": "trainers"}]},
              "contact": contact_page("Book a free trial", "Pick a time and we will keep a coach free for you.", {"title": "Free trial", "button": "Book trial", "fields": [{"label": "Goal", "name": "goal", "options": ["Lose weight", "Build muscle", "Yoga", "General fitness"]}]})}})

# 8 professional: CA / lawyer / real estate / consultant
T["professional"] = dict(
    niches="chartered accountant, tax consultant, lawyer, real estate agent, insurance agent, architect, travel agent, consultant",
    summary="Trust-first: split hero with experience badge, services cards, credentials split, process steps, FAQ, consultation form.",
    theme=dict(fonts="Newsreader:opsz,wght@6..72,500;6..72,600&family=Inter:wght@400;500;600", head='"Newsreader", Georgia, serif', body='"Inter", system-ui, sans-serif',
               vars={"--bg": "#f8f8f6", "--brand": "#283b6a", "--accent": "#b8893c", "--dark": "#141c33"}),
    site={"business": biz("Sample & Associates", "Chartered Accountants"),
          "nav": [{"label": "Home", "href": "index.html"}, {"label": "Services", "href": "services.html"}, {"label": "About", "href": "about.html"}, {"label": "Contact", "href": "contact.html"}],
          "headerCta": {"label": "Book a consultation", "href": "contact.html"}, "waText": "Hello, I need help with ...",
          "hero": {"eyebrow": "Serving Pilani since 2001", "title": "Taxes and GST, filed on time", "lead": "Clear advice for individuals, shops and businesses, in Hindi or English.",
                   "image": "img/hero.jpg", "imageAlt": "The office", "badge": {"big": "25 yrs", "text": "of practice"},
                   "ctas": [{"label": "Book a consultation", "href": "contact.html"}, {"label": "Call", "href": "call", "style": "ghost", "icon": "phone"}]},
          "services": [{"icon": "scale", "title": "Income tax returns", "text": "ITR filing, notices and refunds."}, {"icon": "bag", "title": "GST", "text": "Registration, monthly returns and audits."},
                       {"icon": "book", "title": "Accounting", "text": "Books, payroll and balance sheets."}, {"icon": "award", "title": "Company setup", "text": "Proprietorship, LLP and company registration."}],
          "steps": [{"title": "Talk to us", "text": "A short call to understand what you need."}, {"title": "Share documents", "text": "On WhatsApp or in person."}, {"title": "We file and update you", "text": "On time, with copies sent to you."}],
          "faq": [{"q": "What documents do I need for ITR?", "a": "PAN, Aadhaar, Form 16 or income details, and bank statements."}, {"q": "Can you handle notices?", "a": "Yes, we reply to income tax and GST notices for you."}],
          "pages": {
              "index": {"title": "Sample & Associates, Chartered Accountants, Pilani", "description": "Income tax, GST and accounting in Pilani.", "sections": [
                  {"type": "hero"}, {"type": "cards", "from": "services", "head": {"eyebrow": "Services", "title": "How we help"}},
                  {"type": "split", "bg": "alt", "title": "Qualified and accountable", "text": "Every file is checked by a partner before it is submitted.", "image": "img/team.jpg", "points": ["ICAI registered firm (SAMPLE: confirm)", "Fixed fees agreed upfront", "Your data kept private"]},
                  {"type": "steps", "from": "steps", "head": {"title": "How it works"}},
                  {"type": "faq", "from": "faq", "bg": "alt", "head": {"title": "Common questions"}},
                  {"type": "cta", "title": "Tax deadline coming up?", "text": "Call today and we will tell you exactly what to do."}]},
              "services": {"title": "Services | Sample & Associates", "sections": [{"type": "pagehead", "title": "Services"}, {"type": "cards", "from": "services"}, {"type": "steps", "from": "steps", "bg": "alt"}]},
              "about": {"title": "About | Sample & Associates", "sections": [{"type": "pagehead", "title": "About the firm"}, {"type": "people", "items": [{"name": "CA Sample Name", "role": "Founding partner", "img": "img/p1.jpg"}]}]},
              "contact": contact_page("Book a consultation", "Tell us what you need and we will call you back the same day.", {"title": "Consultation request", "button": "Request a call", "fields": [{"label": "Topic", "name": "topic", "options": ["Income tax", "GST", "Accounts", "Company setup", "Other"]}]})}})


# ---- uiux pass (2026-11-06): one look + brand sheet per niche (idea sentence in DESIGN.md) ----
F = lambda head, body: dict(head=head, body=body)
LOOKS = {
 "school": ("ledger", "On this page, the school's report card becomes the layout: results as a marked strip, toppers as a merit list.",
   "Literata:opsz,wght@7..72,500;7..72,600&family=Public+Sans:wght@400;500;600", F('"Literata", Georgia, serif', '"Public Sans", system-ui, sans-serif'),
   {"--bg": "#f4f5f7", "--surface": "#ffffff", "--ink": "#121a2e", "--muted": "#586074", "--line": "#dde0e7", "--brand": "#1b3a7a", "--accent": "#d4a017", "--dark": "#0e1830"}),
 "clinic": ("slip", "On this page, the appointment slip becomes the page: today's hours live in the hero, the booking stub closes it.",
   "Figtree:wght@400;500;600;700", F('"Figtree", system-ui, sans-serif', '"Figtree", system-ui, sans-serif'),
   {"--bg": "#f3f6f5", "--surface": "#ffffff", "--ink": "#10201e", "--muted": "#52625f", "--line": "#dce6e4", "--brand": "#0b6159", "--accent": "#e07a5f", "--dark": "#0c2421", "--head-weight": "650"}),
 "restaurant": ("menu", "On this page, the printed menu card becomes the site: dark paper, centred headings, dotted price leaders.",
   "Young+Serif&family=Work+Sans:wght@400;500;600", F('"Young Serif", Georgia, serif', '"Work Sans", system-ui, sans-serif'),
   {"--bg": "#1a1411", "--surface": "#231b16", "--ink": "#f3e9d8", "--muted": "#bfae98", "--line": "#3a2e26", "--brand": "#f2b632", "--brand-ink": "#1a120c", "--accent": "#f2b632", "--dark": "#120d0a", "--head-weight": "400"}),
 "hotel": ("postcard", "On this page, each room becomes a postcard with a stamp price, framed like the ones guests send home.",
   "Gloock&family=Jost:wght@400;500;600", F('"Gloock", Georgia, serif', '"Jost", system-ui, sans-serif'),
   {"--bg": "#eeeae2", "--surface": "#faf8f4", "--ink": "#1b231e", "--muted": "#5c645e", "--line": "#d9d3c7", "--brand": "#23493a", "--accent": "#a8803f", "--dark": "#16241d", "--head-weight": "400"}),
 "services": ("jobcard", "On this page, the technician's job card becomes the layout: a hi-vis call strip, each service a ticket.",
   "Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600", F('"Barlow Condensed", system-ui, sans-serif', '"Barlow", system-ui, sans-serif'),
   {"--bg": "#f6f7f9", "--surface": "#ffffff", "--ink": "#0e1116", "--muted": "#545b66", "--line": "#dfe3e9", "--brand": "#1546c4", "--accent": "#ffd400", "--dark": "#0b0f17"}),
 "shop": ("tag", "On this page, the shop's price tags become the navigation: every category hangs a notched tag.",
   "Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Inter+Tight:wght@400;500;600", F('"Bricolage Grotesque", system-ui, sans-serif', '"Inter Tight", system-ui, sans-serif'),
   {"--bg": "#fafaf9", "--surface": "#ffffff", "--ink": "#111111", "--muted": "#5f5f5f", "--line": "#e6e6e3", "--brand": "#111111", "--brand-ink": "#ffffff", "--accent": "#2f6f4f", "--dark": "#111111"}),
 "studio": ("timetable", "On this page, the class timetable board becomes the design: outlined numerals, heavy rules, the best plan filled in.",
   "Unbounded:wght@600;700&family=Manrope:wght@400;500;600", F('"Unbounded", system-ui, sans-serif', '"Manrope", system-ui, sans-serif'),
   {"--bg": "#f2f2ee", "--surface": "#ffffff", "--ink": "#121212", "--muted": "#555555", "--line": "#d8d8d2", "--brand": "#2f3cff", "--brand-ink": "#ffffff", "--accent": "#ff5a3c", "--dark": "#121212"}),
 "professional": ("letterhead", "On this page, the firm's letterhead becomes the page: a gold rule, dense ruled lists, no boxes.",
   "Source+Serif+4:opsz,wght@8..60,500;8..60,600&family=IBM+Plex+Sans:wght@400;500;600", F('"Source Serif 4", Georgia, serif', '"IBM Plex Sans", system-ui, sans-serif'),
   {"--bg": "#ffffff", "--surface": "#f7f7f5", "--ink": "#1c2430", "--muted": "#5a6472", "--line": "#e3e5e8", "--brand": "#233b6e", "--accent": "#b8893c", "--dark": "#141c2c"}),
}
OPEN = {"clinic": {"days": [1, 2, 3, 4, 5, 6], "open": "09:00", "close": "20:30"},
        "services": {"days": [0, 1, 2, 3, 4, 5, 6], "open": "08:00", "close": "21:00"},
        "restaurant": {"days": [0, 1, 2, 3, 4, 5, 6], "open": "08:00", "close": "23:00"}}
for name, (look, idea, fonts, f, v) in LOOKS.items():
    t = T[name]
    t["site"]["look"] = look
    t["theme"] = dict(fonts=fonts, head=f["head"], body=f["body"], vars=v)
    t["summary"] = f"Look '{look}'. {idea} " + t["summary"]
    if name in OPEN:
        t["site"]["business"]["openHours"] = OPEN[name]
    for pg in t["site"]["pages"].values():                 # labels above headings only where they earn it: hero + page heads
        for sec in pg["sections"]:
            if sec["type"] not in ("hero", "pagehead"):
                sec.pop("eyebrow", None)
                if isinstance(sec.get("head"), dict):
                    sec["head"].pop("eyebrow", None)

def theme_css(t):
    v = {"--font-head": t["head"], "--font-body": t["body"], **t["vars"]}
    return (f'@import url("https://fonts.googleapis.com/css2?family={t["fonts"]}&display=swap");\n'
            "/* Re-theme here only: brand colours + fonts. Everything else lives in engine.css. */\n"
            ":root {\n" + "".join(f"  {k}: {val};\n" for k, val in v.items()) + "}\n")


rows = []
for name, t in T.items():
    d = ROOT / name
    d.mkdir(parents=True, exist_ok=True)
    (d / "content.js").write_text("window.SITE = " + json.dumps(t["site"], ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    (d / "theme.css").write_text(theme_css(t["theme"]), encoding="utf-8")
    pages = ", ".join(f"{p} ({len(c['sections'])})" for p, c in t["site"]["pages"].items())
    (d / "DESIGN.md").write_text(f"# {name}\n\nNiches: {t['niches']}\n\n{t['summary']}\n\nPages (sections): {pages}\n\n"
                                 "All content is SAMPLE. Replace every fact with the business's own; keep SAMPLE/CONFIRM notes on anything unverified.\n", encoding="utf-8")
    rows.append(f"| {name} | {t['niches']} | {pages} | {t['summary']} | 2026-11-06 |")

(ROOT / "INDEX.md").write_text(
    "# Template library\n\nPick the row whose niches match the business; if none fits, design per the uiux skill and save it with "
    "`python scripts/tpl.py save <site> <name> \"<niches>\" \"<summary>\"` so it becomes a template.\n"
    "Section types (engine.js): hero (split|full), pagehead, stats, cards, split, plist, tiles, people, steps, gallery, quotes, notices, chips, faq, cta, contact.\n\n"
    "| template | niches | pages (sections) | layout | added |\n|---|---|---|---|---|\n" + "\n".join(rows) + "\n", encoding="utf-8")
print("wrote", len(T), "templates")
