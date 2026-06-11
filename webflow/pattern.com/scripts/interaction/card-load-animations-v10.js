/**
 * Card Load Animation Library  |  Pattern Library V2
 * Version: 10
 *
 * ATTRIBUTES
 * ─────────────────────────────────────────────────────
 * [card-grid]             Grid component wrapper — groups cards, ScrollTrigger
 * [card-load="drop-in"]   .s_card_number — whole unit clips in from above
 * [card-load="fade-in"]   .s_card_number — word stagger from below, overflow:visible
 * [card-load="count-up"]  .cs_stat_card_heading — odometer slot-machine spin
 *
 * COUNT-UP TARGET RESOLUTION
 *   1. [stat-count-up] child   →  Case Study / Stat Card
 *   2. .u-text span            →  Card / Stat
 *   3. element itself          →  fallback
 *
 * DEPENDENCIES: GSAP + ScrollTrigger + SplitText via Webflow GSAP module
 **/
    
    (function () {
      "use strict";
    
      const CFG = {
        scrollStart: "top 78%",
        cardStagger: 0.12,
        dropIn:  { duration: 0.65, ease: "power3.out" },
        fadeIn:  { duration: 0.55, charStagger: 0.03, wordStagger: 0.08, ease: "power2.out", yOffset: 16 },
        countUp: {
          totalDuration: 1.4,
          ease: "power3.out",
          // Delay offset per column indexed by distance-from-right (0=ones, 1=tens, ...)
          // All columns end at totalDuration simultaneously
          colDelayOffsets: [0, 0.18, 0.38, 0.55],
        },
      };
    
      // ─── Entry ────────────────────────────────────────────────────────────────
      function init() {
        if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
          console.warn("[card-load] GSAP / ScrollTrigger not found.");
          return;
        }
        gsap.registerPlugin(ScrollTrigger);
        if (typeof SplitText !== "undefined") gsap.registerPlugin(SplitText);
    
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
        document.querySelectorAll("[card-grid]").forEach((grid) => {
          if (grid.dataset.cardGridInit) return;
          grid.dataset.cardGridInit = "true";
    
          const cards = Array.from(grid.querySelectorAll("[card-load]"));
          if (!cards.length) return;
    
          const animFns = cards.map((el) => buildAnim(el, prefersReduced)).filter(Boolean);
          if (!animFns.length) return;
    
          ScrollTrigger.create({
            trigger: grid,
            start: CFG.scrollStart,
            once: true,
            onEnter: () => animFns.forEach((fn, i) => fn(i * CFG.cardStagger)),
          });
        });
      }
    
      // ─── Target resolution ───────────────────────────────────────────────────
      function resolveTarget(el) {
        return (
          el.querySelector("[stat-count-up]") ||
          el.querySelector(".u-text span")    ||
          el.querySelector(".u-text")         ||
          el
        );
      }
    
      // ─── Router ───────────────────────────────────────────────────────────────
      function buildAnim(el, prefersReduced) {
        const type   = el.getAttribute("card-load");
        const target = resolveTarget(el);
        if (prefersReduced) return (_d) => gsap.set(el, { opacity: 1 });
        if (type === "drop-in")  return buildDropIn(el, target);
        if (type === "fade-in")  return buildFadeIn(el, target);
        if (type === "count-up") return buildCountUp(el, target);
        console.warn("[card-load] Unknown type:", type);
        return null;
      }
    
      // ─────────────────────────────────────────────────────────────────────────
      // DROP-IN
      // FIX: Clip must be on a WRAPPER around the target, not on el itself.
      // el (s_card_number) has its own height constraints — clipping there cuts
      // the number at rest. Instead, we wrap the target in an overflow:clip div
      // and animate the target within that wrapper.
      // ─────────────────────────────────────────────────────────────────────────
      function buildDropIn(el, target) {
        const c = CFG.dropIn;
    
        // Use .u-text (the <p> tag, parent of target) as the clip container.
        // It is already sized to exactly the visible text height and is the
        // natural typographic boundary. No DOM insertion needed.
        //
        // Previous approach inserted a wrapper <div> but it was a direct child
        // of .u-text which has the Lumos rule `.u-text > * { width:100% }`,
        // plus the flex column container caused the wrapper to expand beyond
        // the card height — breaking the clip effect.
        //
        // overflow:clip on .u-text + y:"-100%" on target gives a clean masked
        // drop-in. onComplete removes the overflow style to restore .u-text.
        const clipEl = target.parentElement; // .u-text <p>
        clipEl.style.overflow = "clip";
    
        gsap.set(target, { y: "-100%", opacity: 0 });
    
        return (delay) => {
          gsap.to(target, {
            y: "0%",
            opacity: 1,
            duration: c.duration,
            delay,
            ease: c.ease,
            onComplete() {
              // Restore .u-text overflow — clean up inline style
              clipEl.style.overflow = "";
              // Clear GSAP inline styles from target
              target.style.transform = "";
              target.style.translate = "";
              target.style.rotate    = "";
              target.style.scale     = "";
              target.style.opacity   = "";
            },
          });
        };
      }
    
      // ─────────────────────────────────────────────────────────────────────────
      // FADE-IN
      // Words stagger in from below using SplitText.
      //
      // GRADIENT-CLIP DETECTION:
      // If an ancestor uses background-clip:text (gradient text variant), any
      // CSS transform on a descendant — even identity translate(0,0) — creates
      // a stacking context that breaks the ancestor's gradient paint.
      // Additionally, gsap.set(y) before SplitText measures causes the container
      // to collapse to the widest single word width (layout measured post-offset).
      //
      // When gradient-clip is detected: animate opacity only, no y transform.
      //   - No stacking context during or after animation
      //   - No layout impact before SplitText measures
      //   - Gradient visible throughout the entire animation
      //   - onComplete clears opacity inline style to fully restore DOM
      //
      // When no gradient-clip: full y + opacity stagger with onComplete cleanup.
      // ─────────────────────────────────────────────────────────────────────────
      function buildFadeIn(el, target) {
        const c = CFG.fadeIn;
    
        // Detect if any ancestor uses background-clip:text (gradient text).
        // Any CSS transform on a descendant breaks the ancestor gradient paint
        // by creating a stacking context. Use opacity-only path in that case.
        const hasGradientClip = (function check(node) {
          let n = node.parentElement;
          while (n && !n.classList.contains("stat_card_wrap")) {
            const cs = getComputedStyle(n);
            if (cs.backgroundClip === "text" || cs.webkitBackgroundClip === "text") return true;
            n = n.parentElement;
          }
          return false;
        })(el);
    
        if (typeof SplitText === "undefined") {
          gsap.set(target, { opacity: 0, y: c.yOffset });
          return (delay) => gsap.to(target, {
            opacity: 1, y: 0, duration: c.duration, delay, ease: c.ease,
            onComplete() { target.style.cssText = ""; },
          });
        }
    
        if (hasGradientClip) {
          // Opacity-only: no transform, no stacking context, gradient stays intact.
          gsap.set(target, { opacity: 0 });
          return (delay) => gsap.to(target, {
            opacity: 1,
            duration: c.duration,
            delay,
            ease: c.ease,
            onComplete() { target.style.cssText = ""; },
          });
        }
    
        // Standard path: SplitText char stagger with y + opacity.
        // Live page testing confirms layout stays stable at 220px throughout —
        // splitting into inline-block char spans does not collapse the flex chain.
        const split = new SplitText(target, { type: "chars", charsClass: "cl-char" });
        // Force display:inline-block to override the Lumos rule:
        //   .u-text > * { width: 100% }
        // which forces every direct child of .u-text to width:100%, making chars
        // render as full-width blocks. display:inline-block as an inline style
        // beats the stylesheet rule and gives chars their natural glyph width.
        //
        // IMPORTANT: onComplete must NOT use cssText="" — that strips display too
        // and lets Lumos reassert width:100%. Instead, clear only GSAP's properties
        // and explicitly set display:inline-block to keep it permanent.
        gsap.set(split.chars, { display: "inline-block", opacity: 0, y: c.yOffset });
    
        return (delay) => {
          gsap.to(split.chars, {
            opacity: 1,
            y: 0,
            duration: c.duration,
            delay,
            ease: c.ease,
            stagger: { each: c.charStagger, from: "start" },
            onComplete() {
              // Clear GSAP motion properties but preserve display:inline-block
              split.chars.forEach((ch) => {
                ch.style.transform  = "";
                ch.style.translate  = "";
                ch.style.rotate     = "";
                ch.style.scale      = "";
                ch.style.opacity    = "";
                // Keep display:inline-block — without it Lumos width:100% takes over
              });
            },
          });
        };
      }
    
      // ─────────────────────────────────────────────────────────────────────────
      // COUNT-UP  —  Slot-machine odometer
      //
      // FIX: Each digit reel wrapper must have an explicit width: 1ch
      //      so narrow glyphs (1, .) don't collapse the column width.
      //      "1ch" = width of "0" in the current font = correct digit-grid width.
      //
      // Structure per digit:
      //   <span style="display:inline-block; overflow:hidden; width:1ch; height:1em">
      //     <span style="display:flex; flex-direction:column"> ← the reel
      //       <span>0</span>
      //       <span>1</span>  ← each cell is 1em tall
      //       ...
      //       <span>N</span>  ← target digit
      //     </span>
      //   </span>
      // GSAP translates the reel from translateY(0) → translateY(-N * 1em)
      // ─────────────────────────────────────────────────────────────────────────
      function buildCountUp(el, target) {
        const c = CFG.countUp;
        const originalText = target.textContent.trim();
        const { tokens, hasDigits } = tokenize(originalText);
        if (!hasDigits) return null;
    
        // Clear target and rebuild as inline flex row
        target.textContent = "";
        target.style.display    = "inline-flex";
        target.style.alignItems = "baseline";
    
        const reelJobs = []; // { reel, targetDigit, posFromRight }
    
        tokens.forEach((token) => {
          if (token.type === "static") {
            const span = document.createElement("span");
            span.textContent       = token.value;
            span.style.display     = "inline-block";
            span.style.whiteSpace  = "pre"; // preserve spaces
            target.appendChild(span);
          } else {
            const run = token.digits;
            const n   = run.length;
    
            run.forEach((targetDigit, i) => {
              const posFromRight = n - 1 - i;
    
              // ── Clip wrapper ──────────────────────────────────────────────
              const wrapper = document.createElement("span");
              wrapper.style.display       = "inline-block";
              wrapper.style.overflow      = "hidden";
              wrapper.style.width         = "1ch";        // FIX: lock to "0" glyph width
              wrapper.style.height        = "1em";
              wrapper.style.verticalAlign = "text-bottom";
              wrapper.style.textAlign     = "center";     // center narrow glyphs (1, .)
    
              // ── Reel ──────────────────────────────────────────────────────
              const reel = document.createElement("span");
              reel.style.display        = "flex";
              reel.style.flexDirection  = "column";
              reel.style.transform      = "translateY(0)";
    
              // Build digit cells 0 → targetDigit
              for (let d = 0; d <= targetDigit; d++) {
                const cell = document.createElement("span");
                cell.textContent       = String(d);
                cell.style.display     = "block";
                cell.style.height      = "1em";
                cell.style.lineHeight  = "1";
                cell.style.textAlign   = "center";
                reel.appendChild(cell);
              }
    
              wrapper.appendChild(reel);
              target.appendChild(wrapper);
    
              // Only animate if target digit > 0
              if (targetDigit > 0) {
                reelJobs.push({ reel, targetDigit, posFromRight });
              }
            });
          }
        });
    
        return (baseDelay) => {
          reelJobs.forEach(({ reel, targetDigit, posFromRight }) => {
            const offset   = c.colDelayOffsets[Math.min(posFromRight, c.colDelayOffsets.length - 1)];
            const duration = c.totalDuration - offset;
            const ticker   = { v: 0 };
    
            gsap.to(ticker, {
              v: targetDigit,
              duration,
              delay: baseDelay + offset,
              ease: c.ease,
              onUpdate() {
                reel.style.transform = `translateY(calc(${-ticker.v} * 1em))`;
              },
              onComplete() {
                reel.style.transform = `translateY(calc(${-targetDigit} * 1em))`;
              },
            });
          });
        };
      }
    
      // ─── Tokenizer ────────────────────────────────────────────────────────────
      function tokenize(text) {
        const tokens = [];
        const regex  = /\d+/g;
        let lastIdx  = 0, hasDigits = false, m;
    
        while ((m = regex.exec(text)) !== null) {
          if (m.index > lastIdx) {
            tokens.push({ type: "static", value: text.slice(lastIdx, m.index) });
          }
          tokens.push({ type: "digits", digits: m[0].split("").map(Number) });
          hasDigits = true;
          lastIdx = m.index + m[0].length;
        }
        if (lastIdx < text.length) {
          tokens.push({ type: "static", value: text.slice(lastIdx) });
        }
        return { tokens, hasDigits };
      }
    
      // ─── Boot ─────────────────────────────────────────────────────────────────
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
      } else {
        setTimeout(init, 0);
      }
    })();
