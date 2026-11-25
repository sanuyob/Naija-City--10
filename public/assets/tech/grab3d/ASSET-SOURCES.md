# Naija City — technology equipment asset sources

Source library: Grab3D. The downloaded GLBs and per-model `LICENSE.txt` files are preserved under `original/`.

License: CC0 1.0 Universal (Public Domain Dedication). Each downloaded model package includes its own licence and manifest. The game uses the mobile copies in `mobile/`, produced with glTF Transform by resizing embedded textures to a maximum dimension of 512 px. Model geometry is retained.

| Model | Source page | Triangles | Original GLB | Mobile GLB |
|---|---|---:|---:|---:|
| Sci-fi city terminal | https://grab3d.com/models/sci-fi/sci-fi-terminal/ | 10,280 | 887,076 B | ~478 KB |
| Hologram projector | https://grab3d.com/models/sci-fi/hologram-projector/ | 9,056 | 622,072 B | ~355 KB |
| Data pad | https://grab3d.com/models/sci-fi/data-pad/ | 3,496 | 434,200 B | ~165 KB |
| Walkie-talkie / field radio | https://grab3d.com/models/electronics/walkie-talkie/ | 6,716 | 666,828 B | ~317 KB |

Runtime placement: all four are displayed at Mide Tech Hub in Yaba. The city terminal and hologram projector receive compact, measured static Bullet box-collider proxies. The small data pad and field radio are visual inspection props and deliberately do not create tiny body-blocking collision boxes.

The mobile copies total approximately 1.32 MB. This is a texture-size reduction, not a polygon reduction; keep placements limited and profile on target Android hardware.
