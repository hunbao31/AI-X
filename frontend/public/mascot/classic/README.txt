Koaly sprite drop-in folder (skin: "classic")
=============================================

Crop the character sheet into square transparent PNGs (~256x256 or larger)
and save them here with these exact names. Each file automatically replaces
the built-in vector placeholder — no code changes, no restart needed beyond
a page reload.

  excited.png      <- sheet #1  "Hao hung"
  awesome.png      <- sheet #2  "Tuyet voi!"
  thinking.png     <- sheet #3  "Suy nghi"
  curious.png      <- sheet #4  "Thac mac"
  surprised.png    <- sheet #5  "Bat ngo"
  proud.png        <- sheet #6  "Tu hao"
  focused.png      <- sheet #7  "Tap trung"
  determined.png   <- sheet #8  "Quyet tam!"
  confused.png     <- sheet #10 "Boi roi"
  cool.png         <- sheet #11 "Ngau lam!"
  sleepy.png       <- sheet #12 "Buon ngu"
  cheer.png        <- sheet #13 "Co vu"
  oops.png         <- sheet #14 "Sai mat roi"
  gotit.png        <- sheet #15 "Da hieu!"
  love.png         <- sheet #16 "Yeu toan qua!"
  wave.png         <- sheet #17 "Tam biet!"

Missing files are fine — the app falls back per-expression.

Future skins: create a sibling folder (public/mascot/<skin-name>/) with the
same filenames and add the skin name to MascotSkin in
components/mascot/expressions.ts.
