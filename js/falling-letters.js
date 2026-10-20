// Falling 2D Objects (Osmo Supply, Matter.js), with the letters of the Lake logo.
// Changed from the original: the textures are the L, A, K and E, and the
// bodies are rounded squares (the letters' own corner radius) instead of circles.

function initFalling2DMatterJS() {

  const canvas = document.querySelector("#canvas-target");

  // Check if canvas is on page
  if (!canvas) {
    return;
  }

  const canvasWidth = canvas.clientWidth + 2;
  const canvasHeight = canvas.clientHeight + 2;
  const canvasWallDepth = canvasWidth / 4;
  const smileyAmount = 15; // Amount of objects added to the canvas
  const smileySize = canvasWidth / 7.5; // Size of objects
  const smileySizeTexture = 256; // Size of object texture in pixels
  const smileySizeScale = smileySize / smileySizeTexture;
  const smileyRestitution = 0.75; // Bounciness
  const worldGravity = 2; // Gravity
  const letterCornerRadius = smileySize * (2.1 / 32); // Matches the logo's rounded corners

  // Modules
  let { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;

  // Create an engine
  let engine = Engine.create();
  engine.world.gravity.y = worldGravity;

  // Create a renderer
  let render = Render.create({
    element: canvas,
    engine: engine,
    options: {
      background: "transparent",
      wireframes: false,
      width: canvasWidth,
      height: canvasHeight,
      pixelRatio: 2,
      border: "none",
    }
  });

  // Generate a random number between min (inclusive) and max (exclusive)
  function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
  }

  let min = smileySize / 2; // min value
  let max = canvasWidth - (smileySize / 2); // max value

  // Textures: the four letters of the logo (paths start at the site root, so
  // they still load when the 404 shows up at a deeper address)
  let textureArray = [
    '/assets/branding-images/letters/lake-l.svg',
    '/assets/branding-images/letters/lake-a.svg',
    '/assets/branding-images/letters/lake-k.svg',
    '/assets/branding-images/letters/lake-e.svg'
  ];

  // Function to loop trough all textures
  let textureIndex = 0;
  function getNextTexture() {
    const texture = textureArray[textureIndex];
    textureIndex = (textureIndex + 1) % textureArray.length;
    return texture;
  }

  // Function to get a random texture
  function getRandomTexture() {
    const randomIndex = Math.floor(Math.random() * textureArray.length);
    return textureArray[randomIndex];
  }

  // Create letter
  const smileyCreate = () => {
    let smiley = Bodies.rectangle(getRandomNumber(min, max), smileySize, smileySize,
      smileySize, {
        chamfer: {
          radius: letterCornerRadius
        },
        restitution: smileyRestitution,
        render: {
          sprite: {
            texture: getNextTexture(), // Replace with "getRandomTexture()" to get random textures
            xScale: smileySizeScale,
            yScale: smileySizeScale
          }
        }
      });
    Composite.add(engine.world, smiley);
  };

  // Create a box with rectangle(x, y, width, height)
  let boxTop = Bodies.rectangle(canvasWidth / 2 + (canvasWallDepth * 2), canvasHeight +
    canvasWallDepth, canvasWidth + (canvasWallDepth * 4), (canvasWallDepth * 2), {
      isStatic: true
    });

  let boxLeft = Bodies.rectangle((canvasWallDepth * -1), canvasHeight / 2, (canvasWallDepth * 2),
    canvasHeight, {
      isStatic: true
    });

  let boxRight = Bodies.rectangle(canvasWidth + canvasWallDepth, canvasHeight / 2, (
    canvasWallDepth * 2), canvasHeight, {
    isStatic: true
  });

  let boxBottom = Bodies.rectangle(canvasWidth / 2 + (canvasWallDepth * 2), (canvasWallDepth * -1),
    canvasWidth + (canvasWallDepth * 4), (canvasWallDepth * 2), {
      isStatic: true
    });

  // Add all of the bodies to the world
  Composite.add(engine.world, [boxTop, boxLeft, boxRight, boxBottom]);

  // Run the renderer
  Render.run(render);

  // Create runner
  let runner = Runner.create();

  // Run the engine
  Matter.Runner.run(runner, engine);

  // Custom Function:
  // To run the function X amount of times
  function repeatedFunction(count, maxCount) {
    if (count < maxCount) {
      smileyCreate();
      setTimeout(() => {
        repeatedFunction(count + 1, maxCount);
      }, 100); // Delay in milliseconds
    }
  }
  repeatedFunction(0, smileyAmount);

  // Create mouse
  let mouse = Mouse.create(render.canvas);
  let mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      render: {
        visible: false
      }
    }
  });

  Composite.add(engine.world, mouseConstraint);

  // Fix: Allow native page scroll
  mouseConstraint.mouse.element.removeEventListener("mousewheel", mouseConstraint.mouse.mousewheel);
  mouseConstraint.mouse.element.removeEventListener("DOMMouseScroll", mouseConstraint.mouse.mousewheel);

  // Fix: Scroll on touch devices
  mouseConstraint.mouse.element.removeEventListener('touchstart', mouseConstraint.mouse.mousedown);
  mouseConstraint.mouse.element.removeEventListener('touchmove', mouseConstraint.mouse.mousemove);
  mouseConstraint.mouse.element.removeEventListener('touchend', mouseConstraint.mouse.mouseup);

  mouseConstraint.mouse.element.addEventListener('touchstart', mouseConstraint.mouse.mousedown, { passive: true });
  mouseConstraint.mouse.element.addEventListener('touchmove', (e) => {
    if (mouseConstraint.body) {
      mouseConstraint.mouse.mousemove(e);
    }
  });
  mouseConstraint.mouse.element.addEventListener('touchend', (e) => {
    if (mouseConstraint.body) {
      mouseConstraint.mouse.mouseup(e);
    }
  });
}

// Initialize Falling 2D Elements (Matter.js)
document.addEventListener('DOMContentLoaded', function() {
  initFalling2DMatterJS();
});
