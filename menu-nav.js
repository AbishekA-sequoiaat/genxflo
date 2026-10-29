/*
 * menu-nav.js — turns the site header into a compact "Menu" bar:
 *   [ ≡ Menu ]        [ GenXflo logo ]        [ Login ] [ Register ]
 * Clicking Menu expands the bar downward and lists every navigation link. Load it after site.js.
 * It reads the links site.js already built, so the menu always matches the site navigation.
 */
(function () {
  'use strict';
  var host = document.querySelector('#site-header');
  var rail = host && host.querySelector('.site-nav');
  if (!host || !rail) return;

  var logoImg = host.querySelector('.brand img');
  var logoSrc = logoImg ? logoImg.getAttribute('src').replace('genxflo-logo-dark.svg', 'genxflo-logo.svg') : 'genxflo-logo.svg';
  var homeHref = host.querySelector('.brand') ? host.querySelector('.brand').getAttribute('href') : 'index.html';
  var login = 'https://genxflo.com/app/login', register = 'https://genxflo.com/app/register';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  // collect the columns from the existing navigation
  var columns = [];
  [].forEach.call(rail.children, function (el) {
    if (el.matches('details.nav-group')) {
      var label = el.querySelector('summary').textContent.trim();
      var links = [].map.call(el.querySelectorAll('.nav-submenu a'), function (a) { return [a.textContent.trim(), a.getAttribute('href')]; });
      columns.push({ label: label, links: links });
    } else if (el.matches('a') && el.textContent.trim() && el.textContent.trim() !== 'Login') {
      columns.push({ label: '', links: [[el.textContent.trim(), el.getAttribute('href')]] });
    }
  });

  var cols = columns.map(function (c) {
    return '<div class="mn-col">' + (c.label ? '<p class="mn-label">' + esc(c.label) + '</p>' : '<p class="mn-label">Product</p>') +
      '<ul>' + c.links.map(function (l) { return '<li><a href="' + l[1] + '">' + esc(l[0]) + '</a></li>'; }).join('') + '</ul></div>';
  }).join('');

  host.classList.add('mn-host');
  host.innerHTML =
    '<div class="mn" data-open="false">' +
      '<div class="mn-bar">' +
        '<button class="mn-menu" type="button" aria-expanded="false" aria-controls="mn-panel"><span class="mn-lines" aria-hidden="true"><i></i><i></i></span><span class="mn-menu-text">Menu</span></button>' +
        '<a class="mn-logo" href="' + homeHref + '" aria-label="GenXflo home"><img src="' + logoSrc + '" alt="GenXflo" width="1682" height="553"></a>' +
        '<div class="mn-actions"><a class="mn-login" href="' + login + '">Login</a><a class="mn-join" href="' + register + '">Register</a></div>' +
      '</div>' +
      '<div class="mn-panel" id="mn-panel" role="region" aria-label="Site navigation"><div class="mn-panel-inner"><div class="mn-cols">' + cols + '</div></div></div>' +
    '</div>';

  var root = host.querySelector('.mn');
  var button = host.querySelector('.mn-menu');
  var panel = host.querySelector('.mn-panel');
  panel.inert = true;

  function setOpen(open) {
    root.setAttribute('data-open', String(open));
    button.setAttribute('aria-expanded', String(open));
    panel.inert = !open;
  }
  button.addEventListener('click', function () { setOpen(root.getAttribute('data-open') !== 'true'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.getAttribute('data-open') === 'true') { setOpen(false); button.focus(); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (root.getAttribute('data-open') === 'true' && !root.contains(e.target)) setOpen(false);
  });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
})();
