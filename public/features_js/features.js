
const dashboard = document.getElementById("dashboard3d");

if (dashboard) {
    const visualArea = dashboard.closest(".visual-area");

    visualArea.addEventListener("mousemove", (event) => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        const rect = dashboard.getBoundingClientRect();

        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        const rotateY = (x - 0.5) * 14;
        const rotateX = (0.5 - y) * 9;

        dashboard.style.animation = "none";
        dashboard.style.transform =
            `rotateY(${-12 + rotateY}deg) rotateX(${5 + rotateX}deg)`;
    });

    visualArea.addEventListener("mouseleave", () => {
        dashboard.style.animation = "";
        dashboard.style.transform = "";
    });
}
