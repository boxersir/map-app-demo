import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from 'mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf'
const motorcycleIconUrl = 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png';

// 替换为你的 Mapbox Access Token
const MapComponent = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef();
    function animateMotorcycle(start, end) {
        const duration = 10000; // 10秒
        const startTime = Date.now();
        const line = turf.lineString([start, end]);
        
        function updatePosition() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 计算路径上的点
            const along = turf.along(line, progress * turf.length(line));
            const currentLng = along.geometry.coordinates[0];
            const currentLat = along.geometry.coordinates[1];
            
            // 计算方向角度
            let bearing;
            if (progress < 1) {
                const nextAlong = turf.along(line, (progress + 0.01) * turf.length(line));
                bearing = Math.atan2(
                    nextAlong.geometry.coordinates[0] - currentLng,
                    nextAlong.geometry.coordinates[1] - currentLat
                ) * 180 / Math.PI;
            }
            
            // 更新摩托车位置
            mapRef.current.getSource('motorcycle').setData({
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [currentLng, currentLat]
                    },
                    properties: {
                        bearing: bearing
                    }
                }]
            });
            
            // 让地图跟随摩托车
            mapRef.current.setCenter([currentLng, currentLat]);
            
            // 继续动画直到完成
            if (progress < 1) {
                requestAnimationFrame(updatePosition);
            }
        }
        
        updatePosition();
    }
  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoieWFuZ2ppYW4iLCJhIjoiY2phaG1neno0MXFkNDMzbWhwNWw0bWM4aiJ9.CFmrh0LVWAbmVeed-Xr7wA';
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.5, 40], // 初始中心点坐标
        zoom: 9, // 初始缩放级别
      projection: 'globe', // 坐标系
      config: {
        basemap: {
          lightPreset:'night'
        }
      }
    });

    // 添加控制条
    // mapRef.current.addControl(new mapboxgl.NavigationControl());
    // mapRef.current.flyTo({
    //     center: [112.92850, 28.18],
    //     zoom: 14,
    //     speed: 0.4,
    //     pitch: 60,
    // })
      mapRef.current.on('load', () => {
        // 加载摩托车图标
        mapRef.current.loadImage(motorcycleIconUrl, (error, image) => {
            if (error) throw error;
            mapRef.current.addImage('motorcycle-icon', image);
            
            // 添加摩托车源
            mapRef.current.addSource('motorcycle', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [-74.5, 40] // 起点
                        },
                        properties: {
                            bearing: 0
                        }
                    }]
                }
            });
            
            // 添加摩托车图层
            mapRef.current.addLayer({
                id: 'motorcycle-layer',
                type: 'symbol',
                source: 'motorcycle',
                layout: {
                    'icon-image': 'motorcycle-icon',
                    'icon-size': 0.1,
                    'icon-rotate': ['get', 'bearing'],
                    'icon-rotation-alignment': 'map',
                    'icon-allow-overlap': true
                }
            });
            
            // 设置起点和终点
            const start = [-74.5, 40];
            const end = [-74.6, 40.1];
            
            // 添加路线
            mapRef.current.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: [start, end]
                    }
                }
            });
            
            mapRef.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#888',
                    'line-width': 4
                }
            });
            
            // 开始动画
            animateMotorcycle(start, end);
        });
      mapRef.current.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
        });
        mapRef.current.addControl(new mapboxgl.FullscreenControl());
        mapRef.current.addControl(new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        }));
        mapRef.current.addControl(new mapboxgl.ScaleControl({
            maxWidth: 200,
            unit: 'metric'
        }), 'bottom-left');
        mapRef.current.addControl(new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl
        }), 'top-left');
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

        mapRef.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
    });
    // setTimeout(() => {
    //     // rotate();
    // },20000)
    // 清理地图实例
    return () => mapRef.current.remove();
  }, []);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />;
};

export default MapComponent;