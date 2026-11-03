// 미리보기 앱 실행 도우미 (dot.PRD 가 넣음). AI 가 쓴 화면 코드는 window.App 만 쓴다.
// - 화면: <section data-screen="home"> … 중 하나만 보인다. data-go="이름" 을 누르면 그 화면으로.
// - 격리된 프레임 안에서만 돈다. 바깥(dot.PRD) 창과는 postMessage 로 화면 이름·오류만 주고받는다.
(function () {
  "use strict";
  const listeners = {};
  let current = null;
  let toastTimer = null;

  function post(message) {
    try {
      window.parent.postMessage({ source: "dotprd-preview", ...message }, "*");
    } catch {
      // 바깥 창이 없으면 무시
    }
  }

  function drawIcons(root) {
    const icons = window.__ICONS || {};
    (root || document).querySelectorAll("[data-icon]").forEach((el) => {
      const name = el.getAttribute("data-icon");
      if (el.dataset.drawn === name) return;
      const body = icons[name] || icons["circle-alert"];
      if (!body) return;
      el.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
        (el.getAttribute("data-stroke") || "1.9") +
        '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        body +
        "</svg>";
      el.dataset.drawn = name;
    });
  }

  function screens() {
    return Array.from(document.querySelectorAll("[data-screen]"));
  }

  // ── 움직임: 화면에 들어올 때 차례로 나타나기, 숫자 올라가기, 막대 차오르기 ──
  // 처음 그려진 내용에만 붙인다(나중에 코드가 다시 그린 목록은 움직이지 않음). 동작 줄이기 설정이면 끈다.
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const REVEAL =
    ".hero > *, .hero-facts > div, .section-head, .stats > div, .panel, .plan, .steps > li, .list > .item, .art, .quote, .kv, .cal, .table-wrap, .band .page > *, .band-accent .page > *";
  const NUMBER = ".stat-value, .big-number, .price";
  let observer = null;

  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    const node = Array.from(el.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim());
    // "36", "78%", "6,900원", "2회" 처럼 숫자로 시작하는 짧은 값만 (날짜·시간은 그대로 둔다)
    if (!node || !/^[\d,.]+[%가-힣a-zA-Z/]{0,3}$/.test(el.textContent.replace(/\s+/g, ""))) return;
    const m = node.textContent.match(/^(\s*)(\d[\d,]*(?:\.\d+)?)([\s\S]*)$/);
    if (!m) return;
    const target = parseFloat(m[2].replace(/,/g, ""));
    if (!isFinite(target) || target <= 0) return;
    const decimals = (m[2].split(".")[1] || "").length;
    const comma = m[2].includes(",");
    const start = performance.now();
    const duration = 900;
    const format = (v) => {
      const s = comma
        ? v.toLocaleString("ko-KR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : v.toFixed(decimals);
      return m[1] + s + m[3];
    };
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = format(p < 1 ? target * eased : target);
      if (p < 1) requestAnimationFrame(step);
    };
    node.textContent = format(0);
    requestAnimationFrame(step);
  }

  function reveal(el) {
    if (el.dataset.reveal) el.classList.add("is-in");
    if (el.classList.contains("is-pre")) requestAnimationFrame(() => el.classList.remove("is-pre"));
    (el.matches(NUMBER) ? [el] : Array.from(el.querySelectorAll(NUMBER))).forEach(countUp);
    el.querySelectorAll(".progress.is-pre, .bars.is-pre").forEach((p) => requestAnimationFrame(() => p.classList.remove("is-pre")));
  }

  function prepareMotion(root) {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            observer.unobserve(e.target);
            reveal(e.target);
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
      );
    }
    root.querySelectorAll(REVEAL).forEach((el) => {
      if (el.dataset.reveal || el.closest(".topbar, .tabbar, .sidebar, dialog")) return;
      if (el.parentElement && el.parentElement.closest("[data-reveal]")) return; // 바깥 덩어리가 이미 움직이면 안쪽은 그대로
      el.dataset.reveal = "1";
      // 같은 줄의 형제끼리는 조금씩 늦게
      const siblings = Array.from(el.parentElement ? el.parentElement.children : []).filter((c) => c.dataset.reveal);
      el.style.setProperty("--reveal-delay", Math.min(siblings.indexOf(el), 6) * 70 + "ms");
      observer.observe(el);
    });
    root.querySelectorAll(".progress, .bars").forEach((el) => {
      if (el.dataset.anim) return;
      el.dataset.anim = "1";
      el.classList.add("is-pre");
      if (!el.closest("[data-reveal]")) observer.observe(el);
    });
    root.querySelectorAll(NUMBER).forEach((el) => {
      if (!el.closest("[data-reveal]")) observer.observe(el);
    });
  }

  function go(name, options) {
    const target = document.querySelector('[data-screen="' + name + '"]');
    if (!target) {
      toast("미리보기에 없는 화면이에요");
      return;
    }
    screens().forEach((s) => {
      s.hidden = s !== target;
    });
    document.querySelectorAll("[data-go]").forEach((el) => {
      const on = el.getAttribute("data-go") === name;
      el.classList.toggle("is-active", on);
      if (el.closest(".nav, .tabbar, .sidebar")) el.setAttribute("aria-current", on ? "page" : "false");
    });
    const prev = current;
    current = name;
    if (!(options && options.keepScroll)) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    drawIcons(target);
    (listeners[name] || []).forEach((fn) => safe(fn, prev));
    post({ type: "screen", name, title: target.getAttribute("data-title") || name });
    // 혹시 관찰이 늦어도 보이는 곳은 1.2초 안에 반드시 나타나게
    setTimeout(() => {
      target.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) reveal(el);
      });
    }, 1200);
  }

  function safe(fn, arg) {
    try {
      fn(arg);
    } catch (err) {
      report(err);
    }
  }

  function report(err) {
    const message = (err && (err.message || String(err))) || "알 수 없는 오류";
    post({ type: "error", message });
  }

  function toast(text) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 2200);
  }

  function open(id) {
    const d = document.getElementById(id);
    if (d && typeof d.showModal === "function" && !d.open) {
      d.showModal();
      drawIcons(d);
    }
  }

  function close(id) {
    const d = id ? document.getElementById(id) : document.querySelector("dialog[open]");
    if (d && d.open) d.close();
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 버튼에 잠깐 "처리 중" 표시를 했다가 끝낸다 (가짜 저장·결제용)
  async function busy(button, ms) {
    if (!button) return wait(ms || 700);
    button.classList.add("is-loading");
    await wait(ms || 700);
    button.classList.remove("is-loading");
  }

  function won(n) {
    return Number(n || 0).toLocaleString("ko-KR") + "원";
  }

  function formData(form) {
    const out = {};
    new FormData(form).forEach((value, key) => {
      out[key] = typeof value === "string" ? value.trim() : value;
    });
    return out;
  }

  function escape(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // 없는 요소를 찾으면 null 대신 아무 일도 하지 않는 대역을 돌려준다.
  // AI 가 쓴 코드의 한 줄 실수(없는 id)로 그 뒤의 동작이 모두 멈추지 않게 하려는 것. 실수는 바깥 창에 알린다.
  const NOTHING = new Proxy(function () {}, {
    get: (t, key) => {
      if (key === Symbol.toPrimitive) return () => "";
      if (key === Symbol.iterator) return function* () {};
      if (key === "length") return 0;
      return NOTHING;
    },
    set: () => true,
    apply: () => NOTHING,
  });

  function find(sel, root) {
    const el = (root || document).querySelector(sel);
    if (!el) post({ type: "warn", message: "없는 요소: " + sel });
    return el || NOTHING;
  }

  // 이벤트 위임: 나중에 다시 그린 요소에도 그대로 걸린다
  function on(type, selector, fn) {
    document.addEventListener(type, (e) => {
      const target = e.target.closest && e.target.closest(selector);
      if (target) safe(() => fn(e, target));
    });
  }

  window.App = {
    state: {},
    on,
    go,
    onScreen(name, fn) {
      (listeners[name] = listeners[name] || []).push(fn);
    },
    get screen() {
      return current;
    },
    toast,
    open,
    close,
    wait,
    busy,
    won,
    formData,
    escape,
    $: find,
    $$: (sel, root) => Array.from((root || document).querySelectorAll(sel)),
    icons: drawIcons,
  };

  window.addEventListener("error", (e) => report(e.error || e.message));
  window.addEventListener("unhandledrejection", (e) => report(e.reason));

  // 바깥 창에서 "이 화면 보여 줘"
  window.addEventListener("message", (e) => {
    if (e.data && e.data.source === "dotprd-host" && e.data.type === "go") go(e.data.name);
  });

  document.addEventListener(
    "click",
    (e) => {
      const goEl = e.target.closest("[data-go]");
      if (goEl) {
        e.preventDefault();
        go(goEl.getAttribute("data-go"));
        return;
      }
      const closeEl = e.target.closest("[data-close]");
      if (closeEl) {
        e.preventDefault();
        const d = closeEl.closest("dialog");
        if (d) d.close();
        return;
      }
      const openEl = e.target.closest("[data-open]");
      if (openEl) {
        e.preventDefault();
        open(openEl.getAttribute("data-open"));
        return;
      }
      const pressEl = e.target.closest(".choices .choice, .segmented button, .tabs button");
      if (pressEl && !pressEl.hasAttribute("data-multi")) {
        const group = pressEl.parentElement;
        group.querySelectorAll(".choice, button").forEach((b) => {
          b.classList.toggle("is-selected", b === pressEl);
          b.setAttribute("aria-pressed", b === pressEl ? "true" : "false");
        });
      } else if (pressEl) {
        const on = pressEl.getAttribute("aria-pressed") !== "true";
        pressEl.classList.toggle("is-selected", on);
        pressEl.setAttribute("aria-pressed", on ? "true" : "false");
      }
      const sw = e.target.closest(".switch");
      if (sw) sw.setAttribute("aria-checked", sw.getAttribute("aria-checked") === "true" ? "false" : "true");
      // 미리보기 밖으로 나가는 링크는 열지 않는다
      const a = e.target.closest("a[href]");
      if (a && !goEl) {
        e.preventDefault();
        toast("미리보기에서는 다른 페이지로 나가지 않아요");
      }
    },
    true,
  );

  // 처리기가 없는 폼도 페이지를 새로 불러오지 않게
  document.addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
    },
    true,
  );

  document.addEventListener("DOMContentLoaded", () => {
    // 흐르는 띠는 같은 내용을 한 번 더 붙여 끊김 없이 돈다
    document.querySelectorAll(".ticker-track").forEach((t) => {
      if (t.dataset.doubled) return;
      t.innerHTML += t.innerHTML;
      t.dataset.doubled = "1";
    });
    drawIcons(document);
    prepareMotion(document);
    new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n.nodeType === 1 && drawIcons(n));
    }).observe(document.body, { childList: true, subtree: true });
    const first = screens()[0];
    const start = document.querySelector('[data-screen="home"]') ? "home" : first && first.getAttribute("data-screen");
    if (start) go(start, { keepScroll: true });
    post({
      type: "ready",
      screens: screens().map((s) => ({ name: s.getAttribute("data-screen"), title: s.getAttribute("data-title") || "" })),
    });
  });
})();
