const pageBase = window.location.pathname.includes('/pages/') ? '../' : './';
const pageLinks = [
  ['Product Overview', 'pages/product-overview.html'],
  ['AI Features', 'pages/ai-features.html'],
  ['Learn', 'pages/learn.html'],
  ['WML Integration', 'pages/integrations.html'],
  ['GenXflo Export', 'pages/workflow-export.html'],
  ['Comparison', 'pages/comparison.html'],
  ['Use Cases', 'pages/use-cases.html']
];
const localLink = (path) => `${pageBase}${path}`;

const header = document.querySelector('#site-header');
if (header) {
  if (document.body.classList.contains('home-page')) {
    const siteNavigation = [['Home', 'index.html'], ...pageLinks];
    header.innerHTML = `<header class="dashboard-rail"><div class="rail-top"><a class="brand" href="${localLink('index.html')}"><span class="brand-mark" aria-hidden="true">G</span><span>GenXflo</span></a><button class="nav-toggle" type="button" aria-controls="primary-nav" aria-expanded="false">Menu</button></div><nav class="site-nav" id="primary-nav" aria-label="Site navigation">${siteNavigation.map(([label, path], index) => `<a href="${localLink(path)}"${index === 0 ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav><details class="home-toc"><summary>On this page</summary><nav aria-label="Homepage sections"><a href="#whats-new">What's New in GenXflo</a><a href="#ai-workflow">We integrated AI to ease the workflow</a><a href="#workflow-steps">Create Visual Nextflow Pipelines in 3 Easy Steps</a><a href="#why-genxflo">Why GenXflo?</a><a href="#research-teams">Built for Modern Research Teams</a><a href="#contact">Contact Us</a><a href="#faqs">Frequently Asked Questions</a></nav></details><div class="rail-actions"><a class="button" href="https://genxflo.com/app/register">Start Building</a><a href="https://genxflo.com/app/login">Login</a></div></header>`;
    const menuButton = header.querySelector('.nav-toggle');
    const siteNav = header.querySelector('.site-nav');
    menuButton.addEventListener('click', () => {
      const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isExpanded));
      siteNav.classList.toggle('is-open', !isExpanded);
    });
  } else {
    header.innerHTML = `<header class="site-header-inner"><a class="brand" href="${localLink('index.html')}">GenXflo</a><nav class="site-nav" aria-label="Main navigation"><a href="${localLink('index.html')}">Home</a><a href="${localLink('pages/product-overview.html')}">Product Overview</a><a href="${localLink('pages/learn.html')}">Learn</a><a href="${localLink('index.html#contact')}">Contact Us</a></nav><div class="header-actions"><a href="https://genxflo.com/app/register">Register</a><a href="https://genxflo.com/app/login">Login</a></div></header>`;
  }
}

const footer = document.querySelector('#site-footer');
if (footer) {
  footer.innerHTML = `<footer class="site-footer"><div class="footer-grid"><div><h2>GenXflo</h2><nav aria-label="Social links"><a href="https://www.instagram.com/sequoia.at/?utm_source=ig_web_button_share_sheet&amp;igsh=ZDNlZDc0MzIxNw%3D%3D#">Instagram</a> · <a href="https://www.facebook.com/sequoiaAT">Facebook</a> · <a href="https://in.linkedin.com/company/sequoiaat">LinkedIn</a></nav><p class="powered">© Powered by</p><img src="https://genxflo.com/images/SAT-Logo.png" alt="SAT Logo"></div><div><h2>Quick links</h2><nav class="footer-links" aria-label="Quick links">${pageLinks.map(([label, path]) => `<a href="${localLink(path)}">${label}</a>`).join('')}</nav></div><div class="footer-contact"><p>2727 Walsh Ave, Ste 206, Santa Clara, CA 95051</p><p><a href="tel:+12248305575">+1 224 830 5575</a></p><p><a href="mailto:admin@genxflo.com">admin@genxflo.com</a></p><p><a href="https://genxflo.com/app/resources">Documentation</a></p></div></div></footer>`;
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
