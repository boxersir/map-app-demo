import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from 'mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import TWEEN from '@tweenjs/tween.js';
// import { useGLTF } from '@react-three/drei'
const motorcycleIconUrl = 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png';

// 路线坐标点数组
let routeCoordinates = [];
let motorcycleAnimationId = null;
let lastBearing = 0; // 用于平滑角度变化
let motorcycleMarker = null;
let controls;
const motorcycleContainer = document.createElement('div');
motorcycleContainer.id = 'motorcycle-3d';
motorcycleContainer.style.width = '100px';
motorcycleContainer.style.height = '100px';
motorcycleContainer.style.position = 'absolute';
motorcycleContainer.style.pointerEvents = 'none';
document.body.appendChild(motorcycleContainer);

// 设置Three.js场景
let scene, camera, renderer, motorcycle;

function init3DModel() {
    // 创建Three.js场景
    scene = new THREE.Scene();

    // 相机设置
    camera = new THREE.PerspectiveCamera(45, 1, 0.01, 8000);
    camera.position.z = 1000;
    // 渲染器设置
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(100, 100);
    motorcycleContainer.appendChild(renderer.domElement);

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // 启用阻尼效果(惯性)
    controls.dampingFactor = 0.05; // 阻尼系数

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // 加载3D模型
    const loader = new GLTFLoader();
    loader.load(
        '/submarine1.glb', // 替换为你的摩托车模型URL
        // 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf', // 替换为你的摩托车模型URL
        function (gltf) {
            debugger
            motorcycle = gltf.scene;
            motorcycle.scale.set(1, 1, 1);
            // const lookAtPoint = new THREE.Vector3(-500, 200, 100); // 旋转到摩托车正前方
            // 使用向量操作 将潜水艇头朝向西偏20度 
            const lookAtPoint = new THREE.Vector3(0, 0, 0);
            // const westVector = new THREE.Vector3(-1, 0, 0);
            // westVector.rotateX(Math.PI * 20 / 180); // 旋转20度
            lookAtPoint.angleTo(20);
            motorcycle.lookAt(lookAtPoint);
            scene.add(motorcycle);
            animateModel();
        },
        undefined,
        function (error) {
            console.error('Error loading 3D model:', error);
        }
    );
}

function animateModel() {
    requestAnimationFrame(animateModel);
    if (motorcycle) {
        // motorcycle.rotation.y += 0.01; // 轻微旋转效果
        motorcycle.rotation.y = 1000 + Math.sin(Date.now() * 0.001) * 0.1;
        // 螺旋桨旋转每秒旋转10度
        const rotor = motorcycle.getObjectByName('propeller_mesh')
        rotor.rotation.y += 10;
    }
    controls.update(); // 必须在动画循环中更新
    renderer.render(scene, camera);
}

// 替换为你的 Mapbox Access Token
const MapComponent = () => {
  const mapContainerRef = useRef(null);
    const mapRef = useRef();
  
    // 获取路线函数
    async function getRoute(start, end) {
        const query = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`,
            { method: 'GET' }
        );
        const json = await query.json();
        
        routeCoordinates = json.routes[0].geometry.coordinates;
        
        mapRef.current.getSource('route').setData({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: routeCoordinates
            }
        });
        
        motorcycleMarker.setLngLat(start);
        
        const bounds = routeCoordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(routeCoordinates[0], routeCoordinates[0]));
        
        mapRef.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15
        });
    }

    // 角度计算函数
    function calculateBearing(current, next) {
        const dx = next[0] - current[0];
        const dy = next[1] - current[1];
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = angleRad * 180 / Math.PI;
        return (angleDeg + 360) % 360;
    }

    // 动画函数
  function animateMotorcycle() {
      const startTime = Date.now();
      const duration = 60000;
      const line = turf.lineString(routeCoordinates);
      const routeLength = turf.length(line, { units: 'kilometers' });
      const speed = routeLength / (duration / 1000 / 60 / 60);
        
      if (motorcycleAnimationId) {
          cancelAnimationFrame(motorcycleAnimationId);
      }
        
      function updatePosition() {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
            
          const alongDistance = progress * routeLength;
          const along = turf.along(line, alongDistance, { units: 'kilometers' });
          const currentPoint = along.geometry.coordinates;
            
          let bearing = lastBearing;
          if (progress < 0.99) {
              const nextAlong = turf.along(line, alongDistance + 0.01, { units: 'kilometers' });
              const nextPoint = nextAlong.geometry.coordinates;
              bearing = calculateBearing(currentPoint, nextPoint);
                
              const maxAngleChange = 10;
              const angleDiff = (bearing - lastBearing + 540) % 360 - 180;
              const limitedAngleDiff = Math.max(-maxAngleChange, Math.min(maxAngleChange, angleDiff));
              bearing = (lastBearing + limitedAngleDiff + 360) % 360;
          }
            
          lastBearing = bearing;
            
          // 更新3D标记位置和旋转
          motorcycleMarker.setLngLat(currentPoint);
          motorcycleContainer.style.transform = `rotate(${bearing}deg)`;
            
          // 更新地图视角
          mapRef.current.setCenter(currentPoint);
          mapRef.current.setBearing(-bearing + 20); // 保持地图与摩托车方向一致
            
          document.getElementById('startBtn').textContent = `行驶中 ${speed.toFixed(1)} km/h`;
            
          if (progress < 1) {
              motorcycleAnimationId = requestAnimationFrame(updatePosition);
          } else {
              document.getElementById('startBtn').textContent = '到达目的地';
          }
      }
        
      updatePosition();
  }
  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoieWFuZ2ppYW4iLCJhIjoiY2phaG1neno0MXFkNDMzbWhwNWw0bWM4aiJ9.CFmrh0LVWAbmVeed-Xr7wA';
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [116.404, 39.915], // 初始中心点坐标
        zoom: 9, // 初始缩放级别
      projection: 'globe', // 坐标系
      config: {
        basemap: {
          lightPreset:'night'
        }
      }
    });
      mapRef.current.on('load', () => {
          // 3D摩托车模型容器
         
          // setTimeout(() => {
          //     // rotate();
          // },20000)
          init3DModel();
          motorcycleMarker = new mapboxgl.Marker(motorcycleContainer)
                .setLngLat([116.404, 39.915])
                .addTo(mapRef.current);
            
            // 添加路线源
            mapRef.current.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                }
            });
            
            // 添加路线图层
            mapRef.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#3bb2d0',
                    'line-width': 4
                }
            });
            
            // 设置默认路线
            getRoute([116.404, 39.915], [116.403, 39.925]);
        });

        
    // 清理地图实例
    return () => mapRef.current.remove();
  }, []);

    return <>
        <div id="startBtn"></div>
        <button onClick={animateMotorcycle}>启动</button>
        <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />
    </>;
};

export default MapComponent;
// useGLTF.preload('./Gear2.gltf')// 预加载3D模型