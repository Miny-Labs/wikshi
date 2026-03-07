"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export default function ThreeCoin() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Defensively clear any stranded canvases from React Strict Mode double-invocations
    containerRef.current.innerHTML = '';

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(22, width / height, 0.1, 100);
    camera.position.set(0, 0, 30);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // Pure transparency
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    
    // 4. Photorealistic Environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;

    containerRef.current.appendChild(renderer.domElement);

    // 5. Coin Geometry & Hierarchy
    const coinGroup = new THREE.Group();
    scene.add(coinGroup);

    // Premium Metal Materials (Lighter, warm purple-tinted)
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x6b5f7d,   // Warm lilac-tinted metal
      metalness: 0.9,
      roughness: 0.2,
      envMapIntensity: 3.0,
    });

    const matteDarkMetal = new THREE.MeshStandardMaterial({
      color: 0x4a3f5e,   // Deep plum matte base
      metalness: 0.8,
      roughness: 0.4,
      envMapIntensity: 2.0,
    });
    
    const brightAccentMetal = new THREE.MeshStandardMaterial({
      color: 0x9b8fb5,   // Light lavender accent
      metalness: 1.0,
      roughness: 0.12,
      envMapIntensity: 4.0,
    });

    const geometries: THREE.BufferGeometry[] = [];

    // Outer Thick Rim
    const rimRadius = 3.8;
    const rimGeo = new THREE.TorusGeometry(rimRadius, 0.4, 64, 128);
    geometries.push(rimGeo);
    const rim = new THREE.Mesh(rimGeo, darkMetal);
    coinGroup.add(rim);

    // Inner Recessed Core (Matte base)
    const coreGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, 0.3, 128);
    coreGeo.rotateX(Math.PI / 2);
    geometries.push(coreGeo);
    const core = new THREE.Mesh(coreGeo, matteDarkMetal);
    coinGroup.add(core);
    
    // Inner Decorative Rings (Bright Accent)
    const innerRing1Geo = new THREE.TorusGeometry(3.1, 0.06, 32, 128);
    geometries.push(innerRing1Geo);
    const innerRing1 = new THREE.Mesh(innerRing1Geo, brightAccentMetal);
    innerRing1.position.z = 0.16; // Pop out slightly on the front
    coinGroup.add(innerRing1);

    const innerRing2Geo = new THREE.TorusGeometry(3.1, 0.06, 32, 128);
    geometries.push(innerRing2Geo);
    const innerRing2 = new THREE.Mesh(innerRing2Geo, brightAccentMetal);
    innerRing2.position.z = -0.16; // Pop out slightly on the back
    coinGroup.add(innerRing2);

    // Center Raised Plateau
    const plateauGeo = new THREE.CylinderGeometry(2.1, 2.1, 0.35, 128);
    plateauGeo.rotateX(Math.PI / 2);
    geometries.push(plateauGeo);
    const plateau = new THREE.Mesh(plateauGeo, darkMetal);
    coinGroup.add(plateau);

    // 3D Logo Extrusion in the Center (Stylized W)
    const shape = new THREE.Shape();
    // Trace a bold, stylized W
    shape.moveTo(-1.3, 0.8);      // Top outer left
    shape.lineTo(-0.8, 0.8);      // Top inner left
    shape.lineTo(-0.35, -0.6);    // Bottom inner left
    shape.lineTo(0, 0.4);         // Middle top peak
    shape.lineTo(0.35, -0.6);     // Bottom inner right
    shape.lineTo(0.8, 0.8);       // Top inner right
    shape.lineTo(1.3, 0.8);       // Top outer right
    shape.lineTo(0.6, -1.0);      // Bottom outer right
    shape.lineTo(0, -0.3);        // Middle bottom trough
    shape.lineTo(-0.6, -1.0);     // Bottom outer left
    shape.lineTo(-1.3, 0.8);      // Close path

    const extrudeSettings = {
      steps: 1,
      depth: 0.6, // Thick enough to protrude from the plateau
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 8
    };

    const logoGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center the extrusion along Z
    logoGeo.translate(0, 0, -0.3);
    geometries.push(logoGeo);

    const logoMesh = new THREE.Mesh(logoGeo, brightAccentMetal);
    
    const logoGroup = new THREE.Group();
    logoGroup.add(logoMesh);
    coinGroup.add(logoGroup);

    // Add logo to the back as well (rotated)
    const logoBack = logoGroup.clone();
    logoBack.rotation.y = Math.PI;
    coinGroup.add(logoBack);

    // Make the entire coin much smaller and shift to left
    coinGroup.scale.set(0.5, 0.5, 0.5);
    coinGroup.position.x = -2.0;

    // 6. Dramatic Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5); // Vastly increased ambient light so the base isn't black
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 5.0); // Bright pure white key light
    mainLight.position.set(10, 20, 15);
    scene.add(mainLight);

    // Colored Rim Lights for highly aesthetic edge highlights
    const rimLightBlue = new THREE.DirectionalLight(0x8b5cf6, 6.0); // Brighter vibrant purple edge
    rimLightBlue.position.set(-15, 5, -10);
    scene.add(rimLightBlue);

    const rimLightCyan = new THREE.DirectionalLight(0x06b6d4, 5.0); // Brighter cyan edge
    rimLightCyan.position.set(15, -10, -5);
    scene.add(rimLightCyan);

    // 7. Interaction Configuration
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04; // Smoother, heavier feel
    
    controls.enableZoom = false;
    controls.enablePan = false;
    
    // STRICT axis locking (horizontal spin only, no lifting the camera)
    controls.minPolarAngle = Math.PI / 2; 
    controls.maxPolarAngle = Math.PI / 2;

    // Initial dramatic tilt offset of the mesh itself for aesthetics
    coinGroup.rotation.x = 0.25;  
    coinGroup.rotation.y = -0.4;
    coinGroup.rotation.z = 0.05;

    let animationId: number;
    function animate() {
      animationId = requestAnimationFrame(animate);

      // Constant slow majestic rotation
      coinGroup.rotation.y += 0.003;

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(animationId);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      // Memory cleanup
      geometries.forEach(geo => geo.dispose());
      darkMetal.dispose();
      matteDarkMetal.dispose();
      brightAccentMetal.dispose();
      renderer.dispose();
      controls.dispose();
      pmremGenerator.dispose();
      envMap.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full cursor-grab active:cursor-grabbing" 
      style={{ userSelect: 'none' }}
    />
  );
}
