import * as THREE from "three";
import { GUI } from "dat.gui";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass";

// Define the path to the audio file
const AUDIO_PATH = "./assets/kurz-audio.mp3";

// Set an initial loading flag to true; used to manage UI state during loading
let isLoading = true;

/**
 * Function to hide the main section of the page.
 * Adds a "hidden" class to the section, triggering a CSS transition.
 * Once the transition ends, the section is removed from the DOM.
 */
function hideMainSection() {
  const mainElement = document.querySelector("main");
  if (mainElement) {
    mainElement.classList.add("hidden"); // Trigger fade-out animation
    mainElement.addEventListener(
      "transitionend",
      () => mainElement.remove(), // Remove the element after animation
      { once: true }, // Ensure this event listener runs only once
    );
  } else {
    console.error("Main section not found");
  }
}

// Get the "Get Started" button from the DOM
const startButton = document.querySelector(".get-started-btn");

/**
 * Function to update the content of the start button.
 * Displays a loading spinner if the app is in the loading state,
 * or sets the button text to "Get Started" when loading is complete.
 */
function updateButtonState() {
  if (isLoading) {
    // Create a spinner element
    const spinner = document.createElement("div");
    spinner.classList.add("spinner");
    // Style the spinner element for animation
    spinner.style.border = "4px solid #f3f3f3"; // Light gray background
    spinner.style.borderTop = "4px solid #4a4a8c"; // Blue spinner highlight
    spinner.style.borderRadius = "50%";
    spinner.style.width = "20px";
    spinner.style.height = "20px";
    spinner.style.animation = "spin 1s linear infinite";

    // Clear button content and add the spinner
    startButton.innerHTML = "";
    startButton.appendChild(spinner);
  } else {
    // Reset button content to "Get Started"
    startButton.innerHTML = "Get Started";
  }
}

// Call the button state update function to initialize the UI
updateButtonState();

// Create and inject CSS for the spinner animation
const styleElement = document.createElement("style");
styleElement.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleElement);

/**
 * Asynchronous self-invoking function to initialize the scene.
 * Sets up the renderer, camera, scene, post-processing, and audio controls.
 */
(async () => {
  // Initialize the WebGL renderer with antialiasing
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Create a new scene and perspective camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000, // Far clipping plane
  );

  // Parameters for the bloom effect and material colors
  const params = {
    red: 1.0,
    green: 1.0,
    blue: 1.0,
    threshold: 0.5,
    strength: 0.5,
    radius: 0.8,
  };

  // Configure the renderer for proper color space
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Set up the render pass for rendering the scene
  const renderScene = new RenderPass(scene, camera);

  // Configure the UnrealBloomPass for post-processing
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
  );
  bloomPass.threshold = params.threshold;
  bloomPass.strength = params.strength;
  bloomPass.radius = params.radius;

  // Set up the effect composer for managing multiple post-processing passes
  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.addPass(renderScene);
  bloomComposer.addPass(bloomPass);

  // Add an output pass to finalize the render output
  const outputPass = new OutputPass();
  bloomComposer.addPass(outputPass);

  // Set up the camera position and orientation
  camera.position.set(0, -2, 14);
  camera.lookAt(0, 0, 0);

  // Uniforms for the custom shader
  const uniforms = {
    u_time: { type: "f", value: 0.0 },
    u_frequency: { type: "f", value: 0.0 },
    u_red: { type: "f", value: 1.0 },
    u_green: { type: "f", value: 1.0 },
    u_blue: { type: "f", value: 1.0 },
  };

  // Create a custom ShaderMaterial using vertex and fragment shaders
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: document.getElementById("vertexshader").textContent,
    fragmentShader: document.getElementById("fragmentshader").textContent,
  });

  // Create and add a wireframe icosahedron to the scene
  const geometry = new THREE.IcosahedronGeometry(4, 15);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.material.wireframe = true;
  scene.add(mesh);

  // Add audio listener to the camera
  const listener = new THREE.AudioListener();
  camera.add(listener);

  // Create an audio object and load the audio file
  const sound = new THREE.Audio(listener);

  // Manage the play/pause state of the audio
  let isPlaying = false;

  function togglePlayPause() {
    if (isPlaying) {
      sound.pause(); // Pause the audio
    } else {
      sound.play(); // Play the audio
    }
    isPlaying = !isPlaying; // Toggle state
  }

  // Load the audio file using THREE.AudioLoader
  const audioLoader = new THREE.AudioLoader();
  audioLoader.load(
    AUDIO_PATH,
    (buffer) => {
      console.log("Audio loaded successfully!");
      sound.setBuffer(buffer);
      isLoading = false; // Mark loading as complete
      updateButtonState(); // Update button UI
      startButton.addEventListener("click", () => {
        hideMainSection(); // Hide main UI section
        togglePlayPause(); // Play the audio
        setTimeout(() => {
          window.addEventListener("click", togglePlayPause); // Allow toggling audio on window click
        }, 2);
      });
    },
    (progress) => {
      console.log(`Loading: ${(progress.loaded / progress.total) * 100}%`); // Log progress
    },
    (error) => {
      console.error("Error loading audio:", error);
    },
  );

  // Create an audio analyzer for visualizing frequency data
  const analyser = new THREE.AudioAnalyser(sound, 32);

  // Create a GUI for interactive parameter control
  const gui = new GUI();

  // Add color controls to the GUI
  const colorsFolder = gui.addFolder("Colors");
  colorsFolder.add(params, "red", 0, 1).onChange((value) => {
    uniforms.u_red.value = Number(value);
  });
  colorsFolder.add(params, "green", 0, 1).onChange((value) => {
    uniforms.u_green.value = Number(value);
  });
  colorsFolder.add(params, "blue", 0, 1).onChange((value) => {
    uniforms.u_blue.value = Number(value);
  });

  // Add bloom effect controls to the GUI
  const bloomFolder = gui.addFolder("Bloom");
  bloomFolder.add(params, "threshold", 0, 1).onChange((value) => {
    bloomPass.threshold = Number(value);
  });
  bloomFolder.add(params, "strength", 0, 3).onChange((value) => {
    bloomPass.strength = Number(value);
  });
  bloomFolder.add(params, "radius", 0, 1).onChange((value) => {
    bloomPass.radius = Number(value);
  });

  // Track mouse movement for interactive camera control
  let mouseX = 0;
  let mouseY = 0;
  document.addEventListener("mousemove", (e) => {
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;
    mouseX = (e.clientX - windowHalfX) / 100;
    mouseY = (e.clientY - windowHalfY) / 100;
  });

  // Create a clock for animations
  const clock = new THREE.Clock();

  // Animation loop to render the scene and update the camera
  function animate() {
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.5;
    camera.lookAt(scene.position);
    uniforms.u_time.value = clock.getElapsedTime();
    uniforms.u_frequency.value = analyser.getAverageFrequency();
    bloomComposer.render();
    requestAnimationFrame(animate);
  }
  animate();

  // Function to handle screen orientation changes
  function checkOrientation() {
    const message = document.getElementById("message");
    if (window.innerHeight > window.innerWidth) {
      message.style.display = "flex"; // Show the orientation warning
      if (!isLoading) togglePlayPause();
    } else {
      message.style.display = "none"; // Hide the warning
    }
  }
  checkOrientation();
  window.addEventListener("resize", checkOrientation); // Check on window resize
})();
