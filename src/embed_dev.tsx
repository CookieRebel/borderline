import { mount } from "./embed";

window.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("borderline-app");
    if (el) mount(el);
});
