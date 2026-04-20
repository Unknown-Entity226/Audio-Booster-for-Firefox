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
            previousGain = data.gain;
        }else{
            updateGain(1);
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
    }

    loadInitialState();
    async function sendUpdate(data) {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            browser.tabs.sendMessage(tabs[0].id, data);
        }
    }
    async function storeData(data) {
        await browser.storage.local.get();
        sendUpdate(data);
    }
    function updateGain(val) {
        gainSlider.value = val;
        gainValue.textContent = `${Math.round(val * 100)}%`;
        const colorVar = val > 4 ? "var(--accent-alert)" : "var(--accent-blue)";
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
        storeData({ gain: val });
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
        storeData({ gain: 1, pan: 0 });
    });
    muteBt.addEventListener("click", () => {
        if (gainSlider.value > 0) {
            previousGain = gainSlider.value;
            updateGain(0);
            storeData({ gain: 0 });
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

});