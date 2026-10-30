/*
 * page-v2.js — brings the home page's closing call-to-action to the content pages:
 * a green-sky panel with the headline and three dark stat cards, added just above the footer.
 */
(function () {
  'use strict';
  var main = document.querySelector('main');
  var footer = document.getElementById('site-footer');
  if (!main || !footer || document.querySelector('.pcta')) return;
  var s = document.createElement('section');
  s.className = 'pcta';
  s.setAttribute('aria-labelledby', 'pcta-title');
  s.innerHTML =
    '<div class="pcta-frame">' +
      '<div class="pcta-sky" aria-hidden="true"></div>' +
      '<div class="pcta-copy">' +
        '<h2 id="pcta-title">Build your first reproducible pipeline</h2>' +
        '<p>Design, validate and export Nextflow pipelines on a visual canvas, with no pipeline syntax to write.</p>' +
        '<div class="pcta-actions">' +
          '<a class="pcta-go" href="https://genxflo.com/app/register">Start Building <span aria-hidden="true"><i class="ph-bold ph-arrow-up-right"></i></span></a>' +
          '<a class="pcta-alt" href="../index.html#contact">Get in touch</a>' +
        '</div>' +
      '</div>' +
      '<div class="pcta-cards">' +
        '<div><strong>36h</strong><span>Saved per pipeline</span></div>' +
        '<div><strong>10&times;</strong><span>Less time building</span></div>' +
        '<div><strong>0</strong><span>Lines of syntax to write</span></div>' +
      '</div>' +
    '</div>';
  footer.parentNode.insertBefore(s, footer);
})();
