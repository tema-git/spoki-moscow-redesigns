"use strict";
const one = (s, root = document) => root.querySelector(s);
const all = (s, root = document) => Array.from(root.querySelectorAll(s));
const rubles = (value) => new Intl.NumberFormat("ru-RU").format(value) + " ₽";
const query = new URLSearchParams(location.search);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const dateLabel = (iso) => (iso ? iso.split("-").reverse().join(".") : "");
const selected = (form, name) => new FormData(form).get(name) || "";
const selectedMany = (form, name) => new FormData(form).getAll(name);
function jumpTo(target) {
  target.scrollIntoView({ block: "start", behavior: "instant" });
}

function initNavigation() {
  const toggle = one("#menu-toggle"),
    nav = one("#main-nav");
  function open(state) {
    nav.classList.toggle("open", state);
    toggle.setAttribute("aria-expanded", String(state));
    toggle.setAttribute("aria-label", state ? "Закрыть меню" : "Открыть меню");
  }
  toggle.addEventListener("click", () => open(!nav.classList.contains("open")));
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".mast")) open(false);
  });
  document.addEventListener("focusin", (e) => {
    if (!e.target.closest(".mast")) open(false);
  });
  one(".mast").addEventListener("click", (e) => {
    if (e.target.closest("a")) open(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      open(false);
      toggle.focus();
    }
  });
  matchMedia("(min-width:821px)").addEventListener("change", (e) => {
    if (e.matches) open(false);
  });
  const magnet = one(".magnet"),
    inside = one("span", magnet);
  magnet.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || reducedMotion.matches) return;
    const r = magnet.getBoundingClientRect();
    inside.style.transform =
      "translate(" +
      ((e.clientX - r.left) / r.width - 0.5) * 6 +
      "px," +
      ((e.clientY - r.top) / r.height - 0.5) * 5 +
      "px)";
  });
  const clear = () => inside.style.removeProperty("transform");
  magnet.addEventListener("pointerleave", clear);
  reducedMotion.addEventListener("change", clear);
}
function initPhotos() {
  const box = one("#lightbox"),
    img = one("#lb-img"),
    original = one("#lb-original");
  let frames = [],
    at = 0,
    caption = "",
    opener = null,
    start = null,
    scrollLock = "";
  function render() {
    img.src = frames[at].full;
    img.alt = caption + " · фото " + (at + 1);
    one("#lb-title").textContent = caption;
    one("#lb-count").textContent = at + 1 + " / " + frames.length;
    original.href = frames[at].original;
    one("#lb-prev").disabled = frames.length < 2;
    one("#lb-next").disabled = frames.length < 2;
  }
  function move(n) {
    at = (at + n + frames.length) % frames.length;
    render();
  }
  document.addEventListener("click", (e) => {
    const frame = e.target.closest("[data-frame]");
    if (!frame) return;
    const album = frame.closest("[data-gallery]");
    frames = JSON.parse(album.dataset.gallery);
    at = Number(frame.dataset.frame);
    caption = album.dataset.title;
    if (!frames[at]) return;
    opener = frame;
    render();
    scrollLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.showModal();
    one("#lb-close").focus();
  });
  one("#lb-prev").addEventListener("click", () => move(-1));
  one("#lb-next").addEventListener("click", () => move(1));
  one("#lb-close").addEventListener("click", () => box.close());
  box.addEventListener("click", (e) => {
    if (e.target !== box) return;
    const r = box.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      box.close();
  });
  box.addEventListener("close", () => {
    img.removeAttribute("src");
    document.body.style.overflow = scrollLock;
    opener?.focus({ preventScroll: true });
  });
  box.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      move(e.key === "ArrowLeft" ? -1 : 1);
    }
  });
  const stage = one(".lb-stage");
  stage.addEventListener(
    "touchstart",
    (e) => {
      start = e.touches[0].clientX;
    },
    { passive: true },
  );
  stage.addEventListener(
    "touchend",
    (e) => {
      if (start === null) return;
      const dx = e.changedTouches[0].clientX - start;
      if (Math.abs(dx) > 52) move(dx < 0 ? 1 : -1);
      start = null;
    },
    { passive: true },
  );
  for (const group of all(".album.paged")) {
    const photos = all(".album-frame", group),
      more = group.nextElementSibling;
    let limit = 12;
    function update() {
      photos.forEach((p, i) => (p.hidden = i >= limit));
      more.hidden = limit >= photos.length;
      more.textContent =
        "Ещё фотографии · " + Math.max(0, photos.length - limit);
    }
    more.addEventListener("click", () => {
      const previous = limit;
      limit += 12;
      update();
      photos[previous]?.focus({ preventScroll: true });
    });
    update();
  }
}
function initPointers() {
  if (!matchMedia("(hover:hover) and (pointer:fine)").matches) return;
  let active = null,
    frame = 0,
    point = null;
  const targets =
    ".card-image,.still,.visit-picture,.album-frame,.style-grid article,.contact-info,.event-copy,.plan-list a";
  function clear() {
    if (active) {
      active.style.removeProperty("--px");
      active.style.removeProperty("--py");
      active.style.removeProperty("--tint");
    }
    active = null;
  }
  document.addEventListener(
    "pointermove",
    (e) => {
      const target = e.target.closest(targets);
      if (target !== active) clear();
      if (!target || reducedMotion.matches || e.pointerType !== "mouse") return;
      active = target;
      point = [e.clientX, e.clientY];
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!active) return;
        const r = active.getBoundingClientRect(),
          x = (point[0] - r.left) / r.width - 0.5,
          y = (point[1] - r.top) / r.height - 0.5;
        active.style.setProperty("--px", x * 8 + "px");
        active.style.setProperty("--py", y * 6 + "px");
        active.style.setProperty("--tint", String((x + 0.5) * 100) + "%");
      });
    },
    { passive: true },
  );
  document.addEventListener(
    "pointerout",
    (e) => {
      if (!e.relatedTarget) clear();
    },
    { passive: true },
  );
  reducedMotion.addEventListener("change", clear);
}
function initHero() {
  const slides = all(".hero-slide");
  if (!slides.length) return;
  let n = 0;
  const dots = all("[data-hero-index]");
  function select(i) {
    n = i;
    slides.forEach((s, j) => (s.hidden = j !== n));
    dots.forEach((button, j) =>
      button.setAttribute("aria-pressed", String(j === n)),
    );
    one("#hero-count").textContent = n + 1 + " / " + slides.length;
  }
  dots.forEach((button, i) =>
    button.addEventListener("click", () => select(i)),
  );
}

function initCatalog() {
  const grid = one("#catalog-grid");
  if (!grid) return;
  const search = one("#catalog-search"),
    more = one("#show-more"),
    reset = one("#catalog-reset");
  const entries = all(".product-card", grid).map((el, order) => ({
    el,
    order,
    groups: el.dataset.groups.split(" "),
    name: el.dataset.title,
    price: Number(el.dataset.price),
    attrs: JSON.parse(el.dataset.facets),
    sku: el.dataset.sku,
  }));
  const tabs = all("[data-category]"),
    filters = all(".facets .filter");
  let category = tabs.some((b) => b.dataset.category === query.get("category"))
      ? query.get("category")
      : "all",
    limit = 12;
  const normalized = (s) =>
    s.toLocaleLowerCase("ru").replaceAll("ё", "е").trim();
  const sort = () => one('[name="sort"]:checked').value;
  function draw() {
    const q = normalized(search.value);
    const choices = all(".facets input:checked").filter(
      (i) => i.name !== "sort" && i.value,
    );
    const matches = entries.filter(
      (p) =>
        (category === "all" || p.groups.includes(category)) &&
        (!q ||
          normalized(
            [p.name, p.sku, ...(p.attrs["Состав"] || [])].join(" "),
          ).includes(q)) &&
        choices.every((i) => (p.attrs[i.name] || []).includes(i.value)),
    );
    const order = sort();
    if (order !== "original")
      matches.sort(
        (a, b) =>
          (a.price - b.price) * (order === "cheap" ? 1 : -1) ||
          a.order - b.order,
      );
    // CSS order also changes keyboard traversal in some engines; set the DOM order explicitly.
    const ordered =
      order === "original"
        ? entries
        : [...matches, ...entries.filter((e) => !matches.includes(e))];
    const active = new Set(matches.slice(0, limit));
    for (const p of ordered) {
      p.el.hidden = !active.has(p);
      grid.appendChild(p.el);
    }
    one("#catalog-count").textContent =
      "Показано " + Math.min(limit, matches.length) + " из " + matches.length;
    one("#catalog-empty").hidden = matches.length > 0;
    more.hidden = matches.length <= limit;
    tabs.forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.category === category)),
    );
    filters.forEach((f) => {
      const s = one("summary", f);
      s.dataset.base ||= s.textContent;
      const radio = one("input:checked", f);
      s.textContent =
        radio.value && radio.value !== "original"
          ? s.dataset.base + " · " + radio.parentElement.innerText.trim()
          : s.dataset.base;
    });
    return matches;
  }
  for (const b of tabs)
    b.addEventListener("click", () => {
      category = b.dataset.category;
      limit = 12;
      const url = new URL(location.href);
      if (category === "all") url.searchParams.delete("category");
      else url.searchParams.set("category", category);
      history.replaceState(null, "", url);
      draw();
    });
  search.addEventListener("input", () => {
    limit = 12;
    draw();
  });
  for (const f of filters) {
    f.addEventListener("toggle", () => {
      if (!f.open) return;
      filters.filter((o) => o !== f).forEach((o) => (o.open = false));
      const choices = one(".filter-options", f);
      choices.style.removeProperty("left");
      choices.style.removeProperty("right");
      if (
        getComputedStyle(choices).position === "absolute" &&
        choices.getBoundingClientRect().left < 8
      ) {
        choices.style.left = "0";
        choices.style.right = "auto";
      }
    });
    f.addEventListener("change", () => {
      limit = 12;
      draw();
      f.open = false;
      one("summary", f).focus({ preventScroll: true });
    });
    f.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        f.open = false;
        one("summary", f).focus();
      }
    });
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter")) filters.forEach((f) => (f.open = false));
  });
  more.addEventListener("click", () => {
    const previous = limit;
    limit += 12;
    const matches = draw();
    one("a", matches[previous].el)?.focus({ preventScroll: true });
  });
  reset.addEventListener("click", () => {
    search.value = "";
    category = "all";
    limit = 12;
    filters.forEach((f) => {
      one("input", f).checked = true;
      f.open = false;
    });
    const u = new URL(location.href);
    u.searchParams.delete("category");
    history.replaceState(null, "", u);
    draw();
    search.focus();
  });
  draw();
}

const subject = one("#subject"),
  contact = one("#contact-form"),
  success = one("#success"),
  formError = one("#form-error");
const defaultSubject = subject.value;
let selectionSource = null;
function transfer(text, source) {
  contact.hidden = false;
  success.hidden = true;
  formError.textContent = "";
  subject.value = text;
  selectionSource = source;
  jumpTo(one("#contacts"));
  subject.focus({ preventScroll: true });
}
function keepInSync(text, source) {
  if (selectionSource === source && !contact.hidden) subject.value = text;
}
function receipt(el, rows, sum, note) {
  const make = (tag, text, cls) => {
    const n = document.createElement(tag);
    n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  el.replaceChildren(
    ...rows.filter(Boolean).map((t) => make("p", t)),
    make("p", sum, "sum"),
    make("p", note, "small"),
  );
}
function initContact() {
  subject.addEventListener("input", () => {
    selectionSource = null;
  });
  all("[data-subject]").forEach((b) =>
    b.addEventListener("click", () => transfer(b.dataset.subject, "product")),
  );
  contact.addEventListener("input", (e) => {
    e.target.removeAttribute("aria-invalid");
    formError.textContent = "";
  });
  contact.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = contact.elements.name,
      reply = contact.elements.reply;
    const digits = reply.value.replace(/\D/g, "");
    const replyOK =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply.value.trim()) ||
      (/^\+?[\d\s()\-]+$/.test(reply.value.trim()) &&
        digits.length >= 10 &&
        digits.length <= 15);
    const bad = !subject.value.trim()
      ? [subject, "Укажите тему заявки."]
      : (name.value.trim().match(/\p{L}/gu) || []).length < 2
        ? [name, "Введите имя — хотя бы две буквы."]
        : !replyOK
          ? [reply, "Укажите телефон с кодом или электронную почту."]
          : null;
    if (bad) {
      bad[0].setAttribute("aria-invalid", "true");
      formError.textContent = bad[1];
      bad[0].focus();
      return;
    }
    one("#sent-topic").textContent = subject.value.trim();
    formError.textContent = "";
    contact.hidden = true;
    success.hidden = false;
    success.focus();
  });
  one("[data-edit-contact]").addEventListener("click", () => {
    success.hidden = true;
    contact.hidden = false;
    subject.focus();
  });
  one("[data-start-contact]").addEventListener("click", () => {
    contact.reset();
    selectionSource = null;
    subject.value = defaultSubject;
    contact.hidden = false;
    success.hidden = true;
    one("#sent-topic").textContent = "";
    subject.focus();
  });
}
function initEvent() {
  const form = one("#event-form");
  if (!form) return;
  const packages = {
    light: ["Лайт", 30000, 10],
    standard: ["Стандарт", 100000, 30],
    premium: ["Премиум", 300000, 50],
    special: ["Особый", 5000, 0],
  };
  let summary = "";
  function update() {
    const wedding = selected(form, "eventMode") === "wedding",
      mode = wedding ? "Свадьба" : "Другое событие";
    const packageField = one("#package-field");
    packageField.hidden = !wedding;
    one("fieldset", packageField).disabled = !wedding;
    const pk = wedding ? packages[selected(form, "package")] : null;
    const n = Number(form.elements.guests.value),
      validGuests = form.elements.guests.validity.valid;
    const guestLine = n > 0 && validGuests ? "Гостей — " + n : "",
      zones = selectedMany(form, "zone");
    const rows = [
      mode + (pk ? " · «" + pk[0] + "»" : ""),
      [
        dateLabel(form.elements.date.value),
        form.elements.venue.value.trim(),
        guestLine,
      ]
        .filter(Boolean)
        .join(" · "),
      zones.length ? "Зоны — " + zones.join(", ") : "",
      selected(form, "style") !== "Пока не выбран"
        ? "Стиль — " + selected(form, "style")
        : "",
      form.elements.notes.value.trim(),
    ];
    let sum = "Индивидуальный расчёт",
      note = "Флорист уточнит состав работ, площадку и стоимость.";
    if (pk && validGuests && (!pk[2] || n <= pk[2])) {
      sum = "от " + rubles(pk[1]);
      note =
        "Нижняя граница пакета «" +
        pk[0] +
        "»" +
        (pk[2] ? " до " + pk[2] + " гостей" : " без ограничения числа гостей") +
        ". Дополнительные зоны и материалы флорист рассчитает отдельно.";
    } else if (pk && validGuests && pk[2] && n > pk[2])
      note =
        "Пакет рассчитан на " +
        pk[2] +
        " гостей. Для вашего числа гостей нужна отдельная смета.";
    if (!validGuests) note = "Введите целое число гостей от 1 до 100 000.";
    receipt(one("#event-output"), rows, sum, note);
    summary = [...rows, sum, note].filter(Boolean).join("\n");
    one("#event-live").textContent = "Ваш бриф · " + sum;
    keepInSync(summary, "event");
  }
  form.addEventListener("input", update);
  form.addEventListener("submit", (e) => e.preventDefault());
  all("[data-pack]").forEach((b) =>
    b.addEventListener("click", () => {
      one("[name=eventMode][value=wedding]", form).checked = true;
      one('[name=package][value="' + b.dataset.pack + '"]', form).checked =
        true;
      update();
      jumpTo(one("#brief"));
      one("[name=eventMode]:checked", form).focus({ preventScroll: true });
    }),
  );
  one("#use-event").addEventListener("click", () => {
    if (form.reportValidity()) transfer(summary, "event");
  });
  one("#reset-event").addEventListener("click", () => {
    form.reset();
    update();
    jumpTo(one("#brief"));
    one("input", form).focus({ preventScroll: true });
  });
  update();
}
function initBridal() {
  const form = one("#bridal-form");
  if (!form) return;
  let summary = "";
  function update() {
    const rows = [
      "Форма — " + selected(form, "shape"),
      ...selectedMany(form, "accessory"),
      form.elements.wish.value.trim(),
    ];
    const note = "Флорист уточнит сезонные цветы и стоимость букета.";
    receipt(one("#bridal-output"), rows, "Индивидуальный расчёт", note);
    summary = ["Букет невесты", ...rows, "Индивидуальный расчёт"]
      .filter(Boolean)
      .join("\n");
    keepInSync(summary, "bridal");
  }
  form.addEventListener("input", update);
  form.addEventListener("submit", (e) => e.preventDefault());
  one("#use-bridal").addEventListener("click", () =>
    transfer(summary, "bridal"),
  );
  one("#reset-bridal").addEventListener("click", () => {
    form.reset();
    update();
    jumpTo(one("#bridal-choice"));
    one("input", form).focus({ preventScroll: true });
  });
  update();
}
function initSubscription() {
  const form = one("#sub-form");
  if (!form) return;
  const plans = {
    S: ["Уют", 14900],
    M: ["Гармония", 21900],
    L: ["Премиум", 31900],
  };
  let summary = "";
  const tariff = query.get("tariff");
  if (Object.hasOwn(plans, tariff))
    one('[name=tariff][value="' + tariff + '"]', form).checked = true;
  function update() {
    const size = selected(form, "tariff"),
      [name, month] = plans[size],
      period = Number(selected(form, "duration")),
      pct = [0, 0, 5, 10][period];
    const sum = Math.round((month * period * (100 - pct)) / 100);
    const rows = [
      size + " · «" + name + "»",
      period +
        " мес. · " +
        period * 4 +
        (period === 1 ? " доставки" : " доставок"),
      pct ? "Скидка за срок — " + pct + "%" : "",
      ...selectedMany(form, "extras"),
    ];
    const note = "За весь срок, с доставкой внутри МКАД.";
    receipt(one("#sub-output"), rows, rubles(sum), note);
    summary = ["Цветочная подписка", ...rows, rubles(sum), note]
      .filter(Boolean)
      .join("\n");
    keepInSync(summary, "sub");
  }
  form.addEventListener("input", update);
  form.addEventListener("submit", (e) => e.preventDefault());
  all("[data-plan]").forEach((b) =>
    b.addEventListener("click", () => {
      one('[name=tariff][value="' + b.dataset.plan + '"]', form).checked = true;
      update();
      jumpTo(one("#configure"));
      one("[name=tariff]:checked", form).focus({ preventScroll: true });
    }),
  );
  one("#use-sub").addEventListener("click", () => transfer(summary, "sub"));
  one("#reset-sub").addEventListener("click", () => {
    form.reset();
    update();
    jumpTo(one("#configure"));
    one("input", form).focus({ preventScroll: true });
  });
  update();
}
function initParts() {
  const parts = all("[data-part]");
  if (!parts.length) return;
  const amounts = new Map(),
    out = one("#parts-output");
  let summary = "";
  function update() {
    let total = 0;
    const lines = [];
    parts.forEach((p) => {
      const n = amounts.get(p) || 0;
      one("output", p).textContent = n;
      one('[data-delta="-1"]', p).disabled = n === 0;
      if (n) {
        total += n * Number(p.dataset.cost);
        lines.push(
          p.dataset.name +
            " × " +
            n +
            " — " +
            rubles(n * Number(p.dataset.cost)),
        );
      }
    });
    const note =
      total < 3000
        ? "До минимального заказа осталось " + rubles(3000 - total) + "."
        : "Минимальная сумма набрана. Доставка рассчитывается отдельно.";
    receipt(out, [], rubles(total), note);
    if (lines.length) {
      const ul = document.createElement("ul");
      for (const text of lines) {
        const li = document.createElement("li");
        li.textContent = text;
        ul.append(li);
      }
      out.prepend(ul);
    } else {
      const p = document.createElement("p");
      p.textContent = "Добавьте цветы и упаковку из каталога.";
      out.prepend(p);
    }
    summary = ["Свой букет", ...lines, "Сумма " + rubles(total), note].join(
      "\n",
    );
    one("#use-parts").disabled = total < 3000;
    keepInSync(
      total >= 3000
        ? summary
        : "Свой букет · необходимо завершить подбор на сумму от 3 000 ₽",
      "parts",
    );
    const quick = one("#parts-live");
    if (quick) quick.textContent = "Состав букета · " + rubles(total);
  }
  for (const p of parts) {
    p.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-delta]");
      if (!btn) return;
      amounts.set(
        p,
        Math.max(0, (amounts.get(p) || 0) + Number(btn.dataset.delta)),
      );
      update();
    });
  }
  one("#use-parts").addEventListener("click", () => transfer(summary, "parts"));
  one("#reset-parts").addEventListener("click", () => {
    amounts.clear();
    update();
  });
  update();
}
initNavigation();
initPhotos();
initPointers();
initHero();
initCatalog();
initContact();
initEvent();
initBridal();
initSubscription();
initParts();
