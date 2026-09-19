'use strict';

// One setting connects every call to action to the real application.
const configuredOrigin = document.querySelector('meta[name="dudri-app-url"]')?.content;
try {
  const appOrigin = new URL(configuredOrigin);
  if (['http:', 'https:'].includes(appOrigin.protocol)) {
    document.querySelectorAll('[data-app-path]').forEach(link => {
      link.href = new URL(link.dataset.appPath, appOrigin).href;
    });
  }
} catch { /* The HTML links remain available if the setting is invalid. */ }
document.getElementById('copyright-year').textContent = new Date().getFullYear();

// Native links still work without JavaScript; only the small-screen menu needs it.
const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
function closeMenu(restoreFocus = false) {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', '메뉴 열기');
  if (restoreFocus) menuToggle.focus();
}
menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  mobileNav.hidden = isOpen;
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? '메뉴 열기' : '메뉴 닫기');
});
mobileNav.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) closeMenu(true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header') && !mobileNav.hidden) closeMenu();
});
matchMedia('(min-width: 801px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

// WAI-ARIA tabs: roving tab stop with arrows, Home and End.
const featureTabs = [...document.querySelectorAll('[role="tab"]')];
function selectFeature(tab, focus = false) {
  featureTabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) tab.focus({ preventScroll: true });
}
featureTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectFeature(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % featureTabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + featureTabs.length) % featureTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = featureTabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      selectFeature(featureTabs[next], true);
    }
  });
});

const showcaseButtons = [...document.querySelectorAll('[data-showcase]')];
showcaseButtons.forEach(button => button.addEventListener('click', () => {
  showcaseButtons.forEach(item => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
    document.getElementById(`showcase-${item.dataset.showcase}`).hidden = !selected;
  });
}));

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionToggle = document.querySelector('.motion-toggle');
let motionEnabled = !reducedMotion.matches;
function updateMotion() {
  document.body.classList.toggle('motion-paused', !motionEnabled);
  motionToggle.setAttribute('aria-pressed', String(motionEnabled));
  motionToggle.setAttribute('aria-label', motionEnabled ? '애니메이션 멈추기' : '애니메이션 켜기');
  motionToggle.title = motionEnabled ? '애니메이션 멈추기' : '애니메이션 켜기';
  if (!motionEnabled) {
    document.querySelectorAll('.reveal').forEach(item => item.classList.add('visible'));
    heroArt.style.removeProperty('translate');
    desktopShowcase.style.setProperty('--showcase-tilt', '0deg');
  }
  configureJourney();
  syncParticles();
}
motionToggle.addEventListener('click', () => {
  motionEnabled = !motionEnabled;
  updateMotion();
});
reducedMotion.addEventListener('change', event => {
  motionEnabled = !event.matches;
  updateMotion();
});

const gallery = document.querySelector('.screens-track');
const galleryPrev = document.getElementById('gallery-prev');
const galleryNext = document.getElementById('gallery-next');
function updateGalleryControls() {
  galleryPrev.disabled = gallery.scrollLeft <= 2;
  galleryNext.disabled = gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 2;
}
function moveGallery(direction) {
  const card = gallery.querySelector('.screen-card');
  const gap = parseFloat(getComputedStyle(gallery).gap) || 0;
  gallery.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: motionEnabled ? 'smooth' : 'instant' });
}
galleryPrev.addEventListener('click', () => moveGallery(-1));
galleryNext.addEventListener('click', () => moveGallery(1));
gallery.addEventListener('scroll', updateGalleryControls, { passive: true });
gallery.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    moveGallery(event.key === 'ArrowLeft' ? -1 : 1);
  }
});
new ResizeObserver(updateGalleryControls).observe(gallery);
updateGalleryControls();

const revealElements = document.querySelectorAll('.reveal');
if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  document.body.classList.add('motion-ready');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px 30px 0px' });
  revealElements.forEach(item => revealObserver.observe(item));
}

const hero = document.querySelector('.hero');
const heroArt = document.querySelector('.hero-art');
const desktopShowcase = document.querySelector('.desktop-showcase');
const progress = document.querySelector('.reading-progress');
const journey = document.getElementById('journey');
const journeySticky = journey.querySelector('.journey-sticky');
const journeyTraveler = journey.querySelector('.journey-traveler');
const journeyCards = [...journey.querySelectorAll('[data-scene]')];
const journeyWords = [...journey.querySelectorAll('[data-word]')];
const journeySteps = [...journey.querySelectorAll('[data-journey-step]')];
const journeyFrame = document.getElementById('journey-frame');
const header = document.querySelector('.site-header');
const smallJourney = matchMedia('(max-width: 480px)');
// Small viewport units stay stable when a mobile browser retracts its toolbar.
const viewportMeasure = document.createElement('div');
viewportMeasure.className = 'viewport-measure';
viewportMeasure.setAttribute('aria-hidden', 'true');
document.body.append(viewportMeasure);
let journeyActive = false;
let currentScene = -1;
const clamp = value => Math.min(1, Math.max(0, value));
const ease = value => value * value * (3 - 2 * value);
const interpolate = (start, end, progress) => start + (end - start) * progress;

function configureJourney() {
  // On short screens or with motion disabled, all three cards remain readable.
  const viewportHeight = viewportMeasure.getBoundingClientRect().height;
  const minimumHeight = matchMedia('(max-width: 600px)').matches ? 760 : 690;
  journeyActive = motionEnabled && !reducedMotion.matches && viewportHeight >= minimumHeight;
  journey.classList.toggle('is-animated', journeyActive);
  if (!journeyActive) {
    journeyCards.forEach(card => { card.style.removeProperty('transform'); card.style.removeProperty('opacity'); });
    journeySteps.forEach(step => step.style.setProperty('--step-progress', '1'));
  }
  updateJourney();
}

function updateJourney() {
  if (!journeyActive) return;
  const bounds = journey.getBoundingClientRect();
  if (bounds.top > innerHeight || bounds.bottom < 0) return;
  const totalTravel = journey.offsetHeight - journeySticky.offsetHeight;
  const amount = clamp((header.offsetHeight - bounds.top) / Math.max(1, totalTravel));
  const chapter = Math.min(2, Math.floor(amount * 3));
  const phase = amount * 2;
  const segment = Math.min(1, Math.floor(phase));
  const segmentProgress = ease(clamp(phase - segment));
  const points = smallJourney.matches
    ? [{ x: 10, y: 96, rotate: -14 }, { x: 88, y: 8, rotate: 10 }, { x: 88, y: 96, rotate: -6 }]
    : [{ x: 17, y: 57, rotate: -12 }, { x: 84, y: 30, rotate: 12 }, { x: 82, y: 68, rotate: -5 }];
  const from = points[segment], to = points[segment + 1];
  const x = interpolate(from.x, to.x, segmentProgress);
  const y = interpolate(from.y, to.y, segmentProgress) - Math.sin(segmentProgress * Math.PI) * (smallJourney.matches ? 12 : 17);
  journeyTraveler.style.left = `${x}%`;
  journeyTraveler.style.top = `${y}%`;
  journeyTraveler.style.transform = `translate(-50%, -50%) rotate(${interpolate(from.rotate, to.rotate, segmentProgress)}deg) scale(${1 + Math.sin(amount * Math.PI) * 0.1})`;
  journey.style.setProperty('--journey-progress', String(amount));
  journey.style.setProperty('--portal-scale', String(1 + amount * 2.4));
  journey.style.setProperty('--portal-opacity', String(Math.max(0.08, 0.65 - amount)));
  journey.style.setProperty('--nebula-x', `${(amount - 0.5) * 200}px`);
  journey.style.setProperty('--star-y', `${-amount * 55}px`);
  journeyFrame.textContent = String(Math.round(amount * 179) + 1).padStart(3, '0');

  journeyCards.forEach((card, index) => {
    const start = index / 3;
    const end = (index + 1) / 3;
    const fadeIn = index === 0 ? 1 : ease(clamp((amount - start + 0.045) / 0.09));
    const fadeOut = index === 2 ? 1 : 1 - ease(clamp((amount - end + 0.045) / 0.09));
    const opacity = Math.min(fadeIn, fadeOut);
    const enter = (1 - fadeIn) * 85;
    const leave = (1 - fadeOut) * -85;
    card.style.opacity = String(opacity);
    card.style.transform = `translate(calc(-50% + ${enter + leave}px), -50%) rotateY(${(enter + leave) * -0.2}deg) scale(${0.92 + opacity * 0.08})`;
    journeyWords[index].style.opacity = String(opacity);
    journeyWords[index].style.transform = `translateX(calc(-50% + ${(enter + leave) * -0.5}px))`;
    journeySteps[index].style.setProperty('--step-progress', String(clamp((amount - start) * 3)));
  });
  if (chapter !== currentScene) {
    currentScene = chapter;
    journey.dataset.chapter = String(chapter + 1);
    journeySteps.forEach((step, index) => step.setAttribute('aria-pressed', String(index === chapter)));
  }
}

journeySteps.forEach((button, index) => button.addEventListener('click', () => {
  if (!journeyActive) {
    journeyCards[index].scrollIntoView({ block: 'center', behavior: 'instant' });
    return;
  }
  const travel = journey.offsetHeight - journeySticky.offsetHeight;
  const top = scrollY + journey.getBoundingClientRect().top - header.offsetHeight + travel * (index + 0.45) / 3;
  scrollTo({ top, behavior: 'smooth' });
}));
addEventListener('resize', configureJourney, { passive: true });
new ResizeObserver(configureJourney).observe(viewportMeasure);
let scrollFrame = 0;
function updateScroll() {
  const available = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${available > 0 ? scrollY / available : 0})`;
  if (motionEnabled) {
    updateJourney();
    const rect = desktopShowcase.getBoundingClientRect();
    if (rect.top < innerHeight && rect.bottom > 0) {
      const tilt = Math.max(0, Math.min(9, (rect.top / innerHeight) * 12));
      desktopShowcase.style.setProperty('--showcase-tilt', `${tilt}deg`);
    }
  }
  scrollFrame = 0;
}
addEventListener('scroll', () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
}, { passive: true });
addEventListener('resize', updateScroll, { passive: true });
updateScroll();

const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const cursorGlow = document.querySelector('.cursor-glow');
if (finePointer.matches) {
  hero.addEventListener('pointermove', event => {
    if (!motionEnabled) return;
    const bounds = hero.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    heroArt.style.translate = `${x * 12}px ${y * 10}px`;
  });
  hero.addEventListener('pointerleave', () => { heroArt.style.translate = '0px 0px'; });
  document.addEventListener('pointermove', event => {
    if (motionEnabled) cursorGlow.style.transform = `translate(${event.clientX - 165}px, ${event.clientY - 165}px)`;
  }, { passive: true });
}

// A lightweight particle canvas runs only while the hero is visible and active.
const canvas = document.getElementById('hero-particles');
const context = canvas.getContext('2d');
let particleFrame = 0;
let heroVisible = true;
let canvasWidth = 0;
let canvasHeight = 0;
let previousTime = 0;
const particles = Array.from({ length: 32 }, () => ({
  x: Math.random(), y: Math.random(), size: Math.random() * 1.3 + 0.6,
  speed: 0.007 + Math.random() * 0.01, phase: Math.random() * Math.PI * 2,
}));
function resizeParticles() {
  canvasWidth = hero.clientWidth;
  canvasHeight = hero.clientHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = canvasWidth * ratio;
  canvas.height = canvasHeight * ratio;
  if (context) context.setTransform(ratio, 0, 0, ratio, 0, 0);
}
function drawParticles(time) {
  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  particles.forEach(particle => {
    particle.y = (particle.y - particle.speed * delta + 1) % 1;
    const opacity = 0.2 + (Math.sin(time / 1600 + particle.phase) + 1) * 0.16;
    context.beginPath();
    context.arc(particle.x * canvasWidth, particle.y * canvasHeight, particle.size, 0, Math.PI * 2);
    context.fillStyle = `rgba(134, 97, 185, ${opacity})`;
    context.fill();
  });
  particleFrame = requestAnimationFrame(drawParticles);
}
function syncParticles() {
  const shouldRun = context && motionEnabled && !reducedMotion.matches && heroVisible && !document.hidden;
  if (shouldRun && !particleFrame) {
    previousTime = performance.now();
    particleFrame = requestAnimationFrame(drawParticles);
  } else if (!shouldRun && particleFrame) {
    cancelAnimationFrame(particleFrame);
    particleFrame = 0;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
  }
}
new ResizeObserver(resizeParticles).observe(hero);
new IntersectionObserver(entries => {
  heroVisible = entries[0].isIntersecting;
  syncParticles();
}).observe(hero);
document.addEventListener('visibilitychange', syncParticles);
resizeParticles();
updateMotion();
