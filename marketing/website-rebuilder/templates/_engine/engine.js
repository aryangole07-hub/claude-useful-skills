/* Website-rebuilder engine. Renders every page from window.SITE (content.js): header, footer, floating call/WhatsApp,
   and the sections listed in SITE.pages[<body data-page>].sections. A template = content.js + theme.css; no per-site JS.
   shortcut: pages render client-side, fine for a pitch preview; before a sold site goes live, save each rendered page
   as static HTML with <body data-baked> (the engine then only wires up behaviour) so search engines see the content. */
(() => {
  const S = window.SITE, B = S.business, doc = document;
  const page = doc.body.dataset.page || "index";
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const rich = (v) => esc(v).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");            // **bold** only
  const tel = (p) => "tel:" + String(p).replace(/[^\d+]/g, "");
  const wa = (n, t) => `https://wa.me/${String(n).replace(/\D/g, "")}${t ? "?text=" + encodeURIComponent(t) : ""}`;
  const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    whatsapp: '<path d="M3 21l1.7-5A9 9 0 1 1 8 19.3L3 21z"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    tooth: '<path d="M7 3c-2.5 0-4 2-4 4.5 0 3 1.5 5 2 8s1 5.5 2.5 5.5S9 17 12 17s3.5 4 5 4 2-2.5 2.5-5.5 2-5 2-8C21.5 5 20 3 17.5 3c-2 0-3 1-5.5 1S9 3 7 3z"/>',
    bed: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M2 17h20M6 10V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>',
    wifi: '<path d="M5 12.6a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0"/><circle cx="12" cy="19.5" r=".5"/>',
    car: '<path d="M5 17h14M3 13l2-6h14l2 6v5H3z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.3-2.3a4 4 0 0 0-5-5L2 10l8-8z"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-10-1 12-5 16-9 17z"/><path d="M2 22c2-4 5-7 10-9"/>',
    cup: '<path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
    dumbbell: '<path d="M6 5v14M18 5v14M3 8v8M21 8v8M6 12h12"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
    scale: '<path d="M12 3v18M5 21h14M3 7h18M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    flask: '<path d="M9 2h6M10 2v7L4 20a1.5 1.5 0 0 0 1.3 2h13.4A1.5 1.5 0 0 0 20 20l-6-11V2"/><path d="M7 15h10"/>',
    bus: '<rect x="4" y="3" width="16" height="15" rx="2"/><path d="M4 11h16M8 18v3M16 18v3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', menu: '<path d="M3 6h18M3 12h18M3 18h18"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
    arrow: '<path d="M5 12h14M13 5l7 7-7 7"/>',
  };
  const ic = (n) => P(ICONS[n] || ICONS.check);
  const head = (h, center) => h ? `<div class="sec-head${center ? " center" : ""} rv">${h.eyebrow ? `<span class="eyebrow">${esc(h.eyebrow)}</span>` : ""}${h.title ? `<h2>${esc(h.title)}</h2>` : ""}${h.lead ? `<p class="lead">${rich(h.lead)}</p>` : ""}</div>` : "";
  const btn = (c) => `<a class="btn${c.style ? " " + c.style : ""}" href="${esc(c.href === "call" ? tel(B.phone) : c.href === "whatsapp" ? wa(B.whatsapp || B.phone, c.text) : c.href)}">${c.icon ? ic(c.icon) : ""}${esc(c.label)}</a>`;
  const data = (sec) => sec.items || (sec.from ? S[sec.from] : null) || [];
  const img = (src, alt, cls = "", eager) => src ? `<img src="${esc(src)}" alt="${esc(alt || "")}"${cls ? ` class="${cls}"` : ""} loading="${eager ? "eager" : "lazy"}" decoding="async" onerror="this.style.visibility='hidden'">` : "";

  function openChip() {
    const o = B.openHours; if (!o) return "";
    const now = new Date(), m = now.getHours() * 60 + now.getMinutes(), hm = (t) => { const [h, mi] = t.split(":").map(Number); return h * 60 + mi; };
    const fmt = (t) => new Date(2000, 0, 1, ...t.split(":").map(Number)).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    const open = o.days.includes(now.getDay()) && m >= hm(o.open) && m < hm(o.close);
    return `<div class="open-chip h-in${open ? "" : " closed"}" style="--i:0" role="status">${open ? `Open now, closes ${fmt(o.close)}` : `Closed now, opens ${fmt(o.open)}`}</div>`;
  }
  const R = {
    hero(s) {
      const h = { ...S.hero, ...s };
      const text = `<div>${openChip()}${h.eyebrow ? `<span class="eyebrow h-in" style="--i:0">${esc(h.eyebrow)}</span>` : ""}<h1 class="h-in" style="--i:1">${rich(h.title)}</h1>
        <p class="lead h-in" style="--i:2">${rich(h.lead)}</p><div class="btns h-in" style="--i:3">${(h.ctas || []).map(btn).join("")}</div>
        ${h.points ? `<ul class="hero-points h-in" style="--i:4">${h.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}</div>`;
      if (h.variant === "full") return `<section class="hero full"><div class="bg">${img(h.image, h.imageAlt, "", true)}</div><div class="wrap">${text}</div></section>`;
      return `<section class="hero"><div class="wrap hero-grid">${text}<div class="hero-media">${img(h.image, h.imageAlt, "", true)}
        ${h.badge ? `<div class="hero-badge"><b>${esc(h.badge.big)}</b><span>${esc(h.badge.text)}</span></div>` : ""}</div></div></section>`;
    },
    pagehead: (s) => `<section class="page-hd"><div class="wrap">${s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : ""}<h1>${esc(s.title)}</h1>${s.lead ? `<p class="lead">${rich(s.lead)}</p>` : ""}</div></section>`,
    stats: (s) => `<div class="stats rv">${data(s).map((x) => `<div class="stat"><b>${esc(x.value)}</b><span>${esc(x.label)}</span></div>`).join("")}</div>`,
    cards: (s) => head(s.head) + `<div class="cards">${data(s).slice(0, s.limit || 99).map((x, i) => `<article class="card rv${x.href ? " linked" : ""}" style="--i:${i % 4}">
        ${x.img ? img(x.img, x.title, "cover") : `<div class="ic">${ic(x.icon)}</div>`}<h3>${esc(x.title)}</h3><p>${rich(x.text)}</p>
        ${x.href ? `<a class="more link" href="${esc(x.href)}">${esc(x.link || "Learn more")}</a>` : ""}</article>`).join("")}</div>`
      + (s.more ? `<div class="btns" style="margin-top:28px">${btn(s.more)}</div>` : ""),
    split: (s) => `<div class="split${s.rev ? " rev" : ""}"><div class="media rv">${img(s.image, s.imageAlt)}</div><div class="rv" style="--i:1">
        ${s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : ""}<h2>${esc(s.title)}</h2>${(Array.isArray(s.text) ? s.text : [s.text]).filter(Boolean).map((t) => `<p class="muted">${rich(t)}</p>`).join("")}
        ${s.points ? `<ul class="checks">${s.points.map((p) => `<li>${rich(p)}</li>`).join("")}</ul>` : ""}${s.cta ? `<div class="btns" style="margin-top:26px">${btn(s.cta)}</div>` : ""}</div></div>`,
    plist(s) {
      const groups = data(s), id = "pl" + Math.random().toString(36).slice(2, 7);
      const tabs = groups.length > 1 ? `<div class="plist-tabs" role="tablist">${groups.map((g, i) => `<button role="tab" aria-selected="${i === 0}" data-tab="${id}-${i}">${esc(g.name)}</button>`).join("")}</div>` : "";
      return head(s.head) + tabs + groups.map((g, i) => `<div class="plist" id="${id}-${i}"${i ? " hidden" : ""}>${g.items.map((x) => `<div class="pitem">
        <h3>${esc(x.name)}${x.tag ? `<span class="tag">${esc(x.tag)}</span>` : ""}</h3><span class="price">${esc(x.price)}</span>${x.desc ? `<p>${esc(x.desc)}</p>` : ""}</div>`).join("")}</div>`).join("")
        + (s.note ? `<p class="muted" style="margin-top:20px;font-size:.9rem">${rich(s.note)}</p>` : "");
    },
    tiles: (s) => head(s.head) + `<div class="tiles">${data(s).map((x, i) => `<article class="tile rv${x.featured ? " featured" : ""}" style="--i:${i % 3}">${img(x.img, x.title)}
        <div class="body"><h3>${esc(x.title)}</h3>${x.price ? `<div class="price">${esc(x.price)} <small>${esc(x.unit || "")}</small></div>` : ""}${x.text ? `<p class="muted" style="margin:0">${rich(x.text)}</p>` : ""}
        ${x.features ? `<ul>${x.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}${x.cta ? btn(x.cta) : ""}</div></article>`).join("")}</div>`,
    people: (s) => head(s.head) + `<div class="people">${data(s).map((x, i) => `<div class="person rv" style="--i:${i % 4}">${img(x.img, x.name)}<h3>${esc(x.name)}</h3>
        <div class="role">${esc(x.role)}</div>${x.text ? `<p>${rich(x.text)}</p>` : ""}</div>`).join("")}</div>`,
    steps: (s) => head(s.head) + `<div class="steps">${data(s).map((x, i) => `<div class="step rv" style="--i:${i}"><h3>${esc(x.title)}</h3><p>${rich(x.text)}</p></div>`).join("")}</div>`,
    gallery: (s) => head(s.head) + `<div class="gallery">${data(s).slice(0, s.limit || 99).map((x) => `<figure class="rv">${img(x.img, x.caption)}${x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : ""}</figure>`).join("")}</div>`,
    quotes: (s) => head(s.head) + `<div class="quotes">${data(s).map((x, i) => `<figure class="quote rv" style="--i:${i}"><div class="stars" aria-label="${x.stars || 5} out of 5">${"★".repeat(x.stars || 5)}</div>
        <blockquote>${esc(x.text)}</blockquote><figcaption>${esc(x.name)}${x.meta ? `<span>${esc(x.meta)}</span>` : ""}</figcaption></figure>`).join("")}</div>`,
    notices: (s) => head(s.head) + `<div class="notices">${data(s).map((x) => { const d = new Date(x.date); return `<a class="notice rv" href="${esc(x.href || "#")}">
        <time datetime="${esc(x.date)}"><b>${d.getDate()}</b>${d.toLocaleString("en-IN", { month: "short" })}</time><div><b>${esc(x.title)}</b>${x.text ? `<div class="muted" style="font-size:.93rem">${esc(x.text)}</div>` : ""}</div></a>`; }).join("")}</div>`,
    chips: (s) => head(s.head) + `<div class="chips rv">${data(s).map((x) => `<span>${esc(x)}</span>`).join("")}</div>`,
    faq: (s) => head(s.head) + `<div class="faq">${data(s).map((x) => `<details class="rv"><summary>${esc(x.q)}</summary><p>${rich(x.a)}</p></details>`).join("")}</div>`,
    cta: (s) => `<div class="cta rv"><div><h2>${esc(s.title)}</h2>${s.text ? `<p>${rich(s.text)}</p>` : ""}</div><div class="btns">${(s.ctas || [{ label: "Call " + B.phone, href: "call", icon: "phone", style: "light" }]).map(btn).join("")}</div></div>`,
    contact(s) {
      const today = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
      const f = s.form || {};
      return `<div class="contact-grid"><div class="rv">${head(s.head)}<ul class="info-list">
        <li><span class="ic">${ic("phone")}</span><div><b>Phone</b><a href="${tel(B.phone)}">${esc(B.phone)}</a>${B.phone2 ? `<br><a href="${tel(B.phone2)}">${esc(B.phone2)}</a>` : ""}</div></li>
        ${B.whatsapp ? `<li><span class="ic">${ic("whatsapp")}</span><div><b>WhatsApp</b><a href="${wa(B.whatsapp)}">Chat with us</a></div></li>` : ""}
        ${B.email ? `<li><span class="ic">${ic("mail")}</span><div><b>Email</b><a href="mailto:${esc(B.email)}">${esc(B.email)}</a></div></li>` : ""}
        <li><span class="ic">${ic("pin")}</span><div><b>Address</b>${esc(B.address)}</div></li></ul>
        ${B.hours ? `<table class="hours"><tbody>${B.hours.map(([d, t]) => `<tr class="${d.includes(today) ? "today" : ""}"><td>${esc(d)}</td><td>${esc(t)}</td></tr>`).join("")}</tbody></table>` : ""}
        ${B.map ? `<div class="map"><iframe src="https://maps.google.com/maps?q=${encodeURIComponent(B.map)}&output=embed" loading="lazy" title="Map to ${esc(B.name)}"></iframe></div>` : ""}</div>
        <form class="form rv" style="--i:1" data-demo><h3>${esc(f.title || "Send an enquiry")}</h3>
        <div class="row2"><label>Name<input name="name" required autocomplete="name"></label><label>Phone<input name="phone" type="tel" required autocomplete="tel"></label></div>
        ${(f.fields || []).map((x) => x.options ? `<label>${esc(x.label)}<select name="${esc(x.name)}">${x.options.map((o) => `<option>${esc(o)}</option>`).join("")}</select></label>`
          : `<label>${esc(x.label)}<input name="${esc(x.name)}" type="${esc(x.type || "text")}"></label>`).join("")}
        <label>Message<textarea name="msg" rows="4"></textarea></label><button class="btn" type="submit">${esc(f.button || "Send")}</button>
        <div class="ok" role="status">Thank you. We will call you back shortly.</div></form></div>`;
    },
    html: (s) => s.html,                                            // escape hatch for a one-off block; avoid
  };

  function header() {
    const nav = S.nav.map((n) => `<a href="${esc(n.href)}"${n.href.replace(/\.html$/, "") === page || (page === "index" && n.href === "index.html") ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`).join("");
    return `<header class="hdr"><div class="wrap"><a class="logo" href="index.html">${B.logo ? img(B.logo, B.name, "", true) : ""}<span>${esc(B.name)}${B.tagline ? `<small>${esc(B.tagline)}</small>` : ""}</span></a>
      <nav class="nav" id="nav">${nav}</nav><a class="hdr-phone" href="${tel(B.phone)}">${esc(B.phone)}</a>${S.headerCta ? btn(S.headerCta) : ""}
      <button class="menu-btn" aria-label="Menu" aria-expanded="false" aria-controls="nav">${ic("menu")}</button></div></header>`;
  }
  function footer() {
    return `<footer class="ftr"><div class="wrap"><div class="cols"><div><h3>${esc(B.name)}</h3><p>${esc(S.footerAbout || B.tagline || "")}</p></div>
      <div><h3>Pages</h3><ul>${S.nav.map((n) => `<li><a href="${esc(n.href)}">${esc(n.label)}</a></li>`).join("")}</ul></div>
      <div><h3>Contact</h3><ul><li><a href="${tel(B.phone)}">${esc(B.phone)}</a></li>${B.email ? `<li><a href="mailto:${esc(B.email)}">${esc(B.email)}</a></li>` : ""}<li>${esc(B.address)}</li></ul></div>
      ${B.socials ? `<div><h3>Follow</h3><ul>${Object.entries(B.socials).map(([k, v]) => `<li><a href="${esc(v)}" rel="noopener">${esc(k)}</a></li>`).join("")}</ul></div>` : ""}</div>
      <div class="base"><span>&copy; ${new Date().getFullYear()} ${esc(B.name)}</span><span>${esc(S.footerNote || "")}</span></div></div></footer>
      <div class="fab">${B.whatsapp ? `<a class="wa" href="${wa(B.whatsapp, S.waText)}" aria-label="WhatsApp">${ic("whatsapp")}</a>` : ""}<a class="call" href="${tel(B.phone)}" aria-label="Call ${esc(B.phone)}">${ic("phone")}</a></div>`;
  }
  function render() {
    const cfg = S.pages[page] || S.pages.index;
    const main = cfg.sections.map((s) => {
      const r = R[s.type];
      if (!r) return `<!-- unknown section ${esc(s.type)} -->`;
      if (s.type === "hero" || s.type === "pagehead") return r(s);
      return `<section class="${[s.bg, s.tight ? "tight" : ""].filter(Boolean).join(" ")}"><div class="wrap">${r(s)}</div></section>`;
    }).join("");
    doc.body.insertAdjacentHTML("afterbegin", `<a class="skip" href="#main">Skip to content</a>` + header() + `<main id="main">${main}</main>` + footer());
  }

  doc.documentElement.classList.add("js");
  if (S.look) doc.documentElement.dataset.look = S.look;
  if (!doc.body.hasAttribute("data-baked")) render();

  // behaviour (also on baked pages)
  const hdr = doc.querySelector(".hdr"), nav = doc.getElementById("nav"), mb = doc.querySelector(".menu-btn");
  addEventListener("scroll", () => hdr.classList.toggle("scrolled", scrollY > 8), { passive: true });
  mb.addEventListener("click", () => { const o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", o); mb.innerHTML = ic(o ? "x" : "menu"); });
  doc.querySelectorAll(".plist-tabs").forEach((t) => t.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    t.querySelectorAll("button").forEach((x) => { x.setAttribute("aria-selected", x === b); doc.getElementById(x.dataset.tab).hidden = x !== b; });
  }));
  doc.querySelectorAll("form[data-demo]").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); f.classList.add("sent"); f.reset(); }));
  const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -8% 0px" });
  doc.querySelectorAll(".rv").forEach((el) => io.observe(el));
  requestAnimationFrame(() => requestAnimationFrame(() => doc.querySelector(".hero")?.classList.add("ready")));
})();
