function getNewButton() {
    const result = document.createElement("span");
    result.classList.add("theme-button");
    return result;
}


let projectName;
let isHomePage = false;
if (document.title === "HouseMix - Documentation") {
    isHomePage = true
}
if (!isHomePage) {
    if (document.title.includes("|")) {
        projectName = /(?<=\| ).*(?= project)/.exec(document.title)[0].toLowerCase();
    } else {
        projectName = /^.*(?= project)/.exec(document.title)[0].toLowerCase();
    }
    document.title = `${document.title.replace(" project", "")} | HouseMix docs`;
}

let promise =
        fetch("/contents.json")
            .then(res => res.json());

document.addEventListener("DOMContentLoaded", () => {
    const newNode = document.createElement("div");
        promise.then(allInfo => {
            const project = allInfo.projects.find(proj => proj.name === "house-mix");
            if (project != null) {
                let version = /(?<=^\/archive\/house-mix\/)\d+_\d+_\d+/.exec(window.location.pathname);
                if (version != null) {
                    version = version[0].replace(/_/g, ".");
                } else {
                    version = project.mainVersion
                }
                newNode.innerText = version
                if (project.betaVersions.includes(version)) {
                    const betaTag = document.createElement("span");
                    betaTag.classList.add("version-tag");
                    betaTag.classList.add("version-tag-beta");
                    betaTag.classList.add("version-tag-margin");
                    betaTag.innerText = "BETA";
                    newNode.append(betaTag);
                }
                const dropDown = document.createElement("div");
                dropDown.classList.add("version-dropdown");
                if (isHomePage) {
                    dropDown.classList.add("right");
                }
                newNode.append(dropDown);
                const versionElements = [];
                for (const otherVersion of project.versions) {
                    const versionElement = document.createElement("div");
                    versionElement.classList.add("version-dropdown-element");
                    versionElement.innerText = otherVersion;
                    
                    if (project.betaVersions.includes(otherVersion)) {
                        const betaTag = document.createElement("span");
                        betaTag.classList.add("version-tag");
                        betaTag.classList.add("version-tag-beta");
                        betaTag.innerText = "BETA";
                        versionElement.append(betaTag);
                    }
                    if (project.mainVersion === otherVersion) {
                        const mainTag = document.createElement("span");
                        mainTag.classList.add("version-tag");
                        mainTag.classList.add("version-tag-main");
                        mainTag.innerText = "CURRENT";
                        versionElement.append(mainTag);
                    }
                    versionElement.tabIndex = 0;
                    dropDown.append(versionElement);
                    if (otherVersion === version) {
                        versionElement.classList.add("selected");
                    }
                    versionElement.addEventListener("click", () => {
                        if (otherVersion === project.mainVersion) {
                            
                            window.location.pathname = `/${project.name}/${(isHomePage ? "" : projectName)}`;
                        } else {
                            window.location.pathname = `/archive/${project.name}/${otherVersion.replace(/\./g, "_")}/${(isHomePage ? "" : projectName)}`;
                        }
                    })
                    versionElement.dataset["version"] = otherVersion
                    versionElements.push(versionElement);
                }
                dropDown.addEventListener("keydown", (e) => {
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                        e.preventDefault();
                        let index = versionElements.findIndex(el => el.dataset["selected"] === "true");
                        if (index === -1) {
                            index = 0;
                        }
                        versionElements[index].dataset["selected"] = "false";
                        if (e.key === "ArrowDown") {
                            index++;
                        } else {
                            index--;
                        }
                        if (index >= versionElements.length) {
                            index = 0;
                        }
                        if (index < 0) {
                            index = versionElements.length - 1;
                        }
                        versionElements[index].dataset["selected"] = "true";
                        versionElements[index].focus();

                    } else if (e.key === "Enter") {
                        let index = versionElements.findIndex(el => el.dataset["selected"] === "true");
                        if (index !== -1) {
                            versionElements[index].click();
                        }
                        
                    }
                })
                newNode.addEventListener("click", () => {
                    dropDown.classList.toggle("visible");
                    let index = versionElements.findIndex(el => el.dataset["selected"] === "true");
                    if (index === -1) {
                        index = versionElements.findIndex(el => el.dataset["version"] === version);
                    }
                    if (index !== -1) {
                        versionElements[index].focus();
                    }
                })
            }
        })
    newNode.innerText = "Loading version..."
    newNode.classList.add("version-selector");
    newNode.tabIndex = 0;
    if (!isHomePage) {
        document.querySelector("#tsd-search-trigger").before(newNode)
    } else {
        document.getElementById("nav-bar").append(newNode);
    }
})

window.onload = () => {
    let themeSelect;
    
    let container = document.createElement("div");
    container.classList.add("theme-container");
    if (!isHomePage) {
        themeSelect= document.getElementById("tsd-theme");
        themeSelect.style.display = "none";
        themeSelect.parentElement.append(container);
    } else {
        document.getElementById("footer").append(container);
    }
    
    if (!isHomePage) {
        let title = document.querySelector("body > header > div > a.title");
        title.setAttribute("href", "../");
    }
    
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
        if (!isHomePage) {
            themeSelect.value = "os";
            themeSelect.dispatchEvent(new Event("change"));
        } else {
            document.documentElement.setAttribute("data-theme", "os");
            localStorage.setItem("tsd-theme", "os");
        }
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
        if (!isHomePage) {
            themeSelect.value = "light";
            themeSelect.dispatchEvent(new Event("change"));
        } else {
            document.documentElement.setAttribute("data-theme", "light");
            localStorage.setItem("tsd-theme", "light");
        }
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
        if (!isHomePage) {
            themeSelect.value = "dark";
            themeSelect.dispatchEvent(new Event("change"));
        } else {
            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem("tsd-theme", "dark");
        }
        osButton.classList.remove("selected");
        lightButton.classList.remove("selected");
        darkButton.classList.add("selected");
    };
    container.append(darkButton);
};
