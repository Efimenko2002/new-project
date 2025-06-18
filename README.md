# NoteMap PWA

This project is a simple progressive web app that lets you place notes on a map. It uses Leaflet for map rendering and stores notes in `localStorage` so they persist across page reloads.

## Running a Local Server

Open a terminal in the project directory and run:

```bash
python3 -m http.server
```

Then open `http://localhost:8000` in your browser to load the app.

## Adding Notes

1. Type a note in the text box under the map.
2. Click **Save note**.
3. A message will appear asking you to choose a location. Click on the map where you want to place the note.
4. A marker will be added at that spot and the note text will be saved.

Notes near the current map view are listed under the text box. All markers are saved locally so they remain when you refresh the page.

## Example Screenshot

Below is a screenshot showing a map with two sample notes.
