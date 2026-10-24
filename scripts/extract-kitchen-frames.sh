#!/usr/bin/env bash
set -euo pipefail
source_video="${1:?Usage: scripts/extract-kitchen-frames.sh /path/to/walkthrough.mp4}"
project_root="$(cd "$(dirname "$0")/.." && pwd)"
output="$project_root/public/kitchen-sequence"
[[ -f "$source_video" ]] || { echo "Video not found: $source_video" >&2; exit 1; }
mkdir -p "$output/mobile"
ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=width,height,r_frame_rate,nb_read_frames -show_entries format=duration -of json "$source_video" > "$output/source.json"
stride=$(python3 -c 'import json,math,sys; print(max(1,math.ceil(int(json.load(open(sys.argv[1]))["streams"][0]["nb_read_frames"])/240)))' "$output/source.json")
last=$(python3 -c 'import json,sys,subprocess; print(int(json.load(open(sys.argv[1]))["streams"][0]["nb_read_frames"])-1)' "$output/source.json")
# Ordered sampling, including the exact final source frame. No synthetic camera moves.
for width in 1280 720; do
  destination="$output"
  [[ "$width" == 720 ]] && destination="$output/mobile"
  ffmpeg -hide_banner -loglevel error -y -i "$source_video" -an -vf "select='not(mod(n,$stride))+eq(n,$last)',scale=$width:-2" -fps_mode vfr -c:v libwebp -quality 74 -compression_level 5 "$destination/frame-%04d.webp"
done
python3 - "$output" "$stride" <<'PY'
import json,sys,subprocess
from pathlib import Path
from fractions import Fraction
root=Path(sys.argv[1]); source=json.loads((root/'source.json').read_text()); stream=source['streams'][0]
frames=sorted(root.glob('frame-*.webp'))
assert len(frames)==len(list((root/'mobile').glob('frame-*.webp')))
dimensions=lambda file: json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=width,height','-of','json',str(file)]))['streams'][0]
desktop=dimensions(frames[0]); mobile=dimensions(root/'mobile'/frames[0].name)
metadata={'frameCount':len(frames),'width':desktop['width'],'height':desktop['height'],'mobileWidth':mobile['width'],'mobileHeight':mobile['height'],'pattern':'frame-%04d.webp','sourceFrameCount':int(stream['nb_read_frames']),'sourceFPS':float(Fraction(stream['r_frame_rate'])),'sampleStride':int(sys.argv[2]),'duration':float(source['format']['duration'])}
(root/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n'); print(json.dumps(metadata)); print('Total frame bytes:',sum(p.stat().st_size for p in root.rglob('frame-*.webp')))
PY
