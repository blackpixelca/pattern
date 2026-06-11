<script>
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('[id="section-video"]').forEach((component) => {
    if (component.dataset.scriptInitialized) return;
    component.dataset.scriptInitialized = "true";

    const bkg = component.querySelector('[id="section-video-bkg"]');
    if (!bkg) return;

    gsap.fromTo(
      bkg,
      {
        y: "7rem",
        scale: 0.9,
        borderRadius: "3rem"
      },
      {
        y: "0rem",
        scale: 1,
        duration: 0.5,
        ease: "none",
        scrollTrigger: {
          trigger: component,
          start: "top 85%",
          end: "top 30%",
          scrub: 0.8,
          onUpdate: function (self) {
            const progress = self.progress || 0;
            const minRadius = 0;
            const maxRadius = 3;
            const clampedRadius = Math.max(minRadius, Math.min(maxRadius, maxRadius * (1 - progress)));
            gsap.set(bkg, { borderRadius: clampedRadius + "rem" });
          }
        }
      }
    );
  });
});
</script>