Preset avatar drop-in folder
============================

Square transparent PNGs (~256x256), one per preset id:

  koaly_default.png
  koaly_happy.png
  koaly_cool.png
  koaly_smart.png
  koaly_sleepy.png
  koaly_proud.png
  koaly_love.png
  koaly_determined.png
  koaly_curious.png
  koaly_surprised.png

Missing files are fine — the app renders a built-in vector Koaly per preset
until the PNG exists. The catalog lives in frontend/lib/avatars.ts and
backend/src/users/avatars.ts (keep both lists in sync when adding presets).
