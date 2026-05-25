import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface HeartData {
  mesh: THREE.Mesh
  baseScale: number
  fadeInProgress: number
  speedY: number
  driftX: number
  driftZ: number
  rotX: number
  rotY: number
  wobbleSeed: number
}

function createHeartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.25);
  shape.bezierCurveTo(-0.5, -0.75, -1.1, -0.2, -1.1, 0.45);
  shape.bezierCurveTo(-1.1, 1.05, -0.55, 1.45, 0, 1.85);
  shape.bezierCurveTo(0.55, 1.45, 1.1, 1.05, 1.1, 0.45);
  shape.bezierCurveTo(1.1, -0.2, 0.5, -0.75, 0, -0.25);
  return shape;
}

function FlyingHeartsBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) {
      return undefined;
    }

    const container = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0xffffff, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.premultipliedAlpha = true;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffb6bd, 0.65);
    directional.position.set(3, 5, 8);
    scene.add(directional);

    const heartGeometry = new THREE.ExtrudeGeometry(createHeartShape(), {
      depth: 0.35,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 2,
      curveSegments: 14,
    });
    heartGeometry.center();

    const heartPalette = ['#d33741', '#ef476f', '#ff6b6b', '#ff9f9f', '#f26a8d'];
    const hearts: HeartData[] = [];
    const bounds = { x: 10, y: 7 };

    const updateBounds = () => {
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const visibleHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
      const visibleWidth = visibleHeight * camera.aspect;
      bounds.x = visibleWidth * 0.62;
      bounds.y = visibleHeight * 0.52;
    };

    updateBounds();
    const heartsCount = 130;

    for (let i = 0; i < heartsCount; i += 1) {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(heartPalette[i % heartPalette.length]),
        roughness: 0.35,
        metalness: 0,
        transparent: true,
        opacity: 0.52,
      });

      const heart = new THREE.Mesh(heartGeometry, material);
      const scale = 0.12 + Math.random() * 0.32;
      heart.scale.setScalar(scale);

      heart.position.set(
        (Math.random() - 0.5) * (bounds.x * 2),
        (Math.random() - 0.5) * (bounds.y * 2),
        (Math.random() - 0.5) * 12,
      );

      heart.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );

      scene.add(heart);

      hearts.push({
        mesh: heart,
        baseScale: scale,
        fadeInProgress: Math.random(),
        speedY: 0.004 + Math.random() * 0.008,
        driftX: (Math.random() - 0.5) * 0.004,
        driftZ: (Math.random() - 0.5) * 0.003,
        rotX: (Math.random() - 0.5) * 0.01,
        rotY: (Math.random() - 0.5) * 0.012,
        wobbleSeed: Math.random() * Math.PI * 2,
      });
    }

    let animationId: number;
    let elapsed = 0;
    const mouseTarget = { x: 0, y: 0 };
    const mouseCurrent = { x: 0, y: 0 };

    const onMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();

      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        mouseTarget.x = 0;
        mouseTarget.y = 0;
        return;
      }

      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      mouseTarget.x = (x - 0.5) * 2;
      mouseTarget.y = (y - 0.5) * 2;
    };

    const onMouseLeave = () => {
      mouseTarget.x = 0;
      mouseTarget.y = 0;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);

    const animate = () => {
      elapsed += 0.01;
      const focusZ = 1.2;

      mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.12;
      mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.12;
      camera.position.x = mouseCurrent.x * 2.8;
      camera.position.y = -mouseCurrent.y * 1.9;
      camera.rotation.z = -mouseCurrent.x * 0.025;
      camera.lookAt(0, 0, 0);

      for (const item of hearts) {
        item.mesh.position.y += item.speedY;
        item.mesh.position.x += item.driftX + Math.sin(elapsed + item.wobbleSeed) * 0.001;
        item.mesh.position.z += item.driftZ;

        item.mesh.rotation.x += item.rotX;
        item.mesh.rotation.y += item.rotY;

        const zNorm = THREE.MathUtils.clamp((item.mesh.position.z + 6) / 12, 0, 1);
        const blurFactor = THREE.MathUtils.clamp(Math.abs(item.mesh.position.z - focusZ) / 8.5, 0, 1);
        const scaleBoost = 1 + blurFactor * 0.2;
        item.mesh.scale.setScalar(item.baseScale * scaleBoost);

        const depthParallax = (item.mesh.position.z + 6) / 12;
        item.mesh.position.x += mouseCurrent.x * 0.0032 * (0.35 + depthParallax);
        item.mesh.position.y -= mouseCurrent.y * 0.0018 * (0.35 + depthParallax);

        const heartHalfHeight = item.mesh.scale.y * 1.15;

        const distanceToCamera = camera.position.z - item.mesh.position.z;
        const visibleHeightAtZ = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distanceToCamera;
        const visibleWidthAtZ = visibleHeightAtZ * camera.aspect;
        const topEdgeAtZ = visibleHeightAtZ / 2;
        const bottomEdgeAtZ = -visibleHeightAtZ / 2;

        const fadeBand = 1.2;
        const numerator = item.mesh.position.y - (bottomEdgeAtZ - heartHalfHeight);
        const fadeIn = THREE.MathUtils.clamp(numerator / fadeBand, 0, 1);
        const fadeOut = THREE.MathUtils.clamp(((topEdgeAtZ + heartHalfHeight) - item.mesh.position.y) / fadeBand, 0, 1);
        item.fadeInProgress = Math.min(1, item.fadeInProgress + 0.012);
        const edgeAlpha = Math.min(fadeIn, fadeOut);
        const alphaBase = 0.42 + zNorm * 0.2 - blurFactor * 0.08;
        item.mesh.material.opacity = THREE.MathUtils.clamp(alphaBase * edgeAlpha * item.fadeInProgress, 0, 0.9);

        if (item.mesh.position.y - heartHalfHeight > topEdgeAtZ + 0.15) {
          item.mesh.position.y = bottomEdgeAtZ - heartHalfHeight - 2.2;
          item.mesh.position.x = (Math.random() - 0.5) * (visibleWidthAtZ * 0.95);
          item.mesh.position.z = (Math.random() - 0.5) * 12;
          item.fadeInProgress = 0;
        }

        const sideLimitAtZ = visibleWidthAtZ / 2;
        if (item.mesh.position.x > sideLimitAtZ || item.mesh.position.x < -sideLimitAtZ) {
          item.mesh.position.x = THREE.MathUtils.clamp(item.mesh.position.x, -sideLimitAtZ, sideLimitAtZ);
        }
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    const onResize = () => {
      if (!container) {
        return;
      }

      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      updateBounds();
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);

      heartGeometry.dispose();
      for (const item of hearts) {
        item.mesh.material.dispose();
      }

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div className="hearts-canvas" ref={mountRef} aria-hidden="true" />;
}

export default FlyingHeartsBackground;