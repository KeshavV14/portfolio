const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', isOpen);
    });

    navLinks.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            menuToggle.setAttribute('aria-expanded', 'false');
        });
    });
}

const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

// Scroll progress
const scrollProgress = document.querySelector('.scroll-progress');
let progressQueued = false;

function updateScrollProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress.style.transform = `scaleX(${scrollable > 0 ? window.scrollY / scrollable : 0})`;
    progressQueued = false;
}

window.addEventListener('scroll', () => {
    if (!progressQueued) {
        progressQueued = true;
        requestAnimationFrame(updateScrollProgress);
    }
}, { passive: true });

// Active nav link
const navIndicator = document.querySelector('.nav-indicator');
const sectionLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];

function setActiveLink(activeLink) {
    sectionLinks.forEach((link) => link.classList.toggle('active', link === activeLink));
    navIndicator.style.opacity = activeLink ? '1' : '0';

    if (activeLink) {
        navIndicator.style.width = `${activeLink.offsetWidth}px`;
        navIndicator.style.transform = `translateX(${activeLink.offsetLeft}px)`;
    }
}

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            setActiveLink(sectionLinks.find((link) => link.hash === `#${entry.target.id}`));
        } else if (entry.target.id === 'about' && entry.boundingClientRect.top > 0) {
            setActiveLink(null);
        }
    });
}, { rootMargin: '-45% 0px -50% 0px' });

sectionLinks.forEach((link) => sectionObserver.observe(document.querySelector(link.hash)));

// Stat count-up
const countObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) {
            return;
        }

        observer.unobserve(entry.target);
        const end = Number(entry.target.dataset.count);
        const start = performance.now();

        function tick(now) {
            const progress = Math.min((now - start) / 1100, 1);
            entry.target.textContent = Math.round(end * (1 - (1 - progress) ** 3));

            if (progress < 1) {
                requestAnimationFrame(tick);
            }
        }

        requestAnimationFrame(tick);
    });
}, { threshold: 0.6 });

if (!prefersReducedMotion) {
    document.querySelectorAll('[data-count]').forEach((element) => countObserver.observe(element));
}

// Project filters
const filterButtons = document.querySelectorAll('.filter');
const projectCards = [...document.querySelectorAll('.project-card')];
const featuredCard = document.querySelector('.project-feature');
const filterStatus = document.querySelector('.filter-status');

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const { filter } = button.dataset;

        filterButtons.forEach((other) => {
            other.classList.toggle('active', other === button);
            other.setAttribute('aria-pressed', other === button);
        });

        projectCards.forEach((card) => {
            card.classList.remove('project-feature');
            card.hidden = filter !== 'all' && !card.dataset.tags.split(' ').includes(filter);
        });

        // The arm stays wide; a leftover half-width card widens to fill its row
        const visibleCards = projectCards.filter((card) => !card.hidden);
        const others = visibleCards.filter((card) => card !== featuredCard);

        if (!featuredCard.hidden) {
            featuredCard.classList.add('project-feature');
        }

        if (others.length % 2 === 1) {
            others[others.length - 1].classList.add('project-feature');
        }

        filterStatus.textContent = `Showing ${visibleCards.length} of ${projectCards.length} projects`;
    });
});

// Card spotlight
projectCards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
        const bounds = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - bounds.left}px`);
        card.style.setProperty('--my', `${event.clientY - bounds.top}px`);
    });
});

// Arm subsystem tabs
const subsystemTabs = [...document.querySelectorAll('.subsystem-tabs [role="tab"]')];
const subsystemPanel = document.getElementById('subsystem-panel');
const armArt = document.querySelector('.art-arm');

function selectSubsystem(tab) {
    const { subsystem } = tab.dataset;

    subsystemTabs.forEach((other) => {
        other.setAttribute('aria-selected', other === tab);
        other.tabIndex = other === tab ? 0 : -1;
    });

    armArt.dataset.active = subsystem;
    subsystemPanel.setAttribute('aria-labelledby', tab.id);
    subsystemPanel.textContent = subsystemPanel.getAttribute(`data-copy-${subsystem}`);
}

subsystemTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectSubsystem(tab));
    tab.addEventListener('keydown', (event) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];

        if (step) {
            const next = subsystemTabs[(index + step + subsystemTabs.length) % subsystemTabs.length];
            selectSubsystem(next);
            next.focus();
        }
    });
});

// Experience accordion
document.querySelectorAll('.timeline-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
        const isOpen = toggle.closest('.timeline-item').classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen);
    });
});

// Copy email
const copyEmail = document.querySelector('.copy-email');
const toast = document.querySelector('.toast');
let toastTimer;

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

copyEmail.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(copyEmail.dataset.email);
        showToast('Email copied');
    } catch {
        showToast('Copy failed. Use the email link instead.');
    }
});

// Hero arm: two-link inverse kinematics with a spoon that stays level
const heroSection = document.querySelector('.hero');
const armDemo = document.querySelector('.arm-demo');
const armParts = {};
const readouts = {};

armDemo.querySelectorAll('[data-arm]').forEach((part) => {
    (armParts[part.dataset.arm] ||= []).push(part);
});
document.querySelectorAll('[data-readout]').forEach((element) => {
    readouts[element.dataset.readout] = element;
});

const BASE = { x: 150, y: 330 };
const UPPER_ARM = 150;
const FOREARM = 135;
const SPOON = 46;
const POINTER_HOLD_MS = 1800;
const LEG_MS = 1100;
const MOUTH_PAUSE_MS = 3.5 * LEG_MS;

// Bowl, lift, mouth, lift; repeated points are pauses
const FEEDING_ROUTE = [[330, 322], [330, 322], [320, 230], [400, 182], [400, 182], [320, 230]];

const toDegrees = (radians) => Math.round(radians * 180 / Math.PI);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeInOut = (t) => t * t * (3 - 2 * t);

const armState = { shoulder: 1.2, elbow: -1.2, spoonSide: 1, elbowSide: 1, lastFrame: 0 };
const pointer = { x: 0, y: 0, lastMoved: -Infinity };

function setLine(part, x1, y1, x2, y2) {
    armParts[part].forEach((line) => {
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
    });
}

function setCircle(part, x, y) {
    armParts[part].forEach((circle) => {
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
    });
}

function routeTarget(now) {
    const position = now / LEG_MS;
    const leg = Math.floor(position) % FEEDING_ROUTE.length;
    const from = FEEDING_ROUTE[leg];
    const to = FEEDING_ROUTE[(leg + 1) % FEEDING_ROUTE.length];
    const t = easeInOut(position % 1);
    return { x: from[0] + (to[0] - from[0]) * t, y: from[1] + (to[1] - from[1]) * t };
}

function solveJoints(wristX, wristY, elbowSide) {
    const dx = wristX - BASE.x;
    const dy = Math.max(BASE.y - wristY, 8);
    const reach = clamp(Math.hypot(dx, dy), 70, UPPER_ARM + FOREARM - 2);
    const cosElbow = (reach ** 2 - UPPER_ARM ** 2 - FOREARM ** 2) / (2 * UPPER_ARM * FOREARM);
    const bend = Math.acos(clamp(cosElbow, -1, 1));
    const offset = Math.atan2(FOREARM * Math.sin(bend), UPPER_ARM + FOREARM * Math.cos(bend));
    return { shoulder: Math.atan2(dy, dx) + elbowSide * offset, elbow: -elbowSide * bend };
}

function renderArm(now, snap = false) {
    const usingPointer = now - pointer.lastMoved < POINTER_HOLD_MS;
    const target = usingPointer ? pointer : routeTarget(prefersReducedMotion ? MOUTH_PAUSE_MS : now);
    const smoothing = snap ? 1 : 1 - Math.exp(-(now - armState.lastFrame) / 110);
    armState.lastFrame = now;

    const facing = target.x >= BASE.x ? 1 : -1;
    armState.spoonSide += (facing - armState.spoonSide) * smoothing;
    const wristX = target.x - SPOON * armState.spoonSide;

    // The dead band stops the elbow flipping back and forth above the base
    if (wristX - BASE.x > 30) {
        armState.elbowSide = 1;
    } else if (wristX - BASE.x < -30) {
        armState.elbowSide = -1;
    }

    const goal = solveJoints(wristX, target.y, armState.elbowSide);
    armState.shoulder += (goal.shoulder - armState.shoulder) * smoothing;
    armState.elbow += (goal.elbow - armState.elbow) * smoothing;

    const elbowX = BASE.x + UPPER_ARM * Math.cos(armState.shoulder);
    const elbowY = BASE.y - UPPER_ARM * Math.sin(armState.shoulder);
    const foreAngle = armState.shoulder + armState.elbow;
    const endX = elbowX + FOREARM * Math.cos(foreAngle);
    const endY = elbowY - FOREARM * Math.sin(foreAngle);
    const tipX = endX + SPOON * armState.spoonSide;

    setLine('upper', BASE.x, BASE.y, elbowX, elbowY);
    setLine('fore', elbowX, elbowY, endX, endY);
    setLine('spoon', endX, endY, tipX, endY);
    setCircle('elbow', elbowX, elbowY);
    setCircle('wrist', endX, endY);
    setCircle('bowl', tipX, endY);
    armParts.bowl[0].setAttribute('rx', 3 + 8 * Math.abs(armState.spoonSide));

    armParts.target[0].setAttribute('transform', `translate(${pointer.x} ${pointer.y})`);
    armParts.target[0].classList.toggle('active', usingPointer);

    readouts.x.textContent = Math.round(tipX);
    readouts.y.textContent = Math.round(BASE.y - endY);
    readouts.shoulder.textContent = toDegrees(armState.shoulder);
    readouts.elbow.textContent = toDegrees(armState.elbow);
}

function aimArm(event) {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(armDemo.getScreenCTM().inverse());
    pointer.x = clamp(point.x, 20, 500);
    pointer.y = clamp(point.y, 60, 335);
    pointer.lastMoved = performance.now();

    if (prefersReducedMotion) {
        renderArm(pointer.lastMoved, true);
    }
}

heroSection.addEventListener('pointermove', aimArm);
heroSection.addEventListener('pointerdown', aimArm);

renderArm(performance.now(), true);

if (!prefersReducedMotion) {
    let armFrame = null;

    function animateArm(now) {
        renderArm(now);
        armFrame = requestAnimationFrame(animateArm);
    }

    new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && armFrame === null) {
            armState.lastFrame = performance.now();
            armFrame = requestAnimationFrame(animateArm);
        } else if (!entry.isIntersecting && armFrame !== null) {
            cancelAnimationFrame(armFrame);
            armFrame = null;
        }
    }).observe(armDemo);
}
