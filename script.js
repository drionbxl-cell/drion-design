(function(){
  "use strict";

  // ---- Year in footer ----
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- Preference d'animation reduite ----
  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // La video est masquee en CSS sous 640px (voir style.css) : on
  // evite aussi de la telecharger et de la lancer dans ce cas,
  // pas la peine de consommer data et batterie pour un element
  // invisible.
  var isNarrowScreen = window.matchMedia
    ? window.matchMedia('(max-width: 640px)').matches
    : false;

  // ---- Video hero : chargement differe + respect de reduced-motion ----
  // Le CSS ne peut pas empecher une <video> de jouer : il faut le faire ici.
  // On ne charge le fichier (1,6 Mo) qu'apres le rendu de la page, et
  // jamais si l'utilisateur a demande la reduction des animations.
  // ---- Aide reutilisable pour charger/lancer une video en douceur ----
  function lazyLoadVideo(el){
    if (!el) return;
    var start = function(){
      var src = el.dataset.src;
      if (!src || el.src) return;
      el.src = src;
      el.load();
      var p = el.play();
      if (p && p.catch) p.catch(function(){ /* autoplay refuse : le poster reste */ });
    };
    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if (e.isIntersecting) { start(); vio.unobserve(e.target); }
        });
      }, { rootMargin: '200px' });
      vio.observe(el);
    } else if (document.readyState === 'complete') {
      start();
    } else {
      window.addEventListener('load', start);
    }
  }

  // Video du hero : desktop/tablette uniquement (masquee sur mobile
  // en CSS, jamais meme chargee ici dans ce cas).
  var heroVideo = document.getElementById('heroVideo');
  if (heroVideo && !reduceMotion && !isNarrowScreen) {
    lazyLoadVideo(heroVideo);
  }

  // ---- Build filmstrip from all gallery images ----
  var track = document.getElementById('filmstripTrack');
  if (track) {
    var allImgs = Array.prototype.slice.call(document.querySelectorAll('.card img'));
    var picks = allImgs.slice(0, 40);
    var frag = document.createDocumentFragment();
    function addSet(){
      picks.forEach(function(img){
        var clone = document.createElement('img');
        clone.src = img.getAttribute('src');
        clone.alt = "";
        clone.loading = "lazy";
        frag.appendChild(clone);
      });
    }
    addSet(); addSet(); // duplicate for seamless loop
    track.appendChild(frag);
  }

  // ---- Scroll reveal ----
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  // ---- Section accent switching + nav active state ----
  var sections = Array.prototype.slice.call(document.querySelectorAll('section.category'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('nav.catlinks a'));
  var root = document.documentElement;

  function setAccentFromVar(varName){
    var val = getComputedStyle(root).getPropertyValue(varName).trim();
    if (val) root.style.setProperty('--section-accent', val);
  }

  navLinks.forEach(function(link){
    link.style.setProperty('--dot', 'var(' + link.dataset.accent + ')');
  });

  var sectionObserver = 'IntersectionObserver' in window ? new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        var id = entry.target.id;
        var accentVar = entry.target.dataset.accent;
        if (accentVar) setAccentFromVar(accentVar);
        navLinks.forEach(function(l){
          l.classList.toggle('active', l.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' }) : null;

  if (sectionObserver) sections.forEach(function(s){ sectionObserver.observe(s); });

  // ---- Scroll progress on CMYK strip ----
  var progressEl = document.getElementById('scrollProgress');
  function updateProgress(){
    if (!progressEl) return;
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? (scrollTop / docHeight) : 0;
    progressEl.style.height = (100 - pct * 100) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // ---- Lightbox ----
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbTag = document.getElementById('lbTag');
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');

  var currentGroup = [];
  var currentIndex = 0;
  var lastFocused = null; // carte d'origine, pour y revenir a la fermeture

  // Elements focusables de la modale, dans l'ordre de tabulation
  // (l'<img> n'est pas focusable, on ne la met pas dans la liste)
  var focusables = [lbPrev, lbNext, lbClose];

  function openLightbox(cat, src, tag){
    lastFocused = document.activeElement;
    currentGroup = Array.prototype.slice.call(document.querySelectorAll('.card[data-cat="' + cat + '"]'));
    currentIndex = currentGroup.findIndex(function(c){ return c.dataset.src === src; });
    renderLightbox();
    lightbox.hidden = false;
    // force un reflow pour que la transition d'opacite se declenche
    void lightbox.offsetWidth;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function renderLightbox(){
    var card = currentGroup[currentIndex];
    if (!card) return;
    var img = card.querySelector('img');
    lbImg.src = card.dataset.src;
    // on reprend l'alt descriptif de la vignette, pas le code de reperage
    lbImg.alt = img ? img.getAttribute('alt') : (card.dataset.tag || '');
    lbTag.textContent = card.dataset.tag;
  }

  function closeLightbox(){
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    // on attend la fin de la transition avant de masquer reellement
    window.setTimeout(function(){
      if (!lightbox.classList.contains('open')) lightbox.hidden = true;
    }, 260);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  }

  // Piege a focus : Tab et Maj+Tab bouclent a l'interieur de la modale
  function trapFocus(e){
    var list = focusables.filter(function(el){ return el && el.offsetParent !== null; });
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    var active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !lightbox.contains(active)) { e.preventDefault(); last.focus(); }
    } else {
      if (active === last || !lightbox.contains(active)) { e.preventDefault(); first.focus(); }
    }
  }

  function nextImage(){
    if (!currentGroup.length) return;
    currentIndex = (currentIndex + 1) % currentGroup.length;
    renderLightbox();
  }
  function prevImage(){
    if (!currentGroup.length) return;
    currentIndex = (currentIndex - 1 + currentGroup.length) % currentGroup.length;
    renderLightbox();
  }

  Array.prototype.slice.call(document.querySelectorAll('.card')).forEach(function(card){
    function activate(){
      openLightbox(card.dataset.cat, card.dataset.src, card.dataset.tag);
    }
    card.addEventListener('click', activate);
    // Ouverture au clavier : Entree et Espace, comme un vrai bouton
    card.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault(); // empeche le scroll sur Espace
        activate();
      }
    });
  });

  lbClose.addEventListener('click', closeLightbox);
  lbNext.addEventListener('click', nextImage);
  lbPrev.addEventListener('click', prevImage);
  lightbox.addEventListener('click', function(e){
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function(e){
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') { closeLightbox(); return; }
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'Tab') trapFocus(e);
  });

})();
