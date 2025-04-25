# GMP Tiles + MapLibre GL JS Style Generator

This is a simple web application demonstrating how to use Google Maps Platform's 2D Map Tiles API with the [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) library. It allows you to configure basic tile settings (style, localization) and generates a corresponding MapLibre GL JS style JSON that you can copy and use in your own applications.

![image](https://github.com/user-attachments/assets/f139f15e-a9a8-43af-ad31-7324ca9d498b)

![image](https://github.com/user-attachments/assets/5a1fc85d-82c7-4ac0-86ba-47bc2fd03cf1)

## Features

*   Displays GMP Roadmap, Satellite (No Labels), Light Mode, and Dark Mode tiles.
*   Allows selection of different map styles and localizations.
*   Generates a basic MapLibre GL JS style JSON incorporating the selected GMP tiles.
*   Provides a "Copy Style JSON" button for easy integration into your projects.
*   Dynamically updates map attribution based on the viewport, adhering to GMP policies.
*   Uses session tokens for API requests.
*   Basic UI styled with [Tailwind CSS](https://tailwindcss.com/).

![image](https://github.com/user-attachments/assets/67fc5589-41a7-43ff-8829-720e9ef39191)

![image](https://github.com/user-attachments/assets/29ff260d-d099-49a3-9055-6d119adaa4ad)

## Setup

1.  **Get a GMP API Key:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/overview).
    *   Create a project or select an existing one.
    *   Enable the **Map Tiles API** under Google Maps Platform APIs. See [Map Tiles API Documentation](https://developers.google.com/maps/documentation/tile).
    *   Create an API key and **restrict it** appropriately (e.g., by HTTP referrer for web deployment). See [API Key Best Practices](https://developers.google.com/maps/documentation/general/api-key-best-practices).
    *   *Note: A Map ID is not required for using the standard Roadmap and Satellite tiles shown in this demo.*
2.  **Clone or Download:** Get the project files (`index.html`, `script.js`, `google_*.png`).
3.  **Place Files:** Ensure `index.html`, `script.js`, and the `google_*.png` logo files are in the same directory.

## Running the Generator

1.  Open the `index.html` file in your web browser.
    *   You can usually just double-click the file.
    *   Alternatively, serve the directory using a simple local web server (e.g., `python -m http.server` or using a VS Code extension like Live Server).
2.  Enter your restricted GMP API Key into the input field.
3.  Select the desired Map Style and Localization.
4.  Click "Show Map".

The map tiles will load, showing the selected style and localization. The sidebar will display the generated MapLibre GL JS style JSON. You can use the "Copy Style JSON" button to copy this configuration for use in your own MapLibre map instance. Use the "Change Settings" button to return to the setup screen.

## Relevant Links

*   [Google Maps Platform Documentation](https://developers.google.com/maps)
*   [Map Tiles API Documentation](https://developers.google.com/maps/documentation/tile)
*   [Map Tiles API Policies (Logo & Attribution)](https://developers.google.com/maps/documentation/tile/policies)
*   [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js/docs/)
*   [Tailwind CSS Documentation](https://tailwindcss.com/docs)
