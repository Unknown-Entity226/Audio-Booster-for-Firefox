const pipelines = new Map();
let currentSettings = {
    gain: 1,
    pan: 0,
    flip: false,
    mono: false
};

const audioContext = new AudioContext();
(async function loadInitialSettings() {
    const data = await browser.storage.local.get();

    currentSettings.gain = data.gain ?? currentSettings.gain;
    currentSettings.pan = data.pan ?? currentSettings.pan;
    currentSettings.flip = data.flip ?? currentSettings.flip;
    currentSettings.mono = data.mono ?? currentSettings.mono;

    applySettingsToAllPipelines();
})();
function createAudioPipeline(media) {
    if (pipelines.has(media)) return;
    let sourceNode;
    try {
        sourceNode = audioContext.createMediaElementSource(media);
    } catch (error) {
        console.error("Error creating media element source:", error);
        return;
    }
    const gainNode = audioContext.createGain();
    const panNode = audioContext.createStereoPanner();
    const compressorNode = audioContext.createDynamicsCompressor();
    const splitterNode = audioContext.createChannelSplitter(2);
    splitterNode.channelCount = 2;
    splitterNode.channelCountMode = "explicit";
    const mergerNode = audioContext.createChannelMerger(2);

    // Compressor settings:
    compressorNode.threshold.setValueAtTime(-12, audioContext.currentTime);
    compressorNode.knee.setValueAtTime(30, audioContext.currentTime);      // Smoothness of transition
    compressorNode.ratio.setValueAtTime(12, audioContext.currentTime);     // Compression ratio
    compressorNode.attack.setValueAtTime(0.003, audioContext.currentTime); // Fast attack (3ms) to catch sudden loud peaks
    compressorNode.release.setValueAtTime(0.25, audioContext.currentTime); // Release time (250ms)

    const gainLL = audioContext.createGain();
    const gainLR = audioContext.createGain();
    const gainRR = audioContext.createGain();
    const gainRL = audioContext.createGain();

    splitterNode.connect(gainLL, 0);
    splitterNode.connect(gainLR, 0);
    splitterNode.connect(gainRL, 1);
    splitterNode.connect(gainRR, 1);

    gainLL.connect(mergerNode, 0, 0);
    gainRL.connect(mergerNode, 0, 0);
    gainRR.connect(mergerNode, 0, 1);
    gainLR.connect(mergerNode, 0, 1);

    const pipeline = {
        audioContext,
        sourceNode,
        gainNode,
        panNode,
        splitterNode,
        mergerNode,
        compressorNode,
        matrix: {
            gainLL,
            gainLR,
            gainRL,
            gainRR
        }
    };
    pipelines.set(media, pipeline);
    applySettings(pipeline);
}
function applySettings(pipeline) {
    const { gain, pan, flip, mono } = currentSettings;
    const now = pipeline.audioContext.currentTime;

    const isReset = (gain == 1 && pan == 0 && !flip && !mono);
    try {
        pipeline.sourceNode.disconnect();
        pipeline.gainNode.disconnect();
        pipeline.mergerNode.disconnect();

        pipeline.panNode.disconnect();
        pipeline.compressorNode.disconnect();
    }
    catch (error) {
        console.log("Error in ApplySettins: ", error);
    }
    if (isReset) {
        pipeline.sourceNode.connect(pipeline.audioContext.destination);
    }
    else {
        pipeline.sourceNode.connect(pipeline.gainNode);
        pipeline.gainNode.connect(pipeline.splitterNode);

        if (mono) {

            pipeline.matrix.gainLL.gain.setTargetAtTime(0.5, now, 0.01);
            pipeline.matrix.gainRR.gain.setTargetAtTime(0.5, now, 0.01);
            pipeline.matrix.gainLR.gain.setTargetAtTime(0.5, now, 0.01);
            pipeline.matrix.gainRL.gain.setTargetAtTime(0.5, now, 0.01);

        } else if (flip) {

            pipeline.matrix.gainLL.gain.setTargetAtTime(0, now, 0.01);
            pipeline.matrix.gainRR.gain.setTargetAtTime(0, now, 0.01);
            pipeline.matrix.gainLR.gain.setTargetAtTime(1, now, 0.01);
            pipeline.matrix.gainRL.gain.setTargetAtTime(1, now, 0.01);

        } else {

            pipeline.matrix.gainLL.gain.setTargetAtTime(1, now, 0.01);
            pipeline.matrix.gainRR.gain.setTargetAtTime(1, now, 0.01);
            pipeline.matrix.gainLR.gain.setTargetAtTime(0, now, 0.01);
            pipeline.matrix.gainRL.gain.setTargetAtTime(0, now, 0.01);
        }

        pipeline.mergerNode.connect(pipeline.panNode);

        if (gain >= 5) {
            pipeline.panNode.connect(pipeline.compressorNode);
            pipeline.compressorNode.connect(pipeline.audioContext.destination);
        }
        else {
            pipeline.panNode.connect(pipeline.audioContext.destination);

        }
        // This is done so that the volume changes gradually and no pop sounds can occur
        pipeline.gainNode.gain.setTargetAtTime(gain, now, 0.01);
        pipeline.panNode.pan.setTargetAtTime(pan, now, 0.01);
    }

}

function applySettingsToAllPipelines() {

    // since there are  multiple media elements so this is done to apply the same settings on every element in one go
    // might change this so that the user can manually handle all the media elements on their own
    pipelines.forEach(pipeline => {
        applySettings(pipeline);
    });
}

function captureAudioElements(root = document) {
    return root.querySelectorAll("audio, video");
}

const processedElements = new WeakSet();

function processAudioElements(root = document) {
    const mediaElements = captureAudioElements(root);
    mediaElements.forEach(element => {
        if (!processedElements.has(element)) {
            processedElements.add(element);
            createAudioPipeline(element);
        }
    });
}
function resumeContext() {
    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
}

function cleanupPipeline(media) {
    const p = pipelines.get(media);
    if (!p) return;

    try {
        p.sourceNode.disconnect();
        p.gainNode.disconnect();
        p.splitterNode.disconnect();
        p.matrix.gainLL.disconnect();
        p.matrix.gainRL.disconnect();
        p.matrix.gainLR.disconnect();
        p.matrix.gainRR.disconnect();
        p.mergerNode.disconnect();
        p.panNode.disconnect();
        p.compressorNode.disconnect();
    } catch { }

    pipelines.delete(media);
    // Done so that when the application re-renders, the same element can be encountered again
    processedElements.delete(media);
}
 

document.addEventListener("click", resumeContext, { once: true });
document.addEventListener("keydown", resumeContext, { once: true });

processAudioElements(document);

const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
                if (node.matches?.("audio, video")) {
                    createAudioPipeline(node);
                } else {
                    processAudioElements(node);
                }
            }
        });
        mutation.removedNodes.forEach(node => {
            if (node.nodeType !== 1) return;

            if (pipelines.has(node)) {
                cleanupPipeline(node);
            }

            // this can give access to elements which change the parent element such as "div" and are left during cleanups
            if (node.querySelectorAll) {
                captureAudioElements(node).forEach(el => {
                    if (pipelines.has(el)) {
                        cleanupPipeline(el);
                    }
                });
            }
        });
    });
});


observer.observe(document.body, { childList: true, subtree: true });
// now everytime the storage value changes, the settings are applied, improves synchronization
browser.storage.onChanged.addListener((changes, area) => {
    if (area == "local") {
        if (changes.gain) currentSettings.gain = changes.gain.newValue;
        if (changes.pan) currentSettings.pan = changes.pan.newValue;
        if (changes.flip) currentSettings.flip = changes.flip.newValue;
        if (changes.mono) currentSettings.mono = changes.mono.newValue;
        applySettingsToAllPipelines();
    }

});
