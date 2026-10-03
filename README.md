# BssBssBss

Modulares Three.js/Vite-Spielprojekt mit Piet, Zelda und Yuki.

## Start

```bash
npm install
npm run dev
```

## Aktueller Stand

- modernes Hauptmenü mit 3D-Katzen
- Third-Person-Kamera mit Maus und Zoom
- WASD + Sprint
- Sprungmechanik mit Jump Buffer und Coyote Time
- Möbel- und Wandkollisionen
- niedrige Hindernisse können als Oberfläche erkannt werden
- Raum-Editor mit Platzieren, Drag & Drop, Drehen und Löschen
- frei laufender Mensch
- prozedurale Musik und Soundeffekte
- automatischer GitHub-Actions-Build

## Steuerung

- WASD – bewegen
- Shift – rennen
- Leertaste – springen
- Maus ziehen – Kamera
- Mausrad – Zoom
- 1 / 2 / 3 – Piet / Zelda / Yuki
- Tab – nächste Katze
- Esc – Hauptmenü

### Raum-Editor

- Möbel wählen und auf den Boden klicken – platzieren
- vorhandenes Möbel anklicken + ziehen – verschieben
- rechte Maustaste ziehen – Editor-Kamera
- R – drehen
- Entf / Backspace – löschen

## Struktur

```
src/
├─ core/
│  ├─ Game.js
│  └─ Input.js
├─ entities/
│  ├─ Cat.js
│  └─ Human.js
├─ systems/
│  ├─ AudioSystem.js
│  ├─ CameraController.js
│  ├─ CollisionSystem.js
│  ├─ MovementSystem.js
│  ├─ Room.js
│  └─ RoomEditor.js
├─ ui/
│  └─ UI.js
├─ config.js
├─ main.js
└─ styles.css
```

## Nächste Schritte

1. Sprung und Möbelkollisionen im echten Browser testen und feinjustieren
2. Katzenmodelle in rigged GLB/GLTF-Modelle überführen
3. unterschiedliche echte Lauf-/Sprunganimationen pro Katze
4. Mensch-KI und Interaktionen ausbauen
5. Raum-Editor um Skalierung, Snap und Speichern/Laden erweitern

Die privaten Referenzfotos von Piet, Zelda und Yuki werden nicht ungefragt in dieses öffentliche Repository hochgeladen.
