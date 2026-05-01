function getNewButton() {
    const result = document.createElement("span");
    result.classList.add("theme-button");
    return result;
}

window.onload = () => {
    let themeSelect           = document.getElementById("tsd-theme");
    themeSelect.style.display = "none";
    
    let container = document.createElement("div");
    container.classList.add("theme-container");
    themeSelect.parentElement.append(container);
    
    
    const theme = document.documentElement.getAttribute("data-theme");
    
    let osButton;
    let darkButton;
    let lightButton;
    
    
    osButton = getNewButton();
    osButton.classList.add("os");
    if (theme === "os") {
        osButton.classList.add("selected");
    }
    osButton.onclick = () => {
        themeSelect.value = "os";
        themeSelect.dispatchEvent(new Event("change"));
        darkButton.classList.remove("selected");
        lightButton.classList.remove("selected");
        osButton.classList.add("selected");
    };
    container.append(osButton);
    
    lightButton = getNewButton();
    lightButton.classList.add("light");
    if (theme === "light") {
        lightButton.classList.add("selected");
    }
    lightButton.onclick = () => {
        themeSelect.value = "light";
        themeSelect.dispatchEvent(new Event("change"));
        osButton.classList.remove("selected");
        darkButton.classList.remove("selected");
        lightButton.classList.add("selected");
    };
    container.append(lightButton);
    
    darkButton = getNewButton();
    darkButton.classList.add("dark");
    if (theme === "dark") {
        darkButton.classList.add("selected");
    }
    darkButton.onclick = () => {
        themeSelect.value = "dark";
        themeSelect.dispatchEvent(new Event("change"));
        osButton.classList.remove("selected");
        lightButton.classList.remove("selected");
        darkButton.classList.add("selected");
    };
    container.append(darkButton);
};
