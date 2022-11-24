/*
https://blog.tensorflow.org/2020/03/face-and-hand-tracking-in-browser-with-mediapipe-and-tensorflowjs.html
*/

// Face Mesh - https://github.com/tensorflow/tfjs-models/tree/master/facemesh

import React, { useEffect } from "react";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

import { MEDIAPIPE_FACE_CONFIG } from "./shared/params";
import { Camera } from "./camera";

let camera, detector;
let jELs = {};
let TOTAL_BLINKS = 0;
let COUNTER = 1;
let LAST_BLINK_TS;

const STATE = {
  camera: { targetFPS: 60, sizeOption: "640 X 480" },
  backend: "",
  flags: {},
  modelConfig: {
    triangulateMesh: false,
    boundingBox: false,
  },
};

// console.log(process.pwd);
const createDetector = async () => {
  const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
  const detector = await faceLandmarksDetection.createDetector(model, {
    runtime: "mediapipe",
    ...MEDIAPIPE_FACE_CONFIG,
    //solutionPath: `/`,
    solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh`,
  });
  return detector;
};

async function renderResult() {
  if (camera.video.readyState < 2) {
    await new Promise((resolve) => {
      camera.video.onloadeddata = () => {
        resolve(camera.video);
      };
    });
  }

  let faces = null;

  // Detector can be null if initialization failed (for example when loading
  // from a URL that does not exist).
  if (detector != null) {
    // FPS only counts the time it takes to finish estimateFaces.
    //beginEstimateFaceStats();
    try {
      faces = await detector.estimateFaces(camera.video, {
        flipHorizontal: false,
      });
    } catch (error) {
      detector.dispose();
      detector = null;
      alert(error);
    }
    //endEstimateFaceStats();
  }

  camera.drawCtx();

  // The null check makes sure the UI is not in the middle of changing to a
  // different model. If during model change, the result is from an old model,
  // which shouldn't be rendered.
  if (faces && faces.length > 0) {
    const results = camera.drawResults(
      faces,
      STATE.modelConfig.triangulateMesh,
      STATE.modelConfig.boundingBox
    );
    jELs.ear.innerHTML = `EAR: (${results.leftEAR}, ${results.rightEAR})`;

    if (results.leftEAR < 0.1 && results.rightEAR < 0.1) {
      const timeNow = performance.now();
      if (timeNow - LAST_BLINK_TS > 500) COUNTER += 1;
      jELs.blinks.innerHTML = `BLINKS: ${COUNTER}`;
      LAST_BLINK_TS = timeNow;
    }
  }
}

async function renderPrediction() {
  await renderResult();
  requestAnimationFrame(renderPrediction);
}

async function app() {
  camera = await Camera.setupCamera(STATE.camera);

  detector = await createDetector();

  jELs.ear = document.getElementById("ears");
  jELs.blinks = document.getElementById("blinks");
  renderPrediction();
}

function App() {
  useEffect(() => {
    app();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <div className="container">
          <div className="canvas-wrapper">
            <div className="results">
              <span id="blinks">BLINKS: 0</span>
              <span id="ears" />
            </div>
            <canvas id="output"></canvas>
            {/* <span onClick={renderPrediction}>Update</span> */}
            <video
              id="video"
              playsInline
              autoPlay
              className="video-player"
            ></video>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
