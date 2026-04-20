// let audioContext, gainNode, panNode, sourceNode, splitterNode, mergerNode;
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

    currentSettings.gain = data.gain ?? 1;
    currentSettings.pan = data.pan ?? 0;
    currentSettings.flip = data.flip ?? false;
    currentSettings.mono = data.mono ?? false;

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
    const splitterNode = audioContext.createChannelSplitter(2);
    splitterNode.channelCount = 2;
    splitterNode.channelCountMode ="explicit";
    const mergerNode = audioContext.createChannelMerger(2);
    // const compressorNode = audioContext.createDynamicsCompressor();

    sourceNode.connect(gainNode);
    gainNode.connect(splitterNode);
    // compressorNode.connect(splitterNode);
    splitterNode.connect(mergerNode, 0, 0);
    splitterNode.connect(mergerNode, 1, 1);
    mergerNode.connect(panNode);
    panNode.connect(audioContext.destination);
    const pipeline = {
        audioContext,
        sourceNode,
        gainNode,
        panNode,
        splitterNode,
        mergerNode
    };
    pipelines.set(media, pipeline);
    applySettings(pipeline);
}
function applySettings(pipeline) {
    const { gain, pan, flip, mono } = currentSettings;
    pipeline.gainNode.gain.setTargetAtTime(gain, pipeline.audioContext.currentTime, 0.01);
    pipeline.panNode.pan.setTargetAtTime(pan, pipeline.audioContext.currentTime, 0.01);
    try {
        pipeline.splitterNode.disconnect(pipeline.mergerNode);
        
    } catch (error) {
        console.log("Error: ", error);
    }

    if (mono) {

        pipeline.splitterNode.connect(pipeline.mergerNode, 0, 0);
        pipeline.splitterNode.connect(pipeline.mergerNode, 0, 1);
    } else if (flip) {

        pipeline.splitterNode.connect(pipeline.mergerNode, 0, 1);
        pipeline.splitterNode.connect(pipeline.mergerNode, 1, 0);
    } else {

        pipeline.splitterNode.connect(pipeline.mergerNode, 0, 0);
        pipeline.splitterNode.connect(pipeline.mergerNode, 1, 1);
    }
}

function applySettingsToAllPipelines() {
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
        p.mergerNode.disconnect();
        p.panNode.disconnect();
    } catch { }

    pipelines.delete(media);
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
            if (node.nodeType === 1) {
                if (pipelines.has(node)) {
                    cleanupPipeline(node);
                }
            }
        });
    });
});


observer.observe(document.body, { childList: true, subtree: true });

browser.runtime.onMessage.addListener((message) => {
    if (message.gain !== undefined) currentSettings.gain = message.gain;
    if (message.pan !== undefined) currentSettings.pan = message.pan;
    if (message.flip !== undefined) currentSettings.flip = message.flip;
    if (message.mono !== undefined) currentSettings.mono = message.mono;
    applySettingsToAllPipelines();
});

