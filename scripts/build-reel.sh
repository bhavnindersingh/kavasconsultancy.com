#!/usr/bin/env bash
# ————————————————————————————————————————————————————————————————
# KAVAS HERO REEL — builds the looping showreel for the media deck.
#
#   ./scripts/build-reel.sh [SRC_DIR]
#
# SRC_DIR holds the client campaign films (default ~/Downloads):
#   nimai.mov            Nimai — "Collecting Colours" split-screen cuts
#   nimai 2.mov          Nimai — desert campaign film (portrait)
#   Colours of nature.mov  The Colours of Nature — live site, plant palette
# Stills come from public/cases/.
#
# Two encodes, because .deck is 16/8.4 on desktop and 3/4.4 on mobile —
# a single crop cannot serve both without destroying the compositions.
#
# Rules of the edit:
#   • video shots get static crops (the footage already moves)
#   • still shots get a Ken Burns push (zoompan) so nothing sits dead
#   • portrait footage sits in panels on Kavas cocoa, never letterboxed
#     by accident — the matte is a deliberate frame
#   • no burned-in type: labels are live DOM in components/HeroReel.tsx,
#     driven by REEL_SHOTS in lib/reel.ts. Keep the two in sync.
# ————————————————————————————————————————————————————————————————
set -euo pipefail

SRC="${1:-$HOME/Downloads}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CASES="$ROOT/public/cases"
OUT="$ROOT/public/reel"
TMP="${KEEP_TMP:-$(mktemp -d)}"; mkdir -p "$TMP"
[ -n "${KEEP_TMP:-}" ] || trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"

N1="$SRC/nimai.mov"                  # 1920x1496, 5.52s
N2="$SRC/nimai 2.mov"                # 1124x1920, 13.47s (portrait)
CN="$SRC/Colours of nature.mov"      # 1920x1316, 3.76s

for f in "$N1" "$N2" "$CN"; do
  [ -f "$f" ] || { echo "missing source: $f" >&2; exit 1; }
done

FPS=30
COCOA="0x1c0e04"   # --color-cocoa

# quiet, fast intermediates — final quality comes from the master encode
FF="ffmpeg -hide_banner -loglevel error -y"
IENC="-c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p -an"

# —————————————————————————————— shot builders ——————————————————————————————

# vid <out> <src> <ss> <dur> <crop> <W> <H>
# straight crop out of moving footage, no added camera move.
vid() {
  local out=$1 src=$2 ss=$3 dur=$4 crop=$5 w=$6 h=$7
  $FF -ss "$ss" -t "$dur" -i "$src" \
    -vf "crop=${crop},scale=${w}:${h}:flags=lanczos,fps=${FPS},setsar=1" \
    -t "$dur" $IENC "$out"
}

# still <out> <img> <dur> <crop> <z0> <z1> <W> <H>
# Ken Burns. Pre-upscales 4x so zoompan steps land on real pixels
# instead of stair-stepping — the standard fix for zoompan judder.
still() {
  local out=$1 img=$2 dur=$3 crop=$4 z0=$5 z1=$6 w=$7 h=$8
  local frames big_w big_h
  frames=$(awk "BEGIN{printf \"%d\", $dur * $FPS}")
  big_w=$((w * 4)); big_h=$((h * 4))
  $FF -framerate $FPS -loop 1 -t "$dur" -i "$img" \
    -vf "crop=${crop},scale=${big_w}:${big_h}:flags=lanczos,\
zoompan=z='${z0}+(${z1}-${z0})*on/$((frames - 1))':d=1:\
x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${w}x${h}:fps=${FPS},\
fps=${FPS},setsar=1" \
    -t "$dur" $IENC "$out"
}

# panel <out> <ss> <dur> <crop> <panel_w> <panel_h> <bg> <W> <H>
# one portrait panel from nimai 2, centred on a flat Kavas field.
panel() {
  local out=$1 ss=$2 dur=$3 crop=$4 pw=$5 ph=$6 bg=$7 w=$8 h=$9
  $FF -ss "$ss" -t "$dur" -i "$N2" \
    -f lavfi -t "$dur" -i "color=c=${bg}:s=${w}x${h}:r=${FPS}" \
    -filter_complex "[0:v]crop=${crop},scale=${pw}:${ph}:flags=lanczos,setsar=1[fg];\
[1:v][fg]overlay=(W-w)/2:(H-h)/2,fps=${FPS},setsar=1,format=yuv420p" \
    -t "$dur" $IENC "$out"
}

# diptych <out> <ssA> <cropA> <ssB> <cropB> <dur> <panel_w> <panel_h> <W> <H>
# two moments of the same film side by side — the frame does the cutting.
diptych() {
  local out=$1 ssa=$2 cropa=$3 ssb=$4 cropb=$5 dur=$6 pw=$7 ph=$8 w=$9 h=${10}
  local gap=$(( (w - 2 * pw) / 3 ))
  $FF -ss "$ssa" -t "$dur" -i "$N2" \
    -ss "$ssb" -t "$dur" -i "$N2" \
    -f lavfi -t "$dur" -i "color=c=${COCOA}:s=${w}x${h}:r=${FPS}" \
    -filter_complex "[0:v]crop=${cropa},scale=${pw}:${ph}:flags=lanczos,setsar=1[a];\
[1:v]crop=${cropb},scale=${pw}:${ph}:flags=lanczos,setsar=1[b];\
[2:v][a]overlay=${gap}:(H-h)/2[t];\
[t][b]overlay=$((gap * 2 + pw)):(H-h)/2,fps=${FPS},setsar=1,format=yuv420p" \
    -t "$dur" $IENC "$out"
}

# ——————————————————————————————— desktop cut ———————————————————————————————
# 1920x1008 (16:8.4). 10 shots, 8.0s.
#
# Two things had to give when this came down from 17s to 8s:
#   · The second Collecting Colours pass and the RapidQS card grid are gone.
#     Both were the weakest beat in their block — a repeat and the busiest
#     frame — and at this pace there is no room for either.
#   · The closing Nimai bookend is gone. Its whole job was to make the loop
#     point read as a cut, but at 8s it would have held for 0.75s, which
#     flashes the caption rather than showing it. The necklaces moved into
#     the opening Nimai run instead and the reel now ends on RapidQS.
# No chapter is shorter than 2.2s, which is the floor for a caption you can
# actually read.

build_desktop() {
  local W=1920 H=1008 d="$TMP/d"
  mkdir -p "$d"

  # 1 · NIMAI — Collecting Colours. Source cuts itself every ~0.4s, so this
  #     one shot still lands three beats.
  vid "$d/01.mp4" "$N1" 0.00 1.10 "1920:1008:0:244" $W $H
  # 2 · NIMAI — twirl + hand-in-sand as a diptych. Starts at 8.80 now: the
  #     old 7.80 in-point spent its first second on the reclining shot, which
  #     the longer cut had time for and this one does not.
  diptych "$d/02.mp4" 8.80 "1124:1259:0:300" 2.20 "1124:1259:0:330" 0.85 900 1008 $W $H
  # 3 · NIMAI — close on the layered necklaces
  # crop aspect must equal panel aspect — scale() here does not letterbox
  panel "$d/03.mp4" 11.95 0.70 "1124:1288:0:350" 880 1008 "$COCOA" $W $H
  # 4 · NIMAI — stone-set cuffs
  still "$d/04.mp4" "$CASES/case-02/poster.jpg" 0.65 "1600:840:0:30" 1.00 1.05 $W $H
  # 5 · COLOURS OF NATURE — the indigo vat. Opens on the hand, then closes
  #     in; starting wide read as a dead frame of dark texture.
  still "$d/05.mp4" "$CASES/case-03/poster.jpg" 0.90 "1400:735:0:528" 1.00 1.08 $W $H
  # 6 · COLOURS OF NATURE — the live plant-palette page
  vid "$d/06.mp4" "$CN" 0.30 0.95 "1920:1008:0:170" $W $H
  # 7 · COLOURS OF NATURE — in tight on a swatch opening
  vid "$d/07.mp4" "$CN" 2.45 0.65 "1400:735:260:430" $W $H
  # 8 · RAPIDQS — the product in the hand it was built for
  still "$d/08.mp4" "$CASES/rapidqs/mobile.jpg" 0.90 "3000:1575:0:313" 1.00 1.07 $W $H
  # 9 · RAPIDQS — "Leave the details to us."
  still "$d/09.mp4" "$CASES/rapidqs/services.jpg" 0.70 "2280:1197:360:392" 1.05 1.00 $W $H
  # 10 · RAPIDQS — the homepage itself, drifting in
  still "$d/10.mp4" "$CASES/rapidqs/hero.jpg" 0.60 "2349:1233:321:397" 1.02 1.06 $W $H

  printf "file '%s'\n" "$d"/*.mp4 > "$d/list.txt"
  $FF -f concat -safe 0 -i "$d/list.txt" -c copy "$TMP/desktop-master.mp4"
}

# ——————————————————————————————— mobile cut ————————————————————————————————
# 720x1056 (3:4.4). Same 10 beats on the same clock, reframed for portrait.
#
# Everything is full-bleed here. Floating the wide desktop screenshots on a
# paper mat was tried and cut: at 3:4.4 the inner image shrinks to a third of
# the frame and the shot reads as an empty cream card. Portrait wants a crop
# into the artwork, not a smaller copy of the desktop composition.

build_mobile() {
  local W=720 H=1056 d="$TMP/m"
  mkdir -p "$d"

  vid "$d/01.mp4" "$N1" 0.00 1.10 "1020:1496:40:0" $W $H
  # portrait source, portrait frame — no matte needed
  vid "$d/02.mp4" "$N2" 8.80 0.85 "1124:1648:0:100" $W $H
  vid "$d/03.mp4" "$N2" 11.95 0.70 "1124:1648:0:136" $W $H
  still "$d/04.mp4" "$CASES/case-02/poster.jpg" 0.65 "614:900:365:0" 1.00 1.05 $W $H
  still "$d/05.mp4" "$CASES/case-03/poster.jpg" 0.90 "1196:1753:102:0" 1.00 1.08 $W $H
  # left column of the page: the whole pull-quote plus the first swatches
  vid "$d/06.mp4" "$CN" 0.30 0.95 "898:1316:20:0" $W $H
  # in tight on the swatches themselves — a full-height crop here would drag
  # the heading back in and clip it mid-word
  vid "$d/07.mp4" "$CN" 2.45 0.65 "600:880:700:436" $W $H
  still "$d/08.mp4" "$CASES/rapidqs/mobile.jpg" 0.90 "1364:2000:150:0" 1.00 1.06 $W $H
  still "$d/09.mp4" "$CASES/rapidqs/services.jpg" 0.70 "1364:2000:818:0" 1.05 1.00 $W $H
  # crop onto the headline rather than shrinking the whole browser window
  still "$d/10.mp4" "$CASES/rapidqs/hero.jpg" 0.60 "1364:2000:250:0" 1.02 1.06 $W $H

  printf "file '%s'\n" "$d"/*.mp4 > "$d/list.txt"
  $FF -f concat -safe 0 -i "$d/list.txt" -c copy "$TMP/mobile-master.mp4"
}

# ————————————————————————————— web deliverables —————————————————————————————
# Hero video: silent, autoplaying, decorative. Bitrate is a budget, not a
# quality target — keep the desktop MP4 near ~3MB or it stalls the fold.
#
# H.264 only, no WebM sibling. Measured on this cut: VP9 at crf 34 lands on
# the same ~2.4MB as x264 at crf 26, so the second file buys nothing but
# build time — and every browser that runs this site decodes H.264.

deliver() {
  local master=$1 name=$2 crf=$3 poster_at=$4

  $FF -i "$master" \
    -c:v libx264 -crf "$crf" -preset slow -profile:v high -level 4.0 \
    -pix_fmt yuv420p -movflags +faststart -an \
    "$OUT/${name}.mp4"

  $FF -ss "$poster_at" -i "$master" -frames:v 1 -q:v 4 "$OUT/${name}-poster.jpg"
}

echo "· building desktop cut"
build_desktop
echo "· building mobile cut"
build_mobile
echo "· encoding deliverables"
deliver "$TMP/desktop-master.mp4" "kavas-reel" 26 0.6
deliver "$TMP/mobile-master.mp4"  "kavas-reel-mobile" 27 0.6

echo
ls -lh "$OUT" | awk 'NR>1 {printf "  %-28s %s\n", $9, $5}'
