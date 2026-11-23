vendor/ — self-hosted libraries for the four spec demo sites
(reference-a, reference-b, reference-c, reference-d)

Downloaded 2026-09-20 with curl from cdn.jsdelivr.net. Nothing is fetched from a
CDN at runtime any more; every page references these files through relative
paths (../vendor/...). Only the example modules the sites actually import are
included, with the examples/jsm/ folder structure intact so the modules' own
relative imports keep resolving.


three-0.170.0/  — three.js r170
  source:  https://cdn.jsdelivr.net/npm/three@0.170.0/
  licence: MIT (see three-0.170.0/LICENSE), Copyright (c) 2010-2024 three.js authors
  files:
    build/three.module.js                        directly imported ("three")
    examples/jsm/geometries/RoundedBoxGeometry.js        imported by all four sites
    examples/jsm/lights/RectAreaLightUniformsLib.js      ref-a, ref-b, ref-c
    examples/jsm/lights/RectAreaLightTexturesLib.js      (dependency of the above)
    examples/jsm/objects/Reflector.js                    reference-d
    examples/jsm/postprocessing/EffectComposer.js        all four
    examples/jsm/postprocessing/RenderPass.js            all four
    examples/jsm/postprocessing/ShaderPass.js            all four
    examples/jsm/postprocessing/UnrealBloomPass.js       all four
    examples/jsm/postprocessing/OutputPass.js            all four
    examples/jsm/postprocessing/Pass.js                  (dependency)
    examples/jsm/postprocessing/MaskPass.js              (dependency of EffectComposer)
    examples/jsm/shaders/CopyShader.js                   (dependency)
    examples/jsm/shaders/OutputShader.js                 (dependency of OutputPass)
    examples/jsm/shaders/LuminosityHighPassShader.js     (dependency of UnrealBloomPass)
    examples/jsm/utils/BufferGeometryUtils.js            all four (mergeGeometries)
    examples/jsm/loaders/RGBELoader.js                   ADDED 2026-09-21, nur _test-umgebung/
                                                         (Radiance-.hdr lesen; erbt von DataTextureLoader
                                                         aus dem three-Kern, keine weitere Datei noetig)
  LICENSE taken from https://raw.githubusercontent.com/mrdoob/three.js/r170/LICENSE

  build/three.subset.min.js  — ADDED 2026-09-21, used by demo-konfigurator/
    Not a download. It is built from build/three.module.js in this same folder
    with esbuild (tree-shaking + minify); the entry file listing the exports and
    the build script live in bauen/. Rebuild with:
        vendor/three-0.170.0/bauen/bauen.sh
  build/three.subset-produkt.min.js  — ADDED 2026-09-21, used by demo-produkt/
    Same idea, second bundle, SEPARATE entry file (bauen/subset-produkt.entry.js).
    It additionally carries the post-processing chain, RectAreaLight, FogExp2 and
    ShaderChunk, which demo-produkt needs and the configurator does not. It is
    deliberately NOT merged into three.subset.min.js: the configurator prints its
    own transfer weight on its page, and these extra exports would have inflated
    that measurement by several hundred kilobytes. 489 KB against 1 284 KB for the
    full module; whole demo-produkt page measured 2 012 KB -> 1 218 KB. Rebuild:
        vendor/three-0.170.0/bauen/bauen.sh produkt
    Still outstanding there: examples/jsm/lights/RectAreaLightTexturesLib.js is
    306 KB of LTC lookup tables. It is raw numeric data, so tree-shaking and
    minification do not touch it; it would only go away by dropping RectAreaLight.

    Why: the preview server sends no gzip, so build/three.module.js is 1 314 659 B
    on the wire — more than the whole transfer budget of the configurator page
    (< 1 MB). The subset is 546 277 B (-58 %) and carries the same r170 code and
    the same MIT licence. Anyone needing another three export adds it to
    bauen/subset.entry.js and rebuilds; a missing export throws on load, so it
    cannot go unnoticed.

gsap-3.13.0/   — GSAP 3.13.0 core + ScrollTrigger
  source:  https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js
           https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js
  licence: GSAP standard "no charge" licence — free to use, including
           commercially, in any project where a fee is NOT collected from
           multiple end users for access to the GSAP features (that case needs
           a Club GSAP commercial licence). Full text and terms:
           https://gsap.com/community/standard-license/
           The licence header is kept inside the minified files.
           Note: gsap.min.js and ScrollTrigger.min.js are both covered by the
           standard licence; no Club-only plugins (SplitText, ScrollSmoother,
           MorphSVG, ...) are used here.

lenis-1.3.4/   — Lenis 1.3.4 smooth scroll
  source:  https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis.min.js
  licence: MIT (see lenis-1.3.4/LICENSE), Copyright (c) darkroom.engineering

Not self-hosted on purpose: Google Fonts (fonts.googleapis.com /
fonts.gstatic.com) still load from Google, as briefed. The preconnect hints for
both hosts are present in every page head.

To refresh a version: curl the same paths with the new version number into a new
versioned folder and repoint the importmap and the <script src> lines. Do not
edit the vendored files.
