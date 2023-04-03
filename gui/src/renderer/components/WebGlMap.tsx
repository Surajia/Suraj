import { mat4 } from 'gl-matrix';
import { useCallback, useEffect, useMemo, useRef, RefObject } from 'react';

import GLMap, { Coordinate } from '../lib/map/3dmap';
import styled from 'styled-components';

// The angle in degrees that the camera sees in
const angleOfView = 70;

export enum MarkerStyle {
  secure,
  unsecure,
}

const StyledCanvas = styled.canvas({
  position: 'absolute',
  width: '100%',
  height: '100%',
});

interface MapProps {
  location: [number, number];
  markerStyle: MarkerStyle;
}

export default function Map(props: MapProps) {
  const prevCoordinate = useRef<Coordinate>();
  const coordinate = useMemo(() => new Coordinate(props.location[1], props.location[0]), [...props.location]);

  const canvasRef = useRef<HTMLCanvasElement>() as RefObject<HTMLCanvasElement>;

  const gl = useMemo(() => {
    if (!canvasRef.current) {
      return null;
    }

    const gl = canvasRef.current.getContext("webgl2", { antialias: true })!;

    // Hide triangles not facing the camera
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Enable transparency (alpha < 1.0)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return gl;
  }, [canvasRef.current]);

  const map = useMemo(() => {
    if (!gl) {
      return null;
    }

    return new GLMap(gl, coordinate, props.markerStyle === MarkerStyle.secure);
  }, [gl]);

  const projectionMatrix = useMemo(() => {
    if (!gl) {
      return null;
    }

    // Enables using gl.UNSIGNED_INT for indexes. Allows 32 bit integer
    // indexes. Needed to have more than 2^16 vertices in one buffer.
    // Not needed on WebGL2 canvases where it's enabled by default
    // const ext = gl.getExtension('OES_element_index_uint');

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    const fieldOfView = angleOfView / 180 * Math.PI; // in radians
    // @ts-ignore
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 10;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    return projectionMatrix;
  }, [gl]);


  const drawScene = useCallback((now: number) => {
    if (!gl || !projectionMatrix || !map) {
      return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    map.draw(projectionMatrix, now);
  }, [gl, projectionMatrix, map]);

  const render = useCallback((now: number) => {
    now *= 0.001; // convert to seconds

    if (!prevCoordinate.current || coordinate !== prevCoordinate.current) {
      map!.setLocation(coordinate, props.markerStyle === MarkerStyle.secure, now);
      prevCoordinate.current = coordinate;
    }

    drawScene(now);
    requestAnimationFrame(render);
  }, [coordinate, props.markerStyle])

  useEffect(() => {
    if (gl && map && projectionMatrix) {
      requestAnimationFrame(render);
    }
  }, [gl, map, projectionMatrix]);

    requestAnimationFrame(render);
  return <StyledCanvas ref={canvasRef} id="glcanvas" width={window.innerWidth} height="493" />;
}
