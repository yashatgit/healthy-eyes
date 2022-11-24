import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

import {
  GREEN,
  LABEL_TO_COLOR,
  NUM_IRIS_KEYPOINTS,
  NUM_KEYPOINTS,
  RED,
} from "./params";
import { TRIANGULATION } from "./triangulation";

function distance(a, b) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

export function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

export function isMobile() {
  return isAndroid() || isiOS();
}

function drawPath(ctx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
}

function calculateEAR(eyeKeyPoints) {
  const v1 = distance(eyeKeyPoints[5], eyeKeyPoints[13]);
  const v2 = distance(eyeKeyPoints[3], eyeKeyPoints[11]);
  const h1 = distance(eyeKeyPoints[0], eyeKeyPoints[16]);
  //console.log({ v1, v2, h1 });

  const ear = (v1 + v2) / (2 * h1);
  return ear;
}

const DRAW_OPTIONS = {
  iris: false,
  contours: false,
};
/**
 * Draw the keypoints on the video.
 * @param ctx 2D rendering context.
 * @param faces A list of faces to render.
 * @param triangulateMesh Whether or not to display the triangle mesh.
 * @param boundingBox Whether or not to display the bounding box.
 */
export function drawResults(ctx, faces, triangulateMesh, boundingBox) {
  let res;
  faces.forEach((face) => {
    const keypoints = face.keypoints.map((keypoint) => [
      keypoint.x,
      keypoint.y,
    ]);

    if (boundingBox) {
      ctx.strokeStyle = RED;
      ctx.lineWidth = 1;

      const box = face.box;
      drawPath(
        ctx,
        [
          [box.xMin, box.yMin],
          [box.xMax, box.yMin],
          [box.xMax, box.yMax],
          [box.xMin, box.yMax],
        ],
        true
      );
    }

    if (triangulateMesh) {
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 0.5;

      for (let i = 0; i < TRIANGULATION.length / 3; i++) {
        const points = [
          TRIANGULATION[i * 3],
          TRIANGULATION[i * 3 + 1],
          TRIANGULATION[i * 3 + 2],
        ].map((index) => keypoints[index]);

        drawPath(ctx, points, true);
      }
    } else {
      ctx.fillStyle = GREEN;

      for (let i = 0; i < NUM_KEYPOINTS; i++) {
        const x = keypoints[i][0];
        const y = keypoints[i][1];

        ctx.beginPath();
        ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    if (DRAW_OPTIONS.iris) {
      if (keypoints.length > NUM_KEYPOINTS) {
        ctx.strokeStyle = RED;
        ctx.lineWidth = 1;

        const leftCenter = keypoints[NUM_KEYPOINTS];
        const leftDiameterY = distance(
          keypoints[NUM_KEYPOINTS + 4],
          keypoints[NUM_KEYPOINTS + 2]
        );
        const leftDiameterX = distance(
          keypoints[NUM_KEYPOINTS + 3],
          keypoints[NUM_KEYPOINTS + 1]
        );

        ctx.beginPath();
        ctx.ellipse(
          leftCenter[0],
          leftCenter[1],
          leftDiameterX / 2,
          leftDiameterY / 2,
          0,
          0,
          2 * Math.PI
        );
        ctx.stroke();

        if (keypoints.length > NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS) {
          const rightCenter = keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS];
          const rightDiameterY = distance(
            keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 2],
            keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 4]
          );
          const rightDiameterX = distance(
            keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 3],
            keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 1]
          );

          ctx.beginPath();
          ctx.ellipse(
            rightCenter[0],
            rightCenter[1],
            rightDiameterX / 2,
            rightDiameterY / 2,
            0,
            0,
            2 * Math.PI
          );
          ctx.stroke();
        }
      }
    }

    const contours = faceLandmarksDetection.util.getKeypointIndexByContour(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
    );

    const { leftEye, rightEye } = contours;
    const leftEyeKeyPoints = leftEye.map((index) => keypoints[index]);
    const rightEyeKeyPoints = rightEye.map((index) => keypoints[index]);
    //console.log({ leftEyeKeyPoints, rightEyeKeyPoints });

    drawPath(ctx, [leftEyeKeyPoints[0], leftEyeKeyPoints[16]], false);
    drawPath(ctx, [leftEyeKeyPoints[3], leftEyeKeyPoints[11]], false);
    drawPath(ctx, [leftEyeKeyPoints[5], leftEyeKeyPoints[13]], false);

    drawPath(ctx, [rightEyeKeyPoints[0], rightEyeKeyPoints[16]], false);
    drawPath(ctx, [rightEyeKeyPoints[3], rightEyeKeyPoints[11]], false);
    drawPath(ctx, [rightEyeKeyPoints[5], rightEyeKeyPoints[13]], false);

    if (DRAW_OPTIONS.contours) {
      for (const [label, contour] of Object.entries(contours)) {
        ctx.strokeStyle = LABEL_TO_COLOR[label];
        ctx.lineWidth = 3;
        const path = contour.map((index) => keypoints[index]);
        if (path.every((value) => value !== undefined)) {
          drawPath(ctx, path, false);
        }
      }
    }

    try {
      res = {
        leftEAR: calculateEAR(leftEyeKeyPoints).toFixed(2),
        rightEAR: calculateEAR(rightEyeKeyPoints).toFixed(2),
      };
    } catch (e) {
      console.error(e);
      res = null;
    }
  });

  return res;
}
