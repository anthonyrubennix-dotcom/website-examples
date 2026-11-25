/* Partner referral for the example pages. Include on every page:  <script src="/website-examples/ref.js" defer></script>
   1. ?ref=<partner> is kept for the visit (sessionStorage) and appended to internal links.
   2. Adds a small "Want a page like this?" inquiry box; it posts to the partner portal with the ref.
   The shop's own sample form (#estForm) stays a sample and sends nothing. */
(function () {
  var API = "https://partner.nixwebsites.com/api/inquiry";               // set after the portal is public (privacy notice: same host /privacy)
  var q = new URLSearchParams(location.search).get("ref");
  if (q && /^[a-z0-9-]{3,30}$/.test(q)) sessionStorage.setItem("ref", q);
  var ref = sessionStorage.getItem("ref") || "";
  if (ref) document.querySelectorAll("a[href]").forEach(function (a) {
    var u = new URL(a.href, location.href);
    if (u.origin === location.origin && !u.hash) { u.searchParams.set("ref", ref); a.href = u.toString(); }
  });
  var box = document.createElement("section");
  box.id = "want-this";
  box.style.cssText = "max-width:640px;margin:40px auto;padding:20px;border:2px solid #b8321c;border-radius:12px;background:#fff;color:#1b1e21;font:16px/1.5 system-ui,sans-serif";
  box.innerHTML = '<h2 style="margin:0 0 6px;font-size:22px">Want a page like this for your business?</h2>' +
    '<p style="margin:0 0 12px;color:#555">Leave your details and we get back to you. No obligation.</p>' +
    '<form id="wantForm" novalidate style="display:grid;gap:8px">' +
    '<input name="name" placeholder="Your name" required><input name="company" placeholder="Business name" required>' +
    '<input name="city" placeholder="City, state" required><input name="contact" placeholder="Phone or e-mail" required>' +
    '<textarea name="message" placeholder="Anything we should know? (optional)" maxlength="300"></textarea>' +
    '<label style="font-size:14px"><input type="checkbox" name="consent"> I agree that my details are used to answer this request (<a href="' + API.replace('/api/inquiry', '/privacy') + '" target="_blank" rel="noopener">privacy notice</a>).</label>' +
    '<input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">' +
    '<button style="padding:12px;border:0;border-radius:8px;background:#b8321c;color:#fff;font-weight:700">Send</button>' +
    '<p id="wantMsg" role="status" style="margin:0"></p></form>';
  (document.querySelector("main") || document.body).appendChild(box);
  box.querySelectorAll("input:not([type=checkbox]),textarea").forEach(function (i) { i.style.cssText += ";padding:10px;border:1px solid #ccc;border-radius:8px;font:inherit"; });
  document.getElementById("wantForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var f = ev.target, msg = document.getElementById("wantMsg");
    if (!f.company.value.trim() || !f.city.value.trim() || !f.contact.value.trim() || !f.consent.checked) { msg.textContent = "Please fill in business, city, contact and tick the box."; return; }
    var d = { ref: ref, name: f.name.value, company: f.company.value, city: f.city.value, contact: f.contact.value, message: f.message.value,
              page: location.pathname.replace(/^\/website-examples/, ""), consent: true, website: f.website.value };
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) })
      .then(function (r) { msg.textContent = r.ok ? "Thanks, we will get back to you." : "Could not send. Please try again."; if (r.ok) f.reset(); })
      .catch(function () { msg.textContent = "Could not send. Please try again."; });
  });
})();
