import { createShader } from "https://esm.sh/shaders@3.2.475/js";

const canvas = document.querySelector(".hero-shader");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motion = (speed) => (reduceMotion ? 0 : speed);

// Slow turntable sway; holds still at the resting angle when motion is reduced.
const sway = (rest, min, max, speed) =>
  reduceMotion
    ? rest
    : { type: "auto-animate", mode: "ping-pong", outputMin: min, outputMax: max, speed, easing: "sine" };

const ASSETS =
  "https://data.shaders.com/storage/v1/object/public/user-uploaded-images/user_3DnS8ORfCCUOpQsxW30otaF33Xs";

// Background scene: blurred photo, aurora, flow, film and grid
const sceneLayers = (prefix) => [
  {
    type: "BokehBlur",
    id: `${prefix}Bokeh`,
    props: {
      bladeRotation: 153,
      chromaticFringe: 0.3,
      highlightGain: 6.6,
      highlightThreshold: 0.52,
      radius: 89,
    },
    children: [
      {
        type: "ImageTexture",
        id: `${prefix}ImageBase`,
        props: {
          boundingBox: {
            x: { unit: "uv", value: -0.0027 },
            y: { unit: "uv", value: -0.0001 },
            width: { unit: "uv", value: 1 },
            height: { unit: "uv", value: 1 },
            origin: "center",
          },
          url: `${ASSETS}/lp4HcMFgK0g0.png`,
        },
      },
      {
        type: "ImageTexture",
        id: `${prefix}ImageTop`,
        props: {
          boundingBox: {
            y: { unit: "uv", value: -0.1283 },
            width: { unit: "uv", value: 1.035 },
            height: { unit: "uv", value: 1.038 },
            origin: "center",
          },
          url: `${ASSETS}/2bcYTq9IH5RI.png`,
        },
      },
      {
        type: "Aurora",
        id: `${prefix}Aurora`,
        props: {
          colorA: "#2aaab8",
          colorB: "#3eff20",
        },
      },
      {
        type: "FlowField",
        id: `${prefix}Flow`,
        props: {
          detail: 1.1,
          seed: 72,
          speed: motion(4),
          strength: 0.09,
        },
      },
      {
        type: "FilmStock",
        id: `${prefix}Film`,
        props: {
          halation: 0.21,
          halationRadius: 22,
          strength: 0.23,
        },
      },
    ],
  },
  {
    type: "ImageTexture",
    id: `${prefix}Grid`,
    props: {
      blendMode: "overlay",
      boundingBox: {
        x: { unit: "uv", value: -0.1346 },
        y: { unit: "uv", value: 0.1144 },
        width: { unit: "uv", value: 2.5 },
        height: { unit: "uv", value: 1.9 },
        origin: "center",
      },
      url: `${ASSETS}/tZYBzFKmH9ah.svg`,
      objectFit: "cover", // don't stretch the grid
    },
  },
];

if (canvas) {
  createShader(canvas, {
    components: [
      ...sceneLayers("hero"),
      {
        type: "Glass",
        id: "heroGlass",
        props: {
          aberration: 0.39,
          blur: 11.5,
          center: { x: 0.73, y: 0.47 },
          edgeSoftness: 0.13,
          fresnel: 0.57,
          fresnelSoftness: 0.15,
          innerZoom: 1.01,
          refraction: 2,
          scale: 0.5,
          shape: {
            type: "svg",
            geometry: "extrude",
            svgUrl: `${ASSETS}/YfpSg1lpNK-y.svg`,
            depth: 0.31,
            bevel: 0.02,
            rotX: sway(6.5, 2, 11, 0.18),
            rotY: sway(-42.5, -58, -27, 0.25),
            rotZ: 14.7,
          },
          shapeSdfUrl: `${ASSETS}/vjw-wdH1Tc1l_sdf.bin`,
          shapeType: "svgExtrude3D",
          thickness: 0.15,
        },
      },
      {
        type: "Glitch",
        id: "heroGlitch",
        props: {
          blockDensity: 3,
          colorBarIntensity: 0.04,
          intensity: 0.42,
          mirrorAmount: 0.18,
          rgbShift: 1.5,
          scanlineIntensity: 0.23,
          speed: 0.4,
          visible: !reduceMotion, // it flickers, so skip it for reduced motion
        },
      },
      {
        type: "ProgressiveBlur",
        id: "heroProgressiveBlur",
        props: {
          falloff: 0.1,
          intensity: 2,
        },
      },
      {
        type: "FilmGrain",
        id: "heroGrain",
        props: {
          bias: 5.1,
          strength: 0.8,
        },
      },
    ],
  }).catch(() => {
    // No WebGPU: the hero keeps its solid dark fallback background.
    canvas.remove();
  });
}

// Pink "A" between the hero and the work section. Separate canvas since it
// sits across both.
const aCanvas = document.querySelector(".section-a-shader");

if (aCanvas) {
  createShader(aCanvas, {
    components: [
      {
        type: "Goo",
        id: "sectionA",
        props: {
          center: { x: 0.5, y: 0.5 },
          gooColor: "#c93793",
          scale: 0.8,
          speed: motion(0.5),
          shape: {
            type: "svg",
            geometry: "extrude",
            svgUrl: `${ASSETS}/k258unl2fIDt.svg`,
            depth: 0.335,
            bevel: 0.02,
            // mirror of the L's angle and sway
            rotX: sway(6.5, 2, 11, 0.18),
            rotY: sway(42.5, 58, 27, 0.25),
            rotZ: -14.7,
          },
          shapeSdfUrl: `${ASSETS}/icCvbxOgAxRp_sdf.bin`,
          shapeType: "svgExtrude3D",
        },
      },
    ],
  }).catch(() => {
    aCanvas.remove();
  });
}

// Only start a shader once its canvas is close to the viewport
const startWhenNear = (target, start) => {
  const watcher = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        watcher.disconnect();
        start();
      }
    },
    { rootMargin: "600px 0px" }
  );
  watcher.observe(target);
};

// X and K shapes at the bottom of the work section
const kCanvas = document.querySelector(".work-shape--k");

if (kCanvas) {
  startWhenNear(kCanvas, () =>
    createShader(kCanvas, {
      components: [
        {
          type: "Holographic",
          id: "shapeK",
          props: {
            scale: 0.574,
            speed: motion(1),
            shape: {
              type: "svg",
              geometry: "extrude",
              svgUrl: `${ASSETS}/UoFjWTESzqPy.svg`,
              depth: 0.27,
              bevel: 0.02,
              rotX: 15,
              rotY: 30,
              rotZ: 0,
            },
            shapeSdfUrl: `${ASSETS}/KkesyqPdzbpT_sdf.bin`,
            shapeType: "svgExtrude3D",
          },
        },
      ],
    }).catch(() => kCanvas.remove())
  );
}

const xCanvas = document.querySelector(".work-shape--x");

if (xCanvas) {
  startWhenNear(xCanvas, () =>
    createShader(xCanvas, {
      components: [
        {
          type: "Water",
          id: "shapeX",
          props: {
            center: { x: 0.47, y: 0.53 },
            scale: 0.7479,
            speed: motion(0.5),
            waterColor: "#00eb3f",
            shape: {
              type: "svg",
              geometry: "extrude",
              svgUrl: `${ASSETS}/kdqLOe6Cd11R.svg`,
              depth: 0.2,
              bevel: 0.02,
              rotX: -43.5,
              rotY: -25.9,
              rotZ: 2.7,
            },
            shapeSdfUrl: `${ASSETS}/Xu32NVFxke9a_sdf.bin`,
            shapeType: "svgExtrude3D",
          },
        },
      ],
    }).catch(() => xCanvas.remove())
  );
}
