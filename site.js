const pageBase = window.location.pathname.includes('/pages/') ? '../' : './';
const pageLinks = [
  ['Product Overview', 'pages/product-overview.html'],
  ['AI Features', 'pages/ai-features.html'],
  ['Learn', 'pages/learn.html'],
  ['WML Integration', 'pages/integrations.html'],
  ['GenXflo Export', 'pages/workflow-export.html'],
  ['Comparison', 'pages/comparison.html'],
  ['Use Cases', 'pages/use-cases.html'],
  ['Documentation', 'pages/documentation.html']
];
const navigationGroups = [
  ['Platform', ['AI Features', 'WML Integration', 'GenXflo Export']],
  ['Explore', ['Use Cases', 'Comparison', 'Learn', 'Documentation']]
].map(([label, linkLabels]) => [label, pageLinks.filter(([linkLabel]) => linkLabels.includes(linkLabel))]);
const localLink = (path) => `${pageBase}${path}`;

const header = document.querySelector('#site-header');
if (header) {
  if (document.body.classList.contains('home-page')) {
    const navItemClass = 'inline-flex min-w-[94px] items-center justify-center rounded-full border border-transparent px-[.8rem] py-[.52rem] text-[.92rem] leading-none text-home-muted no-underline transition hover:border-[rgba(61,199,139,.4)] hover:bg-[rgba(31,186,118,.12)] hover:text-home-ink hover:shadow-[0_8px_18px_rgba(6,160,101,.18)]';
    const groupedNavigation = navigationGroups.map(([label, links]) => `<details class="nav-group group relative border-0 p-0 max-[900px]:w-full"><summary class="inline-flex min-w-[94px] cursor-pointer list-none items-center justify-center gap-[.45rem] rounded-full border border-transparent px-[.8rem] py-[.52rem] text-[.92rem] leading-none text-home-muted hover:text-home-ink max-[900px]:w-full max-[900px]:justify-start">${label}<i class="ph-bold ph-caret-down shrink-0 text-[.875rem] text-home-green transition-transform duration-200 group-open:rotate-180"></i></summary><div class="nav-submenu absolute left-0 top-[calc(100%+.45rem)] z-30 grid before:absolute before:inset-x-0 before:-top-3 before:h-3 before:content-[''] max-[900px]:before:hidden min-w-[230px] gap-[.15rem] rounded-md bg-[#050505] p-[.4rem] shadow-[0_12px_32px_rgba(0,0,0,.38)] max-[900px]:static max-[900px]:min-w-0 max-[900px]:bg-transparent max-[900px]:py-1 max-[900px]:pl-3 max-[900px]:shadow-none">${links.map(([linkLabel, path]) => `<a class="block min-w-0 rounded-md px-[.8rem] py-[.65rem] text-home-muted no-underline hover:bg-[rgba(6,160,101,.16)] hover:text-home-ink" href="${localLink(path)}">${linkLabel}</a>`).join('')}</div></details>`).join('');
    header.innerHTML = `<header class="dashboard-rail mx-auto flex w-[min(1500px,calc(100%-60px))] items-center justify-between max-[1000px]:grid max-[1000px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-[1.2rem] px-0 py-[.45rem] max-[1000px]:grid-rows-[auto_auto] max-[1000px]:gap-y-1 max-[900px]:flex max-[900px]:flex-wrap max-[900px]:justify-between max-[900px]:gap-3"><div class="rail-top col-start-1 flex items-center max-[900px]:min-w-0 max-[1000px]:row-start-1 max-[900px]:flex-none"><a class="brand inline-flex items-center" href="${localLink('index.html')}" aria-label="GenXflo home"><img class="block h-9 w-auto max-[600px]:h-8" src="${localLink('genxflo-logo.svg')}" alt="GenXflo" width="1682" height="553"></a></div><nav class="site-nav col-start-2 flex w-max max-[900px]:order-3 items-center justify-center gap-[.45rem] border-0 bg-transparent p-[.2rem] max-[1000px]:col-span-3 max-[1000px]:row-start-2 max-[1000px]:justify-self-center max-[900px]:static max-[900px]:w-full max-[900px]:flex-col max-[900px]:items-stretch max-[900px]:justify-start max-[900px]:gap-1 max-[900px]:py-1 max-[900px]:hidden" id="primary-nav" aria-label="Site navigation"><a class="${navItemClass}" href="${localLink('index.html')}" aria-current="page">Home</a><a class="${navItemClass}" href="${localLink('pages/product-overview.html')}">Product Overview</a>${groupedNavigation}<a class="hidden rounded-md px-[.8rem] py-[.65rem] text-[.92rem] font-semibold text-home-ink no-underline hover:bg-[rgba(6,160,101,.16)] max-[900px]:block" href="https://genxflo.com/app/login">Login</a></nav><div class="rail-actions col-start-3 ml-0 flex max-[900px]:ml-auto items-center justify-self-end gap-[.8rem] max-[1000px]:row-start-1 max-[900px]:m-0 max-[900px]:gap-[.7rem]"><a class="button inline-block cursor-pointer rounded-md border-0 bg-[#4ce3a3] px-[.9rem] py-[.6rem] font-sans font-bold text-[#172014] no-underline hover:bg-[#24bd7d] max-[900px]:px-[.65rem] max-[900px]:py-[.55rem] max-[900px]:text-[.85rem]" href="https://genxflo.com/app/register">Register</a><a class="inline-block cursor-pointer rounded-md border border-white/15 bg-white/[.08] max-[900px]:hidden px-[.9rem] py-[.6rem] font-sans font-bold text-home-ink no-underline transition-[background-color,border-color] hover:border-[#4ce3a3]/50 hover:bg-white/[.14] max-[900px]:px-[.65rem] max-[900px]:py-[.55rem] max-[900px]:text-[.85rem]" href="https://genxflo.com/app/login">Login</a><button class="nav-toggle hidden size-10 cursor-pointer place-items-center rounded-md border border-home-line bg-[#14231e] text-home-ink max-[900px]:grid" type="button" aria-controls="primary-nav" aria-expanded="false" aria-label="Menu"><i class="ph-bold ph-list text-[1.25rem]"></i></button></div></header>`;
    const menuButton = header.querySelector('.nav-toggle');
    const siteNav = header.querySelector('.site-nav');
    const navGroups = [...siteNav.querySelectorAll('.nav-group')];
    const desktopNavigation = window.matchMedia('(min-width: 901px)');
    const closeOtherGroups = (activeGroup) => navGroups.forEach((group) => {
      if (group !== activeGroup) group.open = false;
    });

    menuButton.addEventListener('click', () => {
      const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isExpanded));
      menuButton.innerHTML = isExpanded ? `<i class="ph-bold ph-list text-[1.25rem]"></i>` : `<i class="ph-bold ph-x text-[1.25rem]"></i>`;
      siteNav.classList.toggle('max-[900px]:hidden', isExpanded);
    });

    navGroups.forEach((group) => {
      group.querySelector('summary').addEventListener('click', (event) => {
        if (desktopNavigation.matches && event.detail > 0 && group.open) event.preventDefault();
      });
      let closeTimer;
      group.addEventListener('pointerenter', () => {
        if (!desktopNavigation.matches) return;
        clearTimeout(closeTimer);
        closeOtherGroups(group);
        group.open = true;
      });
      group.addEventListener('pointerleave', () => {
        if (!desktopNavigation.matches) return;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
          if (!group.matches(':hover') && !group.contains(document.activeElement)) group.open = false;
        }, 180);
      });
      group.addEventListener('focusout', (event) => {
        if (!group.contains(event.relatedTarget) && !group.matches(':hover')) group.open = false;
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const openGroup = navGroups.find((group) => group.open);
      if (!openGroup) return;
      openGroup.open = false;
      openGroup.querySelector('summary').focus();
      event.preventDefault();
    });

    document.addEventListener('pointerdown', (event) => {
      if (!siteNav.contains(event.target)) navGroups.forEach((group) => { group.open = false; });
    });
  } else {
    header.innerHTML = `<header class="site-header-inner"><a class="brand" href="${localLink('index.html')}" aria-label="GenXflo home"><img src="${localLink('genxflo-logo.svg')}" alt="GenXflo" width="1682" height="553" style="display:block;height:2.2rem;width:auto"></a><nav class="site-nav" aria-label="Main navigation"><a href="${localLink('index.html')}">Home</a><a href="${localLink('pages/product-overview.html')}">Product Overview</a><a href="${localLink('pages/learn.html')}">Learn</a><a href="${localLink('index.html#contact')}">Contact Us</a></nav><div class="header-actions"><a href="https://genxflo.com/app/register">Register</a><a href="https://genxflo.com/app/login">Login</a></div></header>`;
  }
}

const footer = document.querySelector('#site-footer');
if (footer) {
  if (document.body.classList.contains('home-page')) {
    footer.innerHTML = `<footer class="site-footer border-t border-home-line bg-transparent py-10"><div class="footer-grid mx-auto grid w-[min(1500px,calc(100%-60px))] grid-cols-[1fr_2fr_1.2fr] gap-8 max-[850px]:grid-cols-[1fr_1.4fr] max-[600px]:w-[calc(100%-32px)] max-[600px]:grid-cols-1"><div><a class="mb-4 inline-block" href="${localLink('index.html')}" aria-label="GenXflo home"><img class="block h-9 w-auto" src="${localLink('genxflo-logo.svg')}" alt="GenXflo" width="1682" height="553" loading="lazy"></a><nav class="flex flex-wrap items-center gap-2 text-[.9rem] text-home-muted" aria-label="Social links"><a class="text-home-green underline-offset-4" href="https://www.instagram.com/sequoia.at/?utm_source=ig_web_button_share_sheet&amp;igsh=ZDNlZDc0MzIxNw%3D%3D#">Instagram</a><span aria-hidden="true">·</span><a class="text-home-green underline-offset-4" href="https://www.facebook.com/sequoiaAT">Facebook</a><span aria-hidden="true">·</span><a class="text-home-green underline-offset-4" href="https://in.linkedin.com/company/sequoiaat">LinkedIn</a></nav><p class="mt-5 text-[.85rem] text-home-muted">© Powered by</p><img class="mt-3 block max-h-[45px] max-w-[110px] object-contain" src="https://genxflo.com/images/SAT-Logo.png" alt="SAT Logo"></div><div><h2 class="mb-4 font-display text-base font-bold text-home-ink">Quick links</h2><nav class="footer-links grid grid-cols-2 gap-x-5 gap-y-2" aria-label="Quick links">${pageLinks.map(([label, path]) => `<a class="text-[.94rem] text-home-green underline-offset-4" href="${localLink(path)}">${label}</a>`).join('')}</nav></div><div class="footer-contact max-[850px]:col-span-2 max-[600px]:col-span-1"><p class="mb-2 text-home-muted">2727 Walsh Ave, Ste 206, Santa Clara, CA 95051</p><p class="mb-2 text-home-muted"><a class="text-home-green underline-offset-4" href="tel:+12248305575">+1 224 830 5575</a></p><p class="mb-2 text-home-muted"><a class="text-home-green underline-offset-4" href="mailto:admin@genxflo.com">admin@genxflo.com</a></p><p class="mb-2 text-home-muted"><a class="text-home-green underline-offset-4" href="${localLink('pages/documentation.html')}">Documentation</a></p></div></div></footer>`;
  } else {
    footer.innerHTML = `<footer class="site-footer"><div class="footer-grid"><div><a href="${localLink('index.html')}" aria-label="GenXflo home"><img src="${localLink('genxflo-logo.svg')}" alt="GenXflo" width="1682" height="553" loading="lazy" style="display:block;height:2.2rem;width:auto;margin-bottom:1rem"></a><nav aria-label="Social links"><a href="https://www.instagram.com/sequoia.at/?utm_source=ig_web_button_share_sheet&amp;igsh=ZDNlZDc0MzIxNw%3D%3D#">Instagram</a> · <a href="https://www.facebook.com/sequoiaAT">Facebook</a> · <a href="https://in.linkedin.com/company/sequoiaat">LinkedIn</a></nav><p class="powered">© Powered by</p><img src="https://genxflo.com/images/SAT-Logo.png" alt="SAT Logo"></div><div><h2>Quick links</h2><nav class="footer-links" aria-label="Quick links">${pageLinks.map(([label, path]) => `<a href="${localLink(path)}">${label}</a>`).join('')}</nav></div><div class="footer-contact"><p>2727 Walsh Ave, Ste 206, Santa Clara, CA 95051</p><p><a href="tel:+12248305575">+1 224 830 5575</a></p><p><a href="mailto:admin@genxflo.com">admin@genxflo.com</a></p><p><a href="${localLink('pages/documentation.html')}">Documentation</a></p></div></div></footer>`;
  }
}

const message = document.querySelector('textarea[name="Message"]');
const counter = document.querySelector('#message-count');
if (message && counter) {
  const updateCounter = () => { counter.textContent = `${message.value.length}/3000`; };
  message.addEventListener('input', updateCounter);
  message.form?.addEventListener('reset', () => { window.setTimeout(updateCounter, 0); });
}

const marquee = document.querySelector('.release-track');
const marqueeToggle = document.querySelector('.marquee-toggle');
if (marquee && marqueeToggle) {
  marqueeToggle.addEventListener('click', () => {
    const isPaused = marquee.classList.toggle('is-paused');
    marqueeToggle.setAttribute('aria-pressed', String(isPaused));
    marqueeToggle.textContent = isPaused ? 'Resume' : 'Pause';
  });
}

const releaseWindow = document.querySelector('.release-window');
if (marquee && releaseWindow && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const SECONDS_PER_LOOP = 34;
  let offset = 0;
  let velocity = 0;
  let hovering = false;
  let started = false;
  let dragging = false;
  let lastY = 0;
  let lastTime = performance.now();
  let lastMoveTime = 0;
  const loopHeight = () => marquee.scrollHeight / 2;
  const render = () => {
    const h = loopHeight();
    if (h > 0) offset = ((offset % h) + h) % h;
    marquee.style.transform = `translate3d(0, ${-offset}px, 0)`;
  };
  const tick = (now) => {
    if (!started) { started = true; offset = Math.max(loopHeight() - 56, 0); }
    const dt = Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    if (!dragging) {
      if (Math.abs(velocity) > 1) {
        offset -= velocity * dt;
        velocity *= Math.pow(.04, dt);
      } else {
        velocity = 0;
        const paused = hovering || marquee.classList.contains('is-paused');
        if (!paused) offset += (loopHeight() / SECONDS_PER_LOOP) * dt;
      }
    }
    render();
    requestAnimationFrame(tick);
  };
  releaseWindow.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastY = e.clientY;
    velocity = 0;
    lastMoveTime = e.timeStamp;
    releaseWindow.setPointerCapture(e.pointerId);
  });
  releaseWindow.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - lastY;
    const dt = Math.max((e.timeStamp - lastMoveTime) / 1000, .016);
    lastY = e.clientY;
    offset -= dy;
    velocity = dy / dt;
    lastMoveTime = e.timeStamp;
    render();
  });
  const endDrag = () => { dragging = false; };
  releaseWindow.addEventListener('pointerup', endDrag);
  releaseWindow.addEventListener('pointercancel', endDrag);
  releaseWindow.addEventListener('mouseenter', () => { hovering = true; });
  releaseWindow.addEventListener('mouseleave', () => { hovering = false; });
  // cursor-following "Drag" badge (mouse only)
  const dragBadge = document.createElement('div');
  dragBadge.setAttribute('aria-hidden', 'true');
  dragBadge.className = 'pointer-events-none fixed left-0 top-0 z-40 inline-flex items-center gap-1.5 rounded-md bg-[#4ce3a3] px-2.5 py-1.5 text-[.72rem] font-bold leading-none text-[#06170f] opacity-0 shadow-[0_8px_24px_rgba(6,160,101,.35)] transition-opacity duration-150';
  dragBadge.innerHTML = '<i class="ph-bold ph-arrows-down-up"></i>Drag';
  document.body.appendChild(dragBadge);
  const moveBadge = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    dragBadge.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 18}px)`;
  };
  releaseWindow.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    moveBadge(e);
    dragBadge.style.opacity = '1';
  });
  releaseWindow.addEventListener('pointermove', moveBadge);
  releaseWindow.addEventListener('pointerleave', () => { dragBadge.style.opacity = '0'; });
  releaseWindow.addEventListener('dragstart', (e) => e.preventDefault());
  requestAnimationFrame(tick);
}

const stickyHeader = document.querySelector('#site-header');
if (stickyHeader) {
  const syncHeaderBackground = () => stickyHeader.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', syncHeaderBackground, { passive: true });
  syncHeaderBackground();
}

// keep sticky offsets in sync with the real header height
const siteHeaderEl = document.querySelector('#site-header');
if (siteHeaderEl) {
  const syncHeaderHeight = () => document.documentElement.style.setProperty('--header-h', `${siteHeaderEl.offsetHeight}px`);
  syncHeaderHeight();
  if ('ResizeObserver' in window) new ResizeObserver(syncHeaderHeight).observe(siteHeaderEl);
  window.addEventListener('resize', syncHeaderHeight);
}

// edge fades on horizontally scrolling tab bars
const pageNav = document.querySelector('#page-nav');
if (pageNav) {
  const syncFades = () => {
    const max = pageNav.scrollWidth - pageNav.clientWidth;
    pageNav.classList.toggle('fade-l', max > 4 && pageNav.scrollLeft > 4);
    pageNav.classList.toggle('fade-r', max > 4 && pageNav.scrollLeft < max - 4);
  };
  pageNav.addEventListener('scroll', syncFades, { passive: true });
  window.addEventListener('resize', syncFades);
  window.addEventListener('load', syncFades);
  syncFades();
}

// collapse long subsections on small screens (keep the first one open)
if (window.matchMedia('(max-width: 700px)').matches) {
  document.querySelectorAll('[data-collapsible-group]').forEach((group) => {
    group.querySelectorAll('details[data-collapsible]').forEach((d, i) => { d.open = i === 0; });
  });
}

// back-to-top button
const toTop = document.createElement('button');
toTop.type = 'button';
toTop.setAttribute('aria-label', 'Back to top');
toTop.className = 'fixed bottom-5 right-5 z-30 grid size-11 translate-y-3 cursor-pointer place-items-center rounded-md border border-[#4ce3a3] bg-[#4ce3a3] text-[#06170f] opacity-0 shadow-[0_10px_28px_rgba(6,160,101,.35)] transition-[opacity,transform] duration-200 pointer-events-none hover:bg-[#24bd7d] max-[600px]:bottom-4 max-[600px]:right-4';
toTop.innerHTML = '<i class="ph-bold ph-caret-up text-[1.25rem]"></i>';
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
document.body.appendChild(toTop);
const syncToTop = () => {
  const show = window.scrollY > 900;
  toTop.classList.toggle('opacity-0', !show);
  toTop.classList.toggle('translate-y-3', !show);
  toTop.classList.toggle('pointer-events-none', !show);
};
window.addEventListener('scroll', syncToTop, { passive: true });
syncToTop();

// hero video: pause / play control
const heroVideo = document.querySelector("#hero-video");
const videoToggle = document.querySelector(".video-toggle");
if (heroVideo && videoToggle) {
  const pauseIcon = '<i class="ph-bold ph-pause"></i>';
  const playIcon = '<i class="ph-bold ph-play"></i>';
  videoToggle.addEventListener("click", () => {
    const paused = heroVideo.paused;
    if (paused) heroVideo.play(); else heroVideo.pause();
    videoToggle.setAttribute("aria-pressed", String(!paused));
    videoToggle.setAttribute("aria-label", paused ? "Pause video" : "Play video");
    videoToggle.innerHTML = paused ? pauseIcon : playIcon;
  });
}

// hero video: full screen
const videoFull = document.querySelector('.video-fullscreen');
if (heroVideo && videoFull) {
  videoFull.addEventListener('click', () => {
    if (heroVideo.requestFullscreen) heroVideo.requestFullscreen();
    else if (heroVideo.webkitRequestFullscreen) heroVideo.webkitRequestFullscreen();
    else if (heroVideo.webkitEnterFullscreen) heroVideo.webkitEnterFullscreen();
  });
}

// research teams: expandable panels
const teamList = document.querySelector('.team-panels');
if (teamList) {
  const panels = [...teamList.querySelectorAll('.team-panel')];
  const activate = (panel) => panels.forEach((p) => p.classList.toggle('is-active', p === panel));
  panels.forEach((panel) => {
    panel.addEventListener('pointerenter', () => activate(panel));
    panel.addEventListener('focusin', () => activate(panel));
    panel.addEventListener('pointermove', (e) => {
      const r = panel.getBoundingClientRect();
      const link = panel.firstElementChild;
      link.style.setProperty('--mx', `${e.clientX - r.left}px`);
      link.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}
