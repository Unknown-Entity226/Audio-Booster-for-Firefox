'use strict';
document.addEventListener("DOMContentLoaded", () => {
    const gainSlider = document.getElementById("gainRange");
    const panSlider = document.getElementById("panRange");
    const gainValue = document.getElementById("gainValue");
    const panValue = document.getElementById("panValue");
    const resetBt = document.getElementById("resetButton");
    const muteBt = document.getElementById("muteButton");
    const themeToggle = document.getElementById("themeToggle");
    const flipBt = document.getElementById("flipCheckbox");
    const monoBt = document.getElementById("monoCheckbox");
    let previousGain = 1;
    function setTheme(theme) {
        const nextTheme = theme === "dark" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", nextTheme);

        const label = nextTheme === "dark"
            ? "Switch to light theme"
            : "Switch to dark theme";
        themeToggle.setAttribute("aria-label", label);
        themeToggle.title = label;
    }

    async function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute("data-theme") === "dark"
            ? "dark"
            : "light";
        const nextTheme = currentTheme === "dark" ? "light" : "dark";

        setTheme(nextTheme);
        await browser.storage.local.set({ theme: nextTheme });
    }

    async function loadInitialState() {
        const data = await browser.storage.local.get();

        if (data.gain !== undefined) {
            updateGain(data.gain);
        }else{
            updateGain(1);
        }
        // added another storage parameter: lastGain which will take note of last gain value when user mute
        // this avoid the issues where the user close the popup in mute position and when the popup is again loaded, the gain value remains 0
        if (data.lastGain !== undefined && data.lastGain > 0) {
            previousGain = data.lastGain;
        } else if (data.gain !== undefined && data.gain > 0) {
            previousGain = data.gain;
        } else {
            previousGain = 1;
        }

        if (data.pan !== undefined) {
            updatePan(data.pan);
        }else{
            updatePan(0);
        }

        if (data.mono !== undefined) {
            monoBt.checked = data.mono;
        }else{
            monoBt.checked = false;
        }
        
        if (data.flip !== undefined) {
            flipBt.checked = data.flip;
        }else{  
            flipBt.checked = false;
        }

        if (data.theme !== undefined) {
            setTheme(data.theme);
        } else {
            setTheme("light");
        }

        // Guard against stale storage saved by an older version of this
        // popup that could leave both mono and flip set to true at once.
        checkMonoAndFlip();
    }

    loadInitialState();

    async function storeData(data) {
        await browser.storage.local.set(data);
    }
    function updateGain(val) {
        gainSlider.value = val;
        gainValue.textContent = `${Math.round(val * 100)}%`;
       
        const colorVar = val > 4 ? "var(--accent-alert)" : "var(--accent-2)";
        const textVar = val > 4 ? "var(--accent-alert)" : "var(--text)";

        gainSlider.style.setProperty("--progress", colorVar);
        gainValue.style.setProperty("--displaycolor", textVar);
    }
    function updatePan(val) {
        panSlider.value = val;
        panValue.textContent = `${val > 0 ? "R" : val < 0 ? "L" : "C"} ${Math.abs(val * 100)}%`;
        panValue.style.setProperty("--displaycolor", "var(--text)");
    }
    function checkMonoAndFlip() {
        const mono = monoBt.checked;
        const flip = flipBt.checked;

        const audioSides = document.getElementById("audio-sides");
        let advice = audioSides.querySelector(".mono-warning");

        if (mono && flip) {
            flipBt.checked = false;
            // fixed the issue of flip only working on the UI and not on the serviceworker 
            storeData({ flip: false });

            if (!advice) {
                advice = document.createElement("p");
                advice.className = "mono-warning";
                advice.textContent = "Disable mono to activate flip";
                advice.style.color = "var(--accent-alert)";
                advice.style.fontSize = "0.9em";

                audioSides.appendChild(advice);

                setTimeout(() => {
                    advice.remove();
                }, 3000);
            }
        } else if (advice && !mono) {
            advice.remove();
        }
    }

    gainSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        updateGain(val);
        if (val > 0) {
            previousGain = val;
            storeData({ gain: val, lastGain: val });
        } else {
            storeData({ gain: val });
        }
    });
    panSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        updatePan(val);
        storeData({ pan: val });
    });
    resetBt.addEventListener("click", () => {
        updateGain(1);
        updatePan(0);
        previousGain = 1;
        flipBt.checked = false;
        monoBt.checked = false;
        storeData({ gain: 1, pan: 0, flip:false, mono: false, lastGain: 1});
    });
    muteBt.addEventListener("click", () => {
        const val = Number(gainSlider.value);
        if (val> 0) {
            previousGain = val;
            updateGain(0);
            storeData({ gain: 0, lastGain: val });
        } else {
            updateGain(previousGain);
            storeData({ gain: previousGain });
        }
    });
    flipBt.addEventListener("change", ()=>{
        checkMonoAndFlip();
        storeData({ flip: flipBt.checked });
    });

    monoBt.addEventListener("change", ()=>{
        checkMonoAndFlip();
        storeData({ mono: monoBt.checked });
    });

    themeToggle.addEventListener("click", ()=>{
        toggleTheme();
    });
    const loc = 'https://github.com/Unknown-Entity226/Audio-Booster-for-Firefox';
    const githubLogo = document.getElementById("githubLogo");
    githubLogo.addEventListener("click", () => {
        window.open(loc, '_blank');
    });
});
