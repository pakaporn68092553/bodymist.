/* ==========================================================
   Body Scent — shared script (product.html, order.html, admin.html)
   Each page section only runs when its elements exist.
   ========================================================== */

var APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyjJjtJSrXVqaBewcrZmqRk1NBcNv9UUqC5TLLLjzJjDqTGRmpSEnaTg1mgCNjkQPc48A/exec";

var SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRHplKiOgjIKJK1ueN3ZcBYIGZh2qInvlcvJkj3l_azS8ILVaZZhFS7flpuhZCceRD-WfcxwZN8C5ja/pub?gid=0&single=true&output=csv";

var MOODS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "fresh", label: "Fresh" },
  { key: "sweet", label: "Sweet" },
  { key: "confident", label: "Confident" },
  { key: "romance", label: "Romance" }
];

var TYPE_LABELS = { spray: "น้ำหอมฉีดตัว", rollon: "โรลออน" };

document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("product-list")) initProductPage();
  if (document.getElementById("orderForm")) initOrderPage();
  if (document.querySelector("#ordersTable tbody")) initAdminPage();
});

/* ---------- Helpers ---------- */

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatPrice(price) {
  return Number(price).toLocaleString("th-TH") + " บาท";
}

/* ==========================================================
   1) product.html
   ========================================================== */

function initProductPage() {
  var list = document.getElementById("product-list");
  var filterBar = document.getElementById("filter-bar");
  var products = [];

  var params = new URLSearchParams(window.location.search);
  var requested = (params.get("mood") || "").toLowerCase();
  var current = MOODS.some(function (m) { return m.key === requested; })
    ? requested
    : "all";

  function buildFilterBar() {
    if (!filterBar) return;
    filterBar.innerHTML = "";
    filterBar.classList.add("filters");
    MOODS.forEach(function (m) {
      var btn = el("button", "filter", m.label);
      btn.type = "button";
      btn.dataset.mood = m.key;
      btn.addEventListener("click", function () {
        current = m.key;
        render();
      });
      filterBar.appendChild(btn);
    });
  }

  function buildCard(p) {
    var card = el("article", "product-card mood-" + p.mood);

    var imgWrap = el("div", "product-card__img");
    var img = document.createElement("img");
    img.src = p.image;
    img.alt = p.name;
    img.loading = "lazy";
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);

    var moodLabel = p.mood.charAt(0).toUpperCase() + p.mood.slice(1);
    card.appendChild(el("span", "mood-dot product-card__mood", moodLabel));
    card.appendChild(el("h3", "product-card__name", p.name));
    card.appendChild(
      el("p", "product-card__meta", p.size || TYPE_LABELS[p.type] || "")
    );

    var foot = el("div", "product-card__foot");
    foot.appendChild(el("span", "price", formatPrice(p.price)));

    var itemLabel = p.size ? p.name + " " + p.size : p.name;
    var query = new URLSearchParams({ item: itemLabel, price: p.price });
    var buy = el("a", "btn btn--small", "สั่งซื้อ");
    buy.href = "order.html?" + query.toString();
    foot.appendChild(buy);

    card.appendChild(foot);
    return card;
  }

  function render() {
    if (filterBar) {
      Array.prototype.forEach.call(filterBar.children, function (btn) {
        var active = btn.dataset.mood === current;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    list.innerHTML = "";
    var shown = products.filter(function (p) {
      return current === "all" || p.mood === current;
    });

    if (!shown.length) {
      list.appendChild(el("p", "muted", "ไม่พบสินค้าในหมวดนี้"));
      return;
    }
    shown.forEach(function (p) { list.appendChild(buildCard(p)); });
  }

  buildFilterBar();
  list.appendChild(el("p", "muted", "กำลังโหลดสินค้า..."));

  fetch("products.json")
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      render();
    })
    .catch(function (error) {
      console.error(error);
      list.innerHTML = "";
      list.appendChild(
        el("p", "muted", "โหลดรายการสินค้าไม่สำเร็จ กรุณารีเฟรชหน้านี้อีกครั้ง")
      );
    });
}

/* ==========================================================
   2) order.html
   ========================================================== */

function initOrderPage() {
  var form = document.getElementById("orderForm");
  var params = new URLSearchParams(window.location.search);

  // Prefill from URL: item -> #items, price -> #total (both required)
  var item = params.get("item");
  var price = params.get("price");
  var itemsInput = document.getElementById("items");
  var totalInput = document.getElementById("total");
  if (item !== null && itemsInput) itemsInput.value = item;
  if (price !== null && totalInput) totalInput.value = price;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var payload = {
      customerName: document.getElementById("customerName").value.trim(),
      contact: document.getElementById("contact").value.trim(),
      items: document.getElementById("items").value.trim(),
      total: document.getElementById("total").value.trim(),
      note: document.getElementById("note").value.trim()
    };

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      if (submitBtn) submitBtn.disabled = false;
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    });
  });
}

/* ==========================================================
   3) admin.html
   ========================================================== */

// Minimal CSV parser: quoted fields, escaped quotes (""), commas and
// line breaks inside quotes, \r\n / \n / \r line endings.
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  var rows = [];
  var row = [];
  var field = "";
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function initAdminPage() {
  var tbody = document.querySelector("#ordersTable tbody");
  var COLS = 6;

  function message(text) {
    tbody.innerHTML = "";
    var tr = document.createElement("tr");
    var td = el("td", "muted", text);
    td.colSpan = COLS;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  message("กำลังโหลดข้อมูล...");

  fetch(SHEET_CSV_URL)
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text).filter(function (r) {
        return r.some(function (cell) { return cell.trim() !== ""; });
      });

      // Skip a header row if the first cell has no digits (timestamps do)
      if (rows.length && !/\d/.test(rows[0][0] || "")) rows.shift();

      if (!rows.length) {
        message("ยังไม่มีคำสั่งซื้อ");
        return;
      }

      // Rows are appended over time, so reverse = newest first
      rows.reverse();

      tbody.innerHTML = "";
      rows.forEach(function (r) {
        var tr = document.createElement("tr");
        for (var i = 0; i < COLS; i++) {
          tr.appendChild(el("td", "", r[i] !== undefined ? r[i] : ""));
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (error) {
      console.error(error);
      message("โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้านี้อีกครั้ง");
    });
}
