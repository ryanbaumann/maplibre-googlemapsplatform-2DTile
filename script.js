let map = null;
let gmpSessionToken = null;
let currentApiKey = null;
let currentAttributionControl = null;
let googleLogoElement = null;

const lightStyleJson = [
    { featureType: "all", stylers: [{ saturation: -80 }, { lightness: 30 }] }
];
const darkStyleJson = [
    { featureType: "all", stylers: [{ invert_lightness: true }, { saturation: -50 }, { lightness: -20 }, { gamma: 0.8 }] }
];

let setupUI, apiKeyInput, mapStyleSelect, localizationSelect, showMapButton, setupStatusDiv, mapContainer, mapSidebar, currentStyleSpan, currentLocaleSpan, changeSettingsButton, mapStyleJsonDisplay, copyStyleButton; // Added new elements

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    setupUI = document.getElementById('setup-ui');
    apiKeyInput = document.getElementById('apiKey');
    mapStyleSelect = document.getElementById('mapStyleSelect');
    localizationSelect = document.getElementById('localizationSelect');
    showMapButton = document.getElementById('showMapButton');
    setupStatusDiv = document.getElementById('setupStatus');
    mapContainer = document.getElementById('map');
    mapSidebar = document.getElementById('map-sidebar');
    currentStyleSpan = document.getElementById('currentStyle');
    currentLocaleSpan = document.getElementById('currentLocale');
    changeSettingsButton = document.getElementById('changeSettingsButton');
    mapStyleJsonDisplay = document.getElementById('mapStyleJsonDisplay'); // Get new element
    copyStyleButton = document.getElementById('copyStyleButton'); // Get new element


    if (!setupUI || !apiKeyInput || !mapStyleSelect || !localizationSelect || !showMapButton || !setupStatusDiv || !mapContainer || !mapSidebar || !currentStyleSpan || !currentLocaleSpan || !changeSettingsButton || !mapStyleJsonDisplay || !copyStyleButton) { // Check new elements
        console.error("One or more essential UI elements are missing!");
        if (setupStatusDiv) showStatus("Error: UI elements missing. Cannot initialize.", true);
        else alert("Error: UI elements missing. Cannot initialize.");
        return;
    }

    showMapButton.addEventListener('click', handleShowMapClick);
    console.log("Event listener added to #showMapButton.");

    changeSettingsButton.addEventListener('click', returnToSetup);
    console.log("Event listener added to #changeSettingsButton.");
});


async function handleShowMapClick() {
    console.log("handleShowMapClick called.");
    clearStatus();
    showMapButton.disabled = true;
    showMapButton.textContent = 'Loading...';

    const apiKey = apiKeyInput.value.trim();
    const styleOption = mapStyleSelect.value;
    const localizationOption = localizationSelect.value;

    if (!apiKey) {
        showStatus("Please enter your Google Maps Platform API Key.", true);
        resetShowMapButton();
        return;
    }

    currentApiKey = apiKey;

    await fetchSessionAndLoadMap(apiKey, styleOption, localizationOption);

}


async function fetchSessionAndLoadMap(apiKey, styleOption, localizationOption) {
    console.log(`Fetching session token with style: ${styleOption}, localization: ${localizationOption}`);
    showStatus("Fetching session token...");

    const createSessionUrl = `https://tile.googleapis.com/v1/createSession?key=${apiKey}`;
    const requestBody = buildCreateSessionBody(styleOption, localizationOption);

    if (!requestBody) {
        showStatus("Invalid style or localization option selected.", true);
        resetShowMapButton();
        return;
    }

    console.log("CreateSession Request Body:", JSON.stringify(requestBody, null, 2));

    try {
        const response = await fetch(createSessionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data?.error?.message || `HTTP error ${response.status}`;
            console.error("CreateSession API Error:", errorMsg, data);
            throw new Error(`Failed to get session token: ${errorMsg}`);
        }

        console.log("Received data from createSession:", JSON.stringify(data, null, 2));

        if (!data || !data.session) {
            console.error("API response missing 'session' field:", data);
            throw new Error("API response missing required 'session' field.");
        }

        gmpSessionToken = data.session;
        console.log("Session Token obtained:", gmpSessionToken);

        showStatus("Initializing map...");

        map = await initializeMap([-74.5, 40], 9, styleOption);

        await setGmpStyle(apiKey, gmpSessionToken, styleOption); // Ensure mapId is removed here too

        updateAndShowMapSidebar(styleOption, localizationOption);

        updateAttribution();

        clearStatus();
        setupUI.classList.add('hidden');
        mapContainer.classList.add('visible');


    } catch (error) {
        console.error('Error during session token fetch or map load:', error);
        showStatus(`Error: ${error.message}`, true);
        gmpSessionToken = null;
        currentApiKey = null;

        if (map) {
            try { map.remove(); } catch(e) { console.warn("Minor error removing map instance:", e); }
            map = null;
        }
        mapContainer.classList.remove('visible');
        mapSidebar.classList.remove('visible');
        setupUI.classList.remove('hidden');
        resetShowMapButton();
    }
}


function buildCreateSessionBody(styleOption, localizationOption) {
    const body = {};

    switch (styleOption) {
        case 'roadmap':
        case 'light':
        case 'dark':
            body.mapType = 'roadmap';
            break;
        // Removed satellite_labels case
        case 'satellite_nolabels':
            body.mapType = 'satellite';
            break;
        default:
            console.error("Invalid style option:", styleOption);
            return null;
    }

    switch (localizationOption) {
        case 'us':
            body.language = 'en-US';
            body.region = 'US';
            break;
        case 'cn':
            body.language = 'zh-CN';
            body.region = 'CN';
            break;
        case 'es':
            body.language = 'es-ES';
            body.region = 'ES';
            break;
        case 'fr':
            body.language = 'fr-FR';
            body.region = 'FR';
            break;
        case 'de':
            body.language = 'de-DE';
            body.region = 'DE';
            break;
        case 'jp':
            body.language = 'ja-JP';
            body.region = 'JP';
            break;
        default:
            console.error("Invalid localization option:", localizationOption);
            return null;
    }

    if (styleOption === 'light') {
        body.styles = lightStyleJson;
    } else if (styleOption === 'dark') {
        body.styles = darkStyleJson;
    }

    return body;
}


function initializeMap(center, zoom, styleOption) {
    return new Promise((resolve, reject) => {

        const minimalStyle = {
            version: 8,
            sources: {},
            layers: [{
                id: 'background',
                type: 'background',
                paint: {
                    'background-color': '#f0f0f0'
                }
            }]
        };

        console.log(`Initializing MapLibre map for styleOption: ${styleOption}`);
        try {
             if (map) {
                try { map.remove(); } catch(e) { console.warn("Minor error removing previous map instance:", e); }
                map = null;
            }

            const newMap = new maplibregl.Map({
                container: 'map',
                style: minimalStyle,
                center: center,
                zoom: zoom,
                attributionControl: false
            });

            newMap.addControl(new maplibregl.NavigationControl());

            newMap.on('load', () => {
                console.log("MapLibre map initial 'load' event fired.");
                console.log("MapLibre map object initialized and base style loaded:", newMap);
                resolve(newMap);
            });

            newMap.on('error', (e) => {
                 console.error("MapLibre map error event during initialization:", e);
                 reject(e.error || new Error("MapLibre map failed to load initial style."));
            });

        } catch (initError) {
             console.error("Error during MapLibre map instantiation:", initError);
             reject(initError);
        }
    });
}


function setGmpStyle(apiKey, sessionToken, styleOption) { // Confirm mapId parameter is removed
    return new Promise((resolve, reject) => {
        if (!map || !sessionToken || !apiKey) { // Confirm mapId check is removed
            return reject(new Error("Cannot set map style due to missing parameters."));
        }
        console.log(`Setting/Adding GMP style for option: ${styleOption}`);
        showStatus("Applying map style...");

        const tileUrl = `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${sessionToken}&key=${apiKey}`; // Confirm map_id is removed from URL
        const gmpSourceId = "gmp-raster-tiles";
        const gmpLayerId = "gmp-layer";

        const gmpSourceConfig = { type: "raster", tiles: [tileUrl], tileSize: 256 };
        const gmpLayerConfig = { id: gmpLayerId, type: "raster", source: gmpSourceId, minzoom: 0, maxzoom: 22 };

        // Overlay logic is no longer needed as satellite_labels is removed
        // const isOverlay = styleOption === 'satellite_labels';

        const handleStyleReady = () => {
            console.log("Map style/layer ready.");
            try {
                addControlsAndLogo(styleOption);
                setupDynamicAttribution(map);
                map.off('idle', handleStyleReady);
                map.off('error', handleStyleError);
                resolve();
            } catch (controlError) {
                console.error("Error adding controls/logo after style load:", controlError);
                map.off('idle', handleStyleReady);
                map.off('error', handleStyleError);
                reject(controlError);
            }
        };

        const handleStyleError = (e) => {
            console.error("Error during/after style setting or layer adding:", e);
            map.off('idle', handleStyleReady);
            map.off('error', handleStyleError);
            reject(e.error || new Error("Failed during map style update."));
        };

        map.once('idle', handleStyleReady);
        map.once('error', handleStyleError);

        try {
            // Always set the style now, as overlay logic is removed
            console.log("Setting GMP-only map style (replacing existing).");
            const gmpStyle = {
                version: 8,
                sources: { [gmpSourceId]: gmpSourceConfig },
                layers: [ gmpLayerConfig ]
            };
            map.setStyle(gmpStyle);
            console.log("Called map.setStyle() with GMP-only style.");

        } catch (error) {
            console.error("Immediate error during setStyle:", error); // Updated error context
            map.off('idle', handleStyleReady);
            map.off('error', handleStyleError);
            reject(error);
        }
    });
}


function addControlsAndLogo(styleOption) {
     if (!map) {
        console.error("Cannot add controls/logo: Map not initialized.");
        return;
    }
    console.log("Adding controls and logo...");

    if (currentAttributionControl) {
        try { map.removeControl(currentAttributionControl); } catch(e) { console.warn("Minor error removing old attribution control:", e)}
        console.log("Removed existing AttributionControl.");
        currentAttributionControl = null;
    }

    const currentYear = new Date().getFullYear();
    const gmpAttributionText = `Map data ©${currentYear} Google`;
    currentAttributionControl = new maplibregl.AttributionControl({
        customAttribution: gmpAttributionText,
        compact: false
    });
    map.addControl(currentAttributionControl, 'bottom-right');
    console.log("Added GMP AttributionControl to bottom-right.");

    if (googleLogoElement) {
        googleLogoElement.remove();
        console.log("Removed existing Google logo element.");
        googleLogoElement = null;
    }

    googleLogoElement = document.createElement('img');
    googleLogoElement.id = 'gmp-logo';
    googleLogoElement.alt = 'Google logo';
    // Updated condition after removing satellite_labels
    const useDarkLogo = (styleOption === 'light' || styleOption === 'dark' || styleOption === 'satellite_nolabels');
    googleLogoElement.src = useDarkLogo ? 'google_on_non_white.png' : 'google_on_white.png';

    map.getContainer().appendChild(googleLogoElement);
    console.log(`Added Google logo (${useDarkLogo ? 'dark' : 'light'} background version) to bottom-left.`);
}


function setupDynamicAttribution(mapInstance) {
    if (!mapInstance) return;
    console.log("Setting up dynamic attribution listeners.");
    mapInstance.off('moveend', updateAttribution);
    mapInstance.off('zoomend', updateAttribution);
    mapInstance.on('moveend', updateAttribution);
    mapInstance.on('zoomend', updateAttribution);
}


async function updateAttribution() {
    if (!map || !gmpSessionToken || !currentApiKey || !currentAttributionControl) {
        console.log("Skipping attribution update: Missing map, token, key, or control.");
        return;
    }
    if (!map.isStyleLoaded()) {
        console.log("Skipping attribution update: Style not loaded yet.");
        return;
    }
    console.log("Attempting attribution update...");

    const bounds = map.getBounds();
    const zoom = Math.floor(map.getZoom());

    if (!bounds.getNorth() || !bounds.getSouth() || !bounds.getEast() || !bounds.getWest() || isNaN(zoom)) {
        console.warn("Skipping attribution update: Invalid map bounds or zoom.", { north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest(), zoom });
        return;
    }

    const viewportUrl = `https://tile.googleapis.com/tile/v1/viewport?session=${gmpSessionToken}&key=${currentApiKey}&zoom=${zoom}&north=${bounds.getNorth()}&south=${bounds.getSouth()}&east=${bounds.getEast()}&west=${bounds.getWest()}`;
    console.log("Viewport URL:", viewportUrl);

    try {
        const response = await fetch(viewportUrl);
        const responseStatus = response.status;
        console.log(`Viewport fetch response status: ${responseStatus}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`Failed to fetch viewport info: ${responseStatus}. Response: ${errorText}`);
             if (currentAttributionControl && currentAttributionControl._container) {
                 currentAttributionControl._container.innerHTML = `Attribution Error (${responseStatus})`;
             }
            return;
        }

        const data = await response.json();
        console.log("Viewport response data:", data);

        if (data && data.copyright) {
            console.log("Applying new copyright:", data.copyright);
            if (currentAttributionControl && currentAttributionControl._container) {
                 currentAttributionControl._container.innerHTML = data.copyright;
                 console.log("Attribution control updated successfully.");
            } else {
                 console.warn("Attribution control container not found for update.");
            }
        } else {
             if (currentAttributionControl && currentAttributionControl._container) {
                 currentAttributionControl._container.innerHTML = "";
                 console.log("Cleared attribution control (no copyright data).");
             }
            console.warn("Viewport response missing copyright field or copyright is empty.");
        }
    } catch (error) {
        console.error('Error during attribution fetch/update:', error);
         if (currentAttributionControl && currentAttributionControl._container) {
             currentAttributionControl._container.innerHTML = "Attribution Fetch Error";
         }
    }
}

function generateMapLibreStyleJson(apiKey, sessionToken) { // Remove mapId parameter
    if (!sessionToken || !apiKey) { // Remove mapId check
        console.error("Cannot generate style JSON: Missing parameters.");
        return null;
    }
    const tileUrl = `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${sessionToken}&key=${apiKey}`; // Remove map_id from URL
    const gmpSourceId = "gmp-raster-tiles";
    const gmpLayerId = "gmp-layer";

    return {
        version: 8,
        sources: {
            [gmpSourceId]: {
                type: "raster",
                tiles: [tileUrl],
                tileSize: 256,
            }
        },
        layers: [
            {
                id: gmpLayerId,
                type: "raster",
                source: gmpSourceId,
                minzoom: 0,
                maxzoom: 22
            }
        ]
    };
}


function updateAndShowMapSidebar(styleOption, localizationOption) {
    if (!mapSidebar || !currentStyleSpan || !currentLocaleSpan || !mapStyleJsonDisplay || !copyStyleButton) return;

    const styleText = mapStyleSelect.options[mapStyleSelect.selectedIndex].text;
    const localeText = localizationSelect.options[localizationSelect.selectedIndex].text;

    currentStyleSpan.textContent = styleText;
    currentLocaleSpan.textContent = localeText;

    // Generate and display the style JSON
    const styleJson = generateMapLibreStyleJson(currentApiKey, gmpSessionToken); // Remove GMP_MAP_ID argument
    let styleJsonString = "";
    if (styleJson) {
        styleJsonString = JSON.stringify(styleJson, null, 2); // Pretty print
        mapStyleJsonDisplay.textContent = styleJsonString;
    } else {
        mapStyleJsonDisplay.textContent = "Error generating style JSON.";
    }

    // Add event listener for copy button (remove previous if any)
    copyStyleButton.replaceWith(copyStyleButton.cloneNode(true)); // Simple way to remove old listeners
    copyStyleButton = document.getElementById('copyStyleButton'); // Re-select the button
    copyStyleButton.addEventListener('click', () => {
        if (styleJsonString && navigator.clipboard) {
            navigator.clipboard.writeText(styleJsonString).then(() => {
                console.log('Style JSON copied to clipboard!');
                const originalText = copyStyleButton.textContent;
                copyStyleButton.textContent = 'Copied!';
                copyStyleButton.disabled = true;
                setTimeout(() => {
                    copyStyleButton.textContent = originalText;
                    copyStyleButton.disabled = false;
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy style JSON: ', err);
                alert('Failed to copy style.'); // Provide feedback
            });
        } else {
            alert('Clipboard API not available or style not generated.');
        }
    });


    mapSidebar.classList.add('visible');
    console.log("Map sidebar updated and shown.");
}


function returnToSetup() {
    console.log("Returning to setup screen.");
    if (map) {
        try { map.remove(); } catch(e) { console.warn("Minor error removing map instance:", e); }
        map = null;
    }
    gmpSessionToken = null;
    currentApiKey = null;
    currentAttributionControl = null;
    googleLogoElement = null;

    mapContainer.classList.remove('visible');
    mapSidebar.classList.remove('visible');
    setupUI.classList.remove('hidden');

    resetShowMapButton();
    clearStatus();
}


function showStatus(message, isError = false) {
    if (setupStatusDiv) {
        setupStatusDiv.textContent = message;
        if (isError) {
            setupStatusDiv.classList.add('error');
        } else {
            setupStatusDiv.classList.remove('error');
        }
        console.log(`UI Message (${isError ? 'Error' : 'Status'}):`, message);
    } else {
        console.error("Setup status div not found, message:", message);
    }
}


function clearStatus() {
    if (setupStatusDiv) {
        setupStatusDiv.textContent = '';
        setupStatusDiv.classList.remove('error');
    }
}


function resetShowMapButton() {
     if (showMapButton) {
        showMapButton.disabled = false;
        showMapButton.textContent = 'Show Map';
    }
}
