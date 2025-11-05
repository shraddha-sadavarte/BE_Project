import { useRef, useState, useEffect } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";

const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];

const dist = (p1, p2) =>
  Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2);

const computeEAR = (eye) => {
  const A = dist(eye[1], eye[5]);
  const B = dist(eye[2], eye[4]);
  const C = dist(eye[0], eye[3]);
  return (A + B) / (2.0 * C);
};

export default function useFaceRecognition() {
  const videoRef = useRef(null);
  const [faceMesh, setFaceMesh] = useState(null);
  const [blinked, setBlinked] = useState(false);
  const [facing, setFacing] = useState(false);
  const [camera, setCamera] = useState(null);
  const [modelReady, setModelReady] = useState(false);

  // --- Initialize FaceMesh ---
  useEffect(() => {
    const fm = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    fm.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    fm.onResults(onResults);
    setFaceMesh(fm);

    // Mark model ready after a small delay
    setTimeout(() => setModelReady(true), 2000);
  }, []);

  const onResults = (results) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setFacing(false);
      return;
    }

    setFacing(true);
    const landmarks = results.multiFaceLandmarks[0];

    const leftEye = LEFT_EYE_INDICES.map((i) => landmarks[i]);
    const rightEye = RIGHT_EYE_INDICES.map((i) => landmarks[i]);
    const leftEAR = computeEAR(leftEye);
    const rightEAR = computeEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;

    // More sensitive blink threshold
    if (avgEAR < 0.27) {
      setBlinked(true);
    }
  };

  const startCamera = async () => {
    if (!videoRef.current || !faceMesh) {
      console.error("❌ Camera or FaceMesh not ready yet");
      return false;
    }

    const newCam = new cam.Camera(videoRef.current, {
      onFrame: async () => {
        await faceMesh.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    setCamera(newCam);
    await newCam.start();
    return true;
  };

  const stopCamera = () => {
    if (camera) camera.stop();
  };

  const detectLiveness = async ({ timeout = 8000, interval = 200 } = {}) => {
    setBlinked(false);
    await new Promise((r) => setTimeout(r, 1500)); // let camera stabilize

    return new Promise((resolve) => {
      const start = Date.now();
      const timer = setInterval(() => {
        if (blinked) {
          clearInterval(timer);
          resolve(true);
        }
        if (Date.now() - start > timeout) {
          clearInterval(timer);
          resolve(false);
        }
      }, interval);
    });
  };

  const captureFace = async () => {
    // Replace later with ML face embedding model
    return [Math.random(), Math.random(), Math.random()];
  };

  return {
    videoRef,
    startCamera,
    stopCamera,
    detectLiveness,
    captureFace,
    facing,
    modelReady,
  };
}
